// @vitest-environment jsdom
import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseAppXmls, resolveKo } from './appXmlParser.js';
import { parseKnxproj } from '../parser/knxprojParser.js';

// FR-05: expose KO definitions (name, DPT, text) from vendor app-XMLs so the
// UI can display meaningful names next to links instead of raw RefIds.
const fixture = resolve(process.cwd(), 'test/fixtures/BV_Neil_Richter.knxproj');
const suite = existsSync(fixture) ? describe : describe.skip;

suite('appXmlParser (BV Neil Richter)', () => {
  let koMap;
  let model;

  beforeAll(async () => {
    const buf = readFileSync(fixture);
    [koMap, model] = await Promise.all([parseAppXmls(buf), parseKnxproj(buf)]);
  });

  it('E2E-APP-01: finds ComObjects from vendor app-XMLs', () => {
    expect(koMap.size).toBeGreaterThan(0);
  });

  it('E2E-APP-02: each ComObject entry has required fields', () => {
    for (const ko of koMap.values()) {
      expect(typeof ko.id).toBe('string');
      expect('name' in ko).toBe(true);
      expect('text' in ko).toBe(true);
      expect('dpt' in ko).toBe(true);
    }
  });

  it('E2E-APP-03: resolveKo maps at least some link RefIds to a KO definition', () => {
    const refIds = model.links.map((l) => l.comObjectRefId);
    const resolved = refIds.map((r) => resolveKo(koMap, r)).filter(Boolean);

    if (resolved.length === 0) {
      // Diagnostic so we know what format to target
      const sampleRefId = refIds[0] ?? '(no links)';
      const sampleKeys = [...koMap.keys()].slice(0, 5).join('\n  ');
      throw new Error(
        `resolveKo matched 0 of ${refIds.length} RefIds.\n` +
          `Sample RefId:     ${sampleRefId}\n` +
          `Sample koMap keys:\n  ${sampleKeys}`,
      );
    }

    expect(resolved.length).toBeGreaterThan(0);
    for (const ko of resolved) {
      expect(typeof ko.name).toBe('string');
    }
  });
});
