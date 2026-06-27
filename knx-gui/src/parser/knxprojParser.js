import JSZip from 'jszip';

const KNX_NS = 'http://knx.org/xml/project/23';

/**
 * Parse a .knxproj (ZIP) buffer into the target data model:
 *   { projectId, devices, groupAddresses, links }
 *
 * devices:        [{id, address, physicalAddress, name, productRefId,
 *                   hardware2ProgramRefId, activeKos}]
 * groupAddresses: [{id, address (Number), name, dpt (string|null)}]
 * links:          [{comObjectRefId, deviceId, groupAddressIds (ordered full ids)}]
 *
 * Real ETS6 format: links live as a space-separated Links="GA-x GA-y" attribute
 * on ComObjectInstanceRef — there are no Send/Receive elements. GA ids are short
 * (GA-1257) and are resolved to full ids (P-0531-0_GA-1257) here.
 * First id in groupAddressIds = sending address (KNX ordered-link semantics).
 *
 * @param {ArrayBuffer|Uint8Array} buffer raw .knxproj bytes
 */
export async function parseKnxproj(buffer) {
  const zip = await JSZip.loadAsync(buffer);

  const zeroXmlPath = Object.keys(zip.files).find((p) => /(^|\/)P-[0-9A-F]+\/0\.xml$/.test(p));
  if (!zeroXmlPath) throw new Error('No P-XXXX/0.xml found — not a valid .knxproj');
  const projectId = zeroXmlPath.match(/(P-[0-9A-F]+)\/0\.xml$/)[1];

  const xmlText = await zip.file(zeroXmlPath).async('string');
  const doc = new DOMParser().parseFromString(xmlText, 'application/xml');

  const els = (parent, name) => Array.from(parent.getElementsByTagNameNS(KNX_NS, name));

  // Traverse topology tree (Area > Line > DeviceInstance) to collect:
  //   physicalAddress per device id ("area.line.device" format)
  //   deviceId per ComObjectInstanceRef RefId
  const physicalAddressById = new Map();
  const comRefToDeviceId = new Map();

  for (const area of els(doc, 'Area')) {
    const areaAddr = area.getAttribute('Address');
    for (const line of Array.from(area.getElementsByTagNameNS(KNX_NS, 'Line'))) {
      const lineAddr = line.getAttribute('Address');
      for (const di of Array.from(line.getElementsByTagNameNS(KNX_NS, 'DeviceInstance'))) {
        const id = di.getAttribute('Id');
        const devAddr = di.getAttribute('Address');
        physicalAddressById.set(
          id,
          devAddr != null ? `${areaAddr}.${lineAddr}.${devAddr}` : null,
        );
        for (const ref of Array.from(di.getElementsByTagNameNS(KNX_NS, 'ComObjectInstanceRef'))) {
          comRefToDeviceId.set(ref.getAttribute('RefId'), id);
        }
      }
    }
  }

  // Devices
  const devices = els(doc, 'DeviceInstance').map((di) => {
    const id = di.getAttribute('Id');
    const tree = di.getElementsByTagNameNS(KNX_NS, 'GroupObjectTree')[0];
    const instances = tree?.getAttribute('GroupObjectInstances')?.trim();
    return {
      id,
      address: di.getAttribute('Address'),
      physicalAddress: physicalAddressById.get(id) ?? null,
      name: di.getAttribute('Name') || '',
      productRefId: di.getAttribute('ProductRefId'),
      hardware2ProgramRefId: di.getAttribute('Hardware2ProgramRefId'),
      activeKos: instances ? instances.split(/\s+/) : [],
    };
  });

  // Group addresses (include DatapointType when present)
  const groupAddresses = els(doc, 'GroupAddress').map((ga) => ({
    id: ga.getAttribute('Id'),
    address: Number(ga.getAttribute('Address')),
    name: ga.getAttribute('Name') || '',
    dpt: ga.getAttribute('DatapointType') || null,
  }));

  // Map short link ids (GA-1257) -> full ids (P-0531-0_GA-1257)
  const shortToFull = new Map();
  for (const ga of groupAddresses) {
    const short = ga.id.match(/(GA-\d+)$/)?.[1];
    if (short) shortToFull.set(short, ga.id);
  }

  // Links: one entry per ComObjectInstanceRef, ordered groupAddressIds array.
  // First id = sending address per KNX ordered-link semantics.
  const links = [];
  for (const ref of els(doc, 'ComObjectInstanceRef')) {
    const linksAttr = ref.getAttribute('Links');
    if (!linksAttr) continue;
    const comObjectRefId = ref.getAttribute('RefId');
    const groupAddressIds = linksAttr
      .trim()
      .split(/\s+/)
      .map((short) => shortToFull.get(short) ?? short);
    links.push({
      comObjectRefId,
      deviceId: comRefToDeviceId.get(comObjectRefId) ?? null,
      groupAddressIds,
    });
  }

  return { projectId, devices, groupAddresses, links };
}
