import JSZip from 'jszip';

// KNX project XML namespace (ETS6 / schema version 23).
const KNX_NS = 'http://knx.org/xml/project/23';

/**
 * Parse a .knxproj (ZIP) buffer into a flat model of devices, group addresses,
 * and links. Targets the REAL ETS6 format: links are a space-separated
 * `Links="GA-x"` attribute on ComObjectInstanceRef — there are no Send/Receive
 * elements. Link GA ids are short (GA-1257) and resolve to full ids
 * (P-0531-0_GA-1257).
 *
 * @param {ArrayBuffer|Uint8Array} buffer raw .knxproj bytes
 * @returns {Promise<{projectId:string, devices:object[], groupAddresses:object[], links:object[]}>}
 */
export async function parseKnxproj(buffer) {
  const zip = await JSZip.loadAsync(buffer);

  // The project lives in P-XXXX/0.xml. Find it without hard-coding the id.
  const zeroXmlPath = Object.keys(zip.files).find((p) => /(^|\/)P-[0-9A-F]+\/0\.xml$/.test(p));
  if (!zeroXmlPath) throw new Error('No P-XXXX/0.xml found — not a valid .knxproj');
  const projectId = zeroXmlPath.match(/(P-[0-9A-F]+)\/0\.xml$/)[1];

  const xmlText = await zip.file(zeroXmlPath).async('string');
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');

  const els = (parent, name) => Array.from(parent.getElementsByTagNameNS(KNX_NS, name));

  // --- Devices + their active KOs ---
  const devices = els(doc, 'DeviceInstance').map((di) => {
    const tree = di.getElementsByTagNameNS(KNX_NS, 'GroupObjectTree')[0];
    const instances = tree?.getAttribute('GroupObjectInstances')?.trim();
    const activeKos = instances ? instances.split(/\s+/) : [];
    return {
      id: di.getAttribute('Id'),
      address: di.getAttribute('Address'),
      name: di.getAttribute('Name') || '',
      productRefId: di.getAttribute('ProductRefId'),
      hardware2ProgramRefId: di.getAttribute('Hardware2ProgramRefId'),
      activeKos,
    };
  });

  // --- Group addresses ---
  const groupAddresses = els(doc, 'GroupAddress').map((ga) => ({
    id: ga.getAttribute('Id'),
    address: Number(ga.getAttribute('Address')),
    name: ga.getAttribute('Name') || '',
  }));

  // Map short link ids (GA-1257) -> full ids (P-0531-0_GA-1257).
  const shortToFull = new Map();
  for (const ga of groupAddresses) {
    const short = ga.id.match(/(GA-\d+)$/)?.[1];
    if (short) shortToFull.set(short, ga.id);
  }

  // --- Links: real format is a Links="GA-x GA-y" attribute ---
  const links = [];
  for (const ref of els(doc, 'ComObjectInstanceRef')) {
    const linksAttr = ref.getAttribute('Links');
    if (!linksAttr) continue;
    const comObjectRefId = ref.getAttribute('RefId');
    for (const shortGa of linksAttr.trim().split(/\s+/)) {
      links.push({
        comObjectRefId,
        groupAddressId: shortGa,
        resolvedGroupAddressId: shortToFull.get(shortGa) ?? null,
      });
    }
  }

  return { projectId, devices, groupAddresses, links };
}
