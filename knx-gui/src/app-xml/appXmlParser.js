import JSZip from 'jszip';

/**
 * Parse ComObject (KO) definitions from vendor application-program XMLs in a
 * .knxproj. Vendor XMLs live under M-XXXX/ and follow the M-XXXX_A-*.xml
 * naming convention.
 *
 * Uses index-based text scanning instead of DOMParser — vendor XMLs can be
 * 25 MB+ uncompressed and DOM parsing at that scale times out in test envs.
 *
 * @param {ArrayBuffer|Uint8Array} buffer raw .knxproj bytes
 * @returns {Promise<Map<string, {id, name, text, dpt, objectSize}>>}
 */
export async function parseAppXmls(buffer) {
  const zip = await JSZip.loadAsync(buffer);

  const appXmlPaths = Object.keys(zip.files).filter(
    (p) => /M-[0-9A-F]+_A-[^/]+\.xml$/i.test(p) && !zip.files[p].dir,
  );

  const koMap = new Map();

  for (const path of appXmlPaths) {
    const text = await zip.file(path).async('string');
    extractComObjects(text, koMap);
  }

  return koMap;
}

/**
 * Look up KO definition by a full ComObjectInstanceRef RefId from 0.xml.
 *
 * RefId format: "MD-1_M-5_MI-1_O-2-23_R-1" — underscore-separated path where
 * the segment starting with "O-" identifies the ComObject local Id in the app
 * XML. We walk right-to-left to find the first O-* segment and try it as a
 * direct key, then also with any trailing R-* segment.
 *
 * @param {Map} koMap result of parseAppXmls
 * @param {string} refId ComObjectInstanceRef RefId from 0.xml
 * @returns {{id, name, text, dpt, objectSize} | null}
 */
export function resolveKo(koMap, refId) {
  if (koMap.has(refId)) return koMap.get(refId);

  const parts = refId.split('_');
  for (let i = parts.length - 1; i >= 0; i--) {
    if (!parts[i].startsWith('O-')) continue;

    if (koMap.has(parts[i])) return koMap.get(parts[i]);

    const compound = parts.slice(i).join('_');
    if (koMap.has(compound)) return koMap.get(compound);

    // Full-id suffix match (app XML may use qualified ids ending in _O-*)
    for (const [key, val] of koMap) {
      if (key === parts[i] || key.endsWith(`_${parts[i]}`)) return val;
    }
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
