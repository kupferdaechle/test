import JSZip from 'jszip';

const KNX_NS = 'http://knx.org/xml/project/23';

/**
 * Export a modified .knxproj. Loads the original ZIP, applies changes to the
 * project's 0.xml in place (preserving every other entry and the KNX namespace),
 * and repacks. Round-trip safe: a no-change export re-parses identically.
 *
 * AC-06.1 (deterministic, tested). AC-06.2 — actual ETS6 import — must be
 * verified by a human with ETS6; it cannot be asserted here.
 *
 * @param {ArrayBuffer|Uint8Array} buffer original .knxproj bytes
 * @param {{addedGroupAddresses?: object[], updatedLinks?: object[]}} changes
 * @returns {Promise<Uint8Array>}
 */
export async function exportKnxproj(buffer, changes = {}) {
  const { addedGroupAddresses = [], updatedLinks = [] } = changes;
  const zip = await JSZip.loadAsync(buffer);

  const zeroXmlPath = Object.keys(zip.files).find((p) => /(^|\/)P-[0-9A-F]+\/0\.xml$/.test(p));
  if (!zeroXmlPath) throw new Error('No P-XXXX/0.xml found — not a valid .knxproj');

  const xmlText = await zip.file(zeroXmlPath).async('string');
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');

  applyAddedGroupAddresses(doc, addedGroupAddresses);
  applyUpdatedLinks(doc, updatedLinks);

  // Serialize and write back, keeping the XML declaration ETS emits.
  let out = new XMLSerializer().serializeToString(doc);
  if (!out.startsWith('<?xml')) out = '<?xml version="1.0" encoding="utf-8"?>\n' + out;

  zip.file(zeroXmlPath, out);
  return zip.generateAsync({ type: 'uint8array' });
}

/** Append new GroupAddress elements into the first GroupRange that fits. */
function applyAddedGroupAddresses(doc, gas) {
  if (gas.length === 0) return;
  const ranges = Array.from(doc.getElementsByTagNameNS(KNX_NS, 'GroupRange'));
  if (ranges.length === 0) throw new Error('No GroupRange to add addresses into');

  for (const ga of gas) {
    // Pick the innermost range whose [RangeStart, RangeEnd] contains the address.
    const target = pickRange(ranges, ga.address) ?? ranges[ranges.length - 1];
    const el = doc.createElementNS(KNX_NS, 'GroupAddress');
    el.setAttribute('Id', ga.id);
    el.setAttribute('Address', String(ga.address));
    el.setAttribute('Name', ga.name ?? '');
    if (ga.puid != null) el.setAttribute('Puid', String(ga.puid));
    target.appendChild(el);
  }
}

/** Choose the most specific GroupRange containing an address. */
function pickRange(ranges, address) {
  let best = null;
  let bestSpan = Infinity;
  for (const r of ranges) {
    const start = Number(r.getAttribute('RangeStart'));
    const end = Number(r.getAttribute('RangeEnd'));
    if (address >= start && address <= end) {
      const span = end - start;
      if (span < bestSpan) {
        best = r;
        bestSpan = span;
      }
    }
  }
  return best;
}

/** Set the Links attribute on matching ComObjectInstanceRef elements. */
function applyUpdatedLinks(doc, updates) {
  if (updates.length === 0) return;
  const byRef = new Map(updates.map((u) => [u.comObjectRefId, u.links]));
  for (const ref of Array.from(doc.getElementsByTagNameNS(KNX_NS, 'ComObjectInstanceRef'))) {
    const refId = ref.getAttribute('RefId');
    if (byRef.has(refId)) ref.setAttribute('Links', byRef.get(refId).join(' '));
  }
}
