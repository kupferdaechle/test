import { parseKnxproj } from '../parser/knxprojParser.js';
import { parseAppXmls, resolveKo } from '../app-xml/appXmlParser.js';
import {
  createGroupAddress as gaCreate,
  renameDevice as deviceRename,
} from '../ga-management/gaManagement.js';
import { addLink as linkAdd, removeLink as linkRemove, setSending as linkSetSending } from '../linking/linkModel.js';
import { exportKnxproj } from '../exporter/knxprojExporter.js';

/**
 * Shared data-layer store for a loaded .knxproj.
 *
 * createKnxStore() returns a store object. Call load(buffer) once; all
 * mutation methods return the new state without modifying prior references.
 * Call export() to produce a modified .knxproj binary.
 *
 * State shape:
 *   { projectId, devices, groupAddresses,
 *     links: [{comObjectRefId, deviceId, groupAddressIds, ko}] }
 *   where ko = {id, name, text, dpt, objectSize} | null
 */
export function createKnxStore() {
  let _state = null;
  let _buffer = null;
  let _koMap = null;
  let _originalGaIds = null;
  let _originalLinkSnapshot = null; // Map<comObjectRefId, groupAddressIds[]>

  function enrichLinks(links, koMap) {
    return links.map((link) => ({ ...link, ko: resolveKo(koMap, link.comObjectRefId) }));
  }

  return {
    /**
     * Load a .knxproj buffer. Parses project data and vendor app-XMLs in
     * parallel, then merges them. Returns the enriched state.
     */
    async load(buffer) {
      _buffer = buffer;
      const [parsed, koMap] = await Promise.all([parseKnxproj(buffer), parseAppXmls(buffer)]);
      _koMap = koMap;
      _originalGaIds = new Set(parsed.groupAddresses.map((g) => g.id));
      _originalLinkSnapshot = new Map(
        parsed.links.map((l) => [l.comObjectRefId, [...l.groupAddressIds]]),
      );
      _state = { ...parsed, links: enrichLinks(parsed.links, koMap) };
      return _state;
    },

    getState() {
      return _state;
    },

    /** Add a new group address. Throws on duplicate address. */
    createGroupAddress(name, address) {
      const updated = gaCreate(_state.groupAddresses, _state.projectId, { name, address });
      _state = { ..._state, groupAddresses: updated };
      return _state;
    },

    /** Rename a device by id. Throws if device not found. */
    renameDevice(deviceId, newName) {
      const updated = deviceRename(_state.devices, deviceId, newName);
      _state = { ..._state, devices: updated };
      return _state;
    },

    /**
     * Add a GA to an existing KO link (idempotent). Creates a new link entry
     * if comObjectRefId is not yet linked. deviceId is required for new entries.
     */
    addLink(comObjectRefId, deviceId, gaId) {
      const existing = _state.links.find((l) => l.comObjectRefId === comObjectRefId);
      let links;
      if (existing) {
        links = _state.links.map((l) =>
          l.comObjectRefId === comObjectRefId
            ? { ...l, groupAddressIds: linkAdd(l.groupAddressIds, gaId) }
            : l,
        );
      } else {
        links = [
          ..._state.links,
          {
            comObjectRefId,
            deviceId,
            groupAddressIds: [gaId],
            ko: _koMap ? resolveKo(_koMap, comObjectRefId) : null,
          },
        ];
      }
      _state = { ..._state, links };
      return _state;
    },

    /** Remove a GA from a KO link. */
    removeLink(comObjectRefId, gaId) {
      const links = _state.links.map((l) =>
        l.comObjectRefId === comObjectRefId
          ? { ...l, groupAddressIds: linkRemove(l.groupAddressIds, gaId) }
          : l,
      );
      _state = { ..._state, links };
      return _state;
    },

    /** Move a GA to index 0 (sending address) for a KO link. */
    setSending(comObjectRefId, gaId) {
      const links = _state.links.map((l) =>
        l.comObjectRefId === comObjectRefId
          ? { ...l, groupAddressIds: linkSetSending(l.groupAddressIds, gaId) }
          : l,
      );
      _state = { ..._state, links };
      return _state;
    },

    /**
     * Export the current state as a modified .knxproj buffer.
     * Only changed GAs and links are written; everything else is preserved
     * from the original file.
     */
    async export() {
      if (!_buffer || !_state) throw new Error('Nothing loaded — call load() first');

      const addedGroupAddresses = _state.groupAddresses.filter(
        (g) => !_originalGaIds.has(g.id),
      );

      // Convert full GA ids back to short form (GA-1257) for the Links attribute
      const toShort = (fullId) => fullId.match(/(GA-\d+)$/)?.[1] ?? fullId;

      const updatedLinks = _state.links
        .filter((link) => {
          const orig = _originalLinkSnapshot.get(link.comObjectRefId);
          if (!orig) return true; // new link entry
          return link.groupAddressIds.join(' ') !== orig.join(' ');
        })
        .map((link) => ({
          comObjectRefId: link.comObjectRefId,
          links: link.groupAddressIds.map(toShort),
        }));

      return exportKnxproj(_buffer, { addedGroupAddresses, updatedLinks });
    },
  };
}
