// @vitest-environment jsdom
// End-to-End: parseKnxproj must produce the complete target data model.
// This is the integration gate — all module unit tests passing is NOT "done".
// "Done" means this file is green against the real fixture.
//
// Target model:
//   { projectId, devices:[{id, physicalAddress, name, ...}],
//     groupAddresses:[{id, address, name, dpt}],
//     links:[{comObjectRefId, deviceId, groupAddressIds:[fullId,...]}] }
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseKnxproj } from '../parser/knxprojParser.js';

const fixture = resolve(process.cwd(), 'test/fixtures/BV_Neil_Richter.knxproj');
const suite = existsSync(fixture) ? describe : describe.skip;

suite('E2E: target data model contract (BV Neil Richter)', () => {
  let model;
  beforeAll(async () => {
    model = await parseKnxproj(readFileSync(fixture));
  });

  it('E2E-01: every link has a deviceId pointing to a real device', () => {
    expect(model.links.length).toBeGreaterThan(0);
    const deviceIds = new Set(model.devices.map((d) => d.id));
    for (const link of model.links) {
      expect(link.deviceId).toBeTruthy();
      expect(deviceIds.has(link.deviceId)).toBe(true);
    }
  });

  it('E2E-02: links carry an ordered groupAddressIds array (not per-GA rows)', () => {
    // The ComObjectInstanceRef with RefId 'MD-1_M-5_MI-1_O-2-23_R-1' has two GAs.
    // It must produce exactly ONE link entry with a 2-item array.
    const matches = model.links.filter((l) => l.comObjectRefId === 'MD-1_M-5_MI-1_O-2-23_R-1');
    expect(matches).toHaveLength(1);
    expect(Array.isArray(matches[0].groupAddressIds)).toBe(true);
    expect(matches[0].groupAddressIds).toHaveLength(2);
  });

  it('E2E-03: groupAddressIds are resolved to full ids (not short GA-x)', () => {
    for (const link of model.links) {
      for (const gaId of link.groupAddressIds) {
        expect(gaId).toMatch(/^P-[0-9A-F]+-0_GA-\d+$/);
      }
    }
  });

  it('E2E-04: devices expose physicalAddress; assigned devices use area.line.device format', () => {
    expect(model.devices.length).toBeGreaterThan(0);
    // physicalAddress is null for unassigned devices — null is a valid state
    for (const device of model.devices) {
      expect('physicalAddress' in device).toBe(true);
      if (device.physicalAddress !== null) {
        expect(device.physicalAddress).toMatch(/^\d+\.\d+\.\d+$/);
      }
    }
    // At least one device must have a real address in this fixture
    const assigned = model.devices.filter((d) => d.physicalAddress !== null);
    expect(assigned.length).toBeGreaterThan(0);
  });

  it('E2E-05: groupAddresses expose dpt (null when absent, string when present)', () => {
    // 25 of 84 GAs in this fixture carry a DatapointType attribute
    for (const ga of model.groupAddresses) {
      expect('dpt' in ga).toBe(true);
    }
    const withDpt = model.groupAddresses.filter((ga) => ga.dpt !== null);
    expect(withDpt.length).toBeGreaterThan(0);
  });
});
