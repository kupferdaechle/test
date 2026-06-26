import { describe, it, expect } from 'vitest';
import {
  addLink,
  removeLink,
  setSending,
  sendingGa,
  listeningGas,
  serializeLinks,
  parseLinks,
} from './linkModel.js';

// FR-04 (corrected per KNX docs): a KO holds an ORDERED list of linked GA ids.
// index 0 = sending address; all entries are listening addresses.
// There is no per-link Send/Receive — direction is order, capability is flags.
describe('linkModel — ordered KNX link semantics', () => {
  it('parses the real space-separated Links attribute, preserving order', () => {
    expect(parseLinks('GA-1259 GA-1397')).toEqual(['GA-1259', 'GA-1397']);
    expect(parseLinks('')).toEqual([]);
    expect(parseLinks(null)).toEqual([]);
  });

  it('addLink appends a GA as a listening address (no duplicates)', () => {
    expect(addLink(['GA-1'], 'GA-2')).toEqual(['GA-1', 'GA-2']);
    expect(addLink(['GA-1'], 'GA-1')).toEqual(['GA-1']); // idempotent
  });

  it('the first linked GA is the sending address', () => {
    expect(sendingGa(['GA-1259', 'GA-1397'])).toBe('GA-1259');
    expect(sendingGa([])).toBeNull();
  });

  it('all linked GAs are listening addresses', () => {
    expect(listeningGas(['GA-1259', 'GA-1397'])).toEqual(['GA-1259', 'GA-1397']);
  });

  it('setSending promotes a listening GA to index 0, keeping the rest', () => {
    expect(setSending(['GA-1', 'GA-2', 'GA-3'], 'GA-3')).toEqual(['GA-3', 'GA-1', 'GA-2']);
    // setting an unlinked GA as sending links it at the front
    expect(setSending(['GA-1'], 'GA-9')).toEqual(['GA-9', 'GA-1']);
  });

  it('removeLink drops a GA and the next becomes sending', () => {
    expect(removeLink(['GA-1', 'GA-2'], 'GA-1')).toEqual(['GA-2']);
    expect(sendingGa(removeLink(['GA-1', 'GA-2'], 'GA-1'))).toBe('GA-2');
  });

  it('round-trips: parse -> mutate -> serialize matches the file format', () => {
    const links = parseLinks('GA-1259 GA-1397');
    const updated = setSending(links, 'GA-1397');
    expect(serializeLinks(updated)).toBe('GA-1397 GA-1259');
  });

  it('all operations are immutable (do not mutate the input)', () => {
    const orig = ['GA-1', 'GA-2'];
    addLink(orig, 'GA-3');
    setSending(orig, 'GA-2');
    removeLink(orig, 'GA-1');
    expect(orig).toEqual(['GA-1', 'GA-2']);
  });
});
