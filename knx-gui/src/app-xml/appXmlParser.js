import JSZip from 'jszip';

/**
 * Parse ComObject (KO) definitions and the Hardware2Program → ApplicationProgram
 * mapping from a .knxproj.
 *
 * Returns { koMap, hwMap } where:
 *   koMap: Map<ComObjectId, {id, name, text, dpt, objectSize}>
 *          Keys are the fully-qualified Ids as found in app-XMLs, e.g.
 *          "M-0083_A-0128-43-7CBD_MD-1_O-2-23"
 *   hwMap: Map<hardware2ProgramRefId, appProgramId>
 *          Used to resolve which application program a device uses.
 *
 * Uses index-based text scanning — vendor XMLs reach 26 MB uncompressed.
 *
 * @param {ArrayBuffer|Uint8Array} buffer raw .knxproj bytes
 * @returns {Promise<{koMap: Map, hwMap: Map}>}
 */
export async function parseAppXmls(buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const files = zip.files;

  const appXmlPaths = Object.keys(files).filter(
    (p) => /M-[0-9A-F]+_A-[^/]+\.xml$/i.test(p) && !files[p].dir,
  );
  const hwXmlPaths = Object.keys(files).filter(
    (p) => /M-[0-9A-F]+\/Hardware\.xml$/i.test(p) && !files[p].dir,
  );

  const koMap = new Map();
  const hwMap = new Map();

  // Parse Hardware.xml files first to build hardware2Program → appProgram map
  for (const path of hwXmlPaths) {
    const text = await files[path].async('string');
    extractHardware2Programs(text, hwMap);
  }

  // Parse application-program XMLs to extract ComObject definitions
  for (const path of appXmlPaths) {
    const text = await files[path].async('string');
    extractComObjects(text, koMap);
  }

  return { koMap, hwMap };
}

/**
 * Resolve a ComObjectInstanceRef RefId to its KO definition.
 *
 * RefId format in 0.xml: "MD-1_M-11_MI-1_O-2-23_R-1"
 * koMap key format:       "{appProgramId}_MD-{n}_O-{compound}"
 *   e.g.                  "M-0083_A-0128-43-7CBD_MD-1_O-2-23"
 *
 * Resolution order:
 *  1. Exact key lookup (direct hit)
 *  2. Precise: {appProgramId}_MD-{n}_O-{compound}  — needs hwMap + hardware2ProgramRefId
 *  3. Fallback: any key ending with _MD-{n}_O-{compound}
 *  4. Last resort: any key ending with _O-{compound}
 *
 * @param {Map}    koMap                 result of parseAppXmls
 * @param {string} refId                 ComObjectInstanceRef RefId from 0.xml
 * @param {object} [opts]
 * @param {Map}    [opts.hwMap]          hardware2ProgramRefId → appProgramId map
 * @param {string} [opts.hardware2ProgramRefId]  device's Hardware2ProgramRefId
 * @returns {{id, name, text, dpt, objectSize} | null}
 */
export function resolveKo(koMap, refId, opts = {}) {
  if (koMap.has(refId)) return koMap.get(refId);

  const { hwMap = null, hardware2ProgramRefId = null } = opts;

  const parts = refId.split('_');
  const mdSeg = parts.find((p) => p.startsWith('MD-'));
  let oSeg = null;
  for (let i = parts.length - 1; i >= 0; i--) {
    if (parts[i].startsWith('O-')) { oSeg = parts[i]; break; }
  }
  if (!oSeg) return null;

  // 1. Precise lookup using the device's application program
  if (hwMap && hardware2ProgramRefId) {
    const appProgId = hwMap.get(hardware2ProgramRefId);
    if (appProgId) {
      const exactKey = mdSeg
        ? `${appProgId}_${mdSeg}_${oSeg}`
        : `${appProgId}_${oSeg}`;
      if (koMap.has(exactKey)) return koMap.get(exactKey);
    }
  }

  // 2. Fallback: suffix match with MD + O segments (narrows to correct device type)
  if (mdSeg) {
    const mdoSuffix = `_${mdSeg}_${oSeg}`;
    for (const [key, val] of koMap) {
      if (key.endsWith(mdoSuffix)) return val;
    }
  }

  // 3. Last resort: suffix match on O segment alone
  const oSuffix = `_${oSeg}`;
  for (const [key, val] of koMap) {
    if (key.endsWith(oSuffix)) return val;
  }

  return null;
}

/** Extract all <ComObject> attributes from raw XML text without a DOM parse. */
function extractComObjects(text, koMap) {
  const ATTR_RE = /(\w+)="([^"]*)"/g;
  let pos = 0;
  while ((pos = text.indexOf('<ComObject', pos)) !== -1) {
    const end = text.indexOf('>', pos + 10);
    if (end === -1) break;
    const tag = text.slice(pos, end + 1);
    ATTR_RE.lastIndex = 0;
    const attrs = {};
    let m;
    while ((m = ATTR_RE.exec(tag)) !== null) attrs[m[1]] = m[2];
    if (attrs.Id && !koMap.has(attrs.Id)) {
      koMap.set(attrs.Id, {
        id: attrs.Id,
        name: attrs.Name || '',
        text: attrs.Text || '',
        dpt: attrs.DatapointType || null,
        objectSize: attrs.ObjectSize || null,
      });
    }
    pos = end + 1;
  }
}

/**
 * Extract Hardware2Program → ApplicationProgram mappings from a Hardware.xml.
 * Each Hardware2Program element contains one ApplicationProgramRef child.
 */
function extractHardware2Programs(text, hwMap) {
  let pos = 0;
  while ((pos = text.indexOf('<Hardware2Program', pos)) !== -1) {
    const tagEnd = text.indexOf('>', pos);
    if (tagEnd === -1) break;
    const tag = text.slice(pos, tagEnd + 1);
    const idMatch = tag.match(/\bId="([^"]+)"/);
    if (idMatch) {
      const h2pId = idMatch[1];
      const blockEnd = text.indexOf('</Hardware2Program>', tagEnd);
      const block = text.slice(tagEnd, blockEnd !== -1 ? blockEnd : tagEnd + 2000);
      const appRefMatch = block.match(/ApplicationProgramRef\b[^>]*RefId="([^"]+)"/);
      if (appRefMatch) hwMap.set(h2pId, appRefMatch[1]);
    }
    pos = tagEnd + 1;
  }
}
