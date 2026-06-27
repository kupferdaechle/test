// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import JSZip from 'jszip';
import { parseKnxproj } from '../parser/knxprojParser.js';
import { exportKnxproj } from './knxprojExporter.js';

// FR-06: export a modified .knxproj. AC-06.1 (deterministic): rewrites 0.xml and
// repacks the ZIP preserving the KNX namespace and all other entries.
// AC-06.2 ("imports into ETS6 without errors") needs ETS6 and is a human-gate item.
const fixture = resolve(process.cwd(), 'test/fixtures/BV_Neil_Richter.knxproj');
const suite = existsSync(fixture) ? describe : describe.skip;

suite('knxprojExporter (round-trip against real project)', () => {
  it('AC-06.1: no-change export re-parses to the same model', async () => {
    const buf = readFileSync(fixture);
    const before = await parseKnxproj(buf);
    const out = await exportKnxproj(buf, {});
    const after = await parseKnxproj(out);
    expect(after.projectId).toBe(before.projectId);
    expect(after.devices).toHaveLength(before.devices.length); // 83
    expect(after.groupAddresses).toHaveLength(before.groupAddresses.length); // 84
    expect(after.links).toHaveLength(before.links.length);
  });

  it('AC-06.1: export preserves the KNX namespace and all ZIP entries', async () => {
    const buf = readFileSync(fixture);
    const origZip = await JSZip.loadAsync(buf);
    const out = await exportKnxproj(buf, {});
    const outZip = await JSZip.loadAsync(out);
    expect(Object.keys(outZip.files).length).toBe(Object.keys(origZip.files).length);
    const zeroXmlPath = Object.keys(outZip.files).find((p) => /P-[0-9A-F]+\/0\.xml$/.test(p));
    const xml = await outZip.file(zeroXmlPath).async('string');
    expect(xml).toContain('http://knx.org/xml/project/23');
  });

  it('AC-03.x: an added group address survives the round-trip', async () => {
    const buf = readFileSync(fixture);
    const newGa = { id: 'P-0531-0_GA-9001', address: 2049, name: 'TEST_Licht_neu', puid: '9001' };
    const out = await exportKnxproj(buf, { addedGroupAddresses: [newGa] });
    const after = await parseKnxproj(out);
    expect(after.groupAddresses).toHaveLength(85);
    const found = after.groupAddresses.find((g) => g.id === 'P-0531-0_GA-9001');
    expect(found).toEqual(
      expect.objectContaining({ id: 'P-0531-0_GA-9001', address: 2049, name: 'TEST_Licht_neu' }),
    );
  });
});
