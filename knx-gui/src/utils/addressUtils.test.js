import { describe, it, expect } from 'vitest';
import { toInteger, fromInteger, toGroupAddressString } from './addressUtils.js';

// FR-09: KNX 3-level group address <-> flat integer.
// Encoding: main (5 bits) / middle (3 bits) / sub (8 bits)
// integer = main * 2048 + middle * 256 + sub
describe('addressUtils', () => {
  it('AC-09.1: toInteger(1,0,0) is 2048 (Beleuchtung range start)', () => {
    expect(toInteger(1, 0, 0)).toBe(2048);
  });

  it('AC-09.1: toInteger(0,1,0) is 256', () => {
    expect(toInteger(0, 1, 0)).toBe(256);
  });

  it('AC-09.2: fromInteger(2048) is {main:1, middle:0, sub:0}', () => {
    expect(fromInteger(2048)).toEqual({ main: 1, middle: 0, sub: 0 });
  });

  it('AC-09.2: fromInteger(258) splits into 0/1/2', () => {
    expect(fromInteger(258)).toEqual({ main: 0, middle: 1, sub: 2 });
  });

  it('AC-09.3: round-trip is stable for a range of valid triples', () => {
    for (const [m, mi, s] of [[1, 0, 0], [5, 3, 128], [31, 7, 255], [0, 0, 1]]) {
      const n = toInteger(m, mi, s);
      expect(fromInteger(n)).toEqual({ main: m, middle: mi, sub: s });
    }
  });

  it('AC-09.4: formats as "main/middle/sub"', () => {
    expect(toGroupAddressString(2048)).toBe('1/0/0');
    expect(toGroupAddressString(258)).toBe('0/1/2');
  });

  it('rejects out-of-range parts', () => {
    expect(() => toInteger(32, 0, 0)).toThrow();   // main max 31
    expect(() => toInteger(0, 8, 0)).toThrow();    // middle max 7
    expect(() => toInteger(0, 0, 256)).toThrow();  // sub max 255
  });
});
