// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseKnxproj } from './knxprojParser.js';

// FR-01 / FR-02: parse a real .knxproj and expose devices, GAs, and links.
// Tested against the real BV Neil Richter project (83 devices, 84 GAs).
// The fixture holds real building data and is gitignored — these tests run
// in full when it is present locally and skip cleanly when it is absent.
const fixture = resolve(process.cwd(), 'test/fixtures/BV_Neil_Richter.knxproj');
const suite = existsSync(fixture) ? describe : describe.skip;

suite('knxprojParser (real BV Neil Richter project)', () => {
  let model;
  beforeAll(async () => {
    const buf = readFileSync(fixture);
    model = await parseKnxproj(buf);
  });

  it('AC-01.1: loads the project (devices, GAs, links present)', () => {
    expect(model).toBeTruthy();
    expect(model.projectId).toBe('P-0531');
  });

  it('AC-02.1: parses all 83 devices with id and address', () => {
    expect(model.devices).toHaveLength(83);
    const first = model.devices.find((d) => d.id === 'P-0531-0_DI-1');
    expect(first).toBeTruthy();
    expect(first.address).toBe('1');
  });

  it('AC-03.x: parses all 84 group addresses with id, address, name', () => {
    expect(model.groupAddresses).toHaveLength(84);
    const ga = model.groupAddresses.find((g) => g.id === 'P-0531-0_GA-1415');
    expect(ga).toEqual(
      expect.objectContaining({ id: 'P-0531-0_GA-1415', address: 1, name: 'UG_E1_Abstellraum' }),
    );
  });

  it('AC-04.1: parses links from the real Links="GA-x" attribute (not Send/Receive)', () => {
    // The real format stores links as a space-separated attribute, short GA ids.
    expect(model.links.length).toBeGreaterThan(0);
    // A ComObjectInstanceRef with two GAs must yield two links.
    const multi = model.links.filter((l) => l.comObjectRefId === 'MD-1_M-5_MI-1_O-2-23_R-1');
    expect(multi.map((l) => l.groupAddressId).sort()).toEqual(['GA-1259', 'GA-1397']);
  });

  it('resolves short link GA ids to full group-address ids', () => {
    // Link "GA-1257" must resolve to the GroupAddress whose id ends in "_GA-1257".
    const link = model.links.find((l) => l.groupAddressId === 'GA-1257');
    expect(link.resolvedGroupAddressId).toBe('P-0531-0_GA-1257');
  });
});
