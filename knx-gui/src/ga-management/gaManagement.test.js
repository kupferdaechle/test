import { describe, it, expect } from 'vitest';
import {
  nextGaId,
  createGroupAddress,
  renameDevice,
} from './gaManagement.js';

// FR-03: create group addresses with a unique Id following the project scheme.
// FR-07: rename a device (many real devices have no Name).
describe('gaManagement', () => {
  const gas = [
    { id: 'P-0531-0_GA-1415', address: 1, name: 'A' },
    { id: 'P-0531-0_GA-1416', address: 10, name: 'B' },
  ];

  it('AC-03.2: nextGaId returns max existing number + 1, project-scoped', () => {
    expect(nextGaId(gas, 'P-0531')).toBe('P-0531-0_GA-1417');
    expect(nextGaId([], 'P-0531')).toBe('P-0531-0_GA-1'); // first GA
  });

  it('AC-03.1: createGroupAddress appends a GA with a unique id and given fields', () => {
    const result = createGroupAddress(gas, 'P-0531', { name: 'Licht neu', address: 2049 });
    expect(result).toHaveLength(3);
    const added = result[2];
    expect(added).toEqual(
      expect.objectContaining({ id: 'P-0531-0_GA-1417', address: 2049, name: 'Licht neu' }),
    );
  });

  it('createGroupAddress rejects a duplicate address', () => {
    expect(() => createGroupAddress(gas, 'P-0531', { name: 'X', address: 1 })).toThrow(/address/i);
  });

  it('AC-07.1: renameDevice sets a new name immutably', () => {
    const devices = [
      { id: 'P-0531-0_DI-1', address: '1', name: '' },
      { id: 'P-0531-0_DI-2', address: '2', name: 'Aktor' },
    ];
    const updated = renameDevice(devices, 'P-0531-0_DI-1', 'Jalousie EG');
    expect(updated[0].name).toBe('Jalousie EG');
    expect(devices[0].name).toBe(''); // original untouched
  });

  it('renameDevice throws on an unknown device id', () => {
    expect(() => renameDevice([], 'P-0531-0_DI-9', 'X')).toThrow(/not found/i);
  });
});
