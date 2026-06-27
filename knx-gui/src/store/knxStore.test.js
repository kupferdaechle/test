// @vitest-environment jsdom
// Integration gate for the data layer.
// "Done" = this file green — not individual module unit tests.
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { createKnxStore } from './knxStore.js';
import { parseKnxproj } from '../parser/knxprojParser.js';

const fixture = resolve(process.cwd(), 'test/fixtures/BV_Neil_Richter.knxproj');
const suite = existsSync(fixture) ? describe : describe.skip;

suite('knxStore (BV Neil Richter)', () => {
  let store;
  let initialState;

  // Load once; subsequent tests mutate the same store to test the flow end-to-end.
  beforeAll(async () => {
    store = createKnxStore();
    initialState = await store.load(readFileSync(fixture));
  }, 60000);

  it('E2E-STORE-01: load enriches links with KO info from app-XMLs', () => {
    expect(initialState.projectId).toBe('P-0531');
    expect(initialState.devices).toHaveLength(83);
    expect(initialState.groupAddresses).toHaveLength(84);
    const withKo = initialState.links.filter((l) => l.ko !== null);
    expect(withKo.length).toBeGreaterThan(0);
  });

  it('E2E-STORE-02: createGroupAddress adds a GA to state, prior state untouched', () => {
    const before = store.getState();
    const after = store.createGroupAddress('Test Licht', 2049);
    expect(before.groupAddresses).toHaveLength(84); // original reference unchanged
    expect(after.groupAddresses).toHaveLength(85);
    const added = after.groupAddresses.find((g) => g.name === 'Test Licht');
    expect(added).toBeTruthy();
    expect(added.address).toBe(2049);
    expect(added.id).toMatch(/^P-0531-0_GA-/);
  });

  it('E2E-STORE-03: renameDevice updates a device name, prior state untouched', () => {
    const deviceId = initialState.devices[0].id;
    const after = store.renameDevice(deviceId, 'Renamed Device');
    expect(after.devices.find((d) => d.id === deviceId).name).toBe('Renamed Device');
    expect(initialState.devices[0].name).not.toBe('Renamed Device');
  });

  it('E2E-STORE-04: addLink adds a GA id to an existing link entry', () => {
    const existingLink = initialState.links[0];
    const newGa = initialState.groupAddresses.find(
      (g) => !existingLink.groupAddressIds.includes(g.id),
    );
    expect(newGa).toBeTruthy();
    const after = store.addLink(existingLink.comObjectRefId, existingLink.deviceId, newGa.id);
    const updated = after.links.find((l) => l.comObjectRefId === existingLink.comObjectRefId);
    expect(updated.groupAddressIds).toContain(newGa.id);
  });

  it('E2E-STORE-05: export produces a .knxproj that re-parses with added GA', async () => {
    // State now has 85 GAs (84 original + "Test Licht" from E2E-STORE-02)
    const buf = await store.export();
    const reparsed = await parseKnxproj(buf);
    expect(reparsed.groupAddresses).toHaveLength(85);
    const added = reparsed.groupAddresses.find((g) => g.name === 'Test Licht');
    expect(added).toBeTruthy();
    expect(added.address).toBe(2049);
  });
});
