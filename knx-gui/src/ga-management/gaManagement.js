// FR-03: create group addresses with unique ids following the project scheme.
// FR-07: rename devices (many real DeviceInstance elements have an empty Name).
// All functions are pure and immutable.

/**
 * Next free GA id: `<projectId>-0_GA-<n>` where n is one past the highest
 * existing GA number, or 1 when none exist.
 */
export function nextGaId(groupAddresses, projectId) {
  let max = 0;
  for (const ga of groupAddresses) {
    const n = Number(ga.id.match(/_GA-(\d+)$/)?.[1] ?? 0);
    if (n > max) max = n;
  }
  return `${projectId}-0_GA-${max + 1}`;
}

/**
 * Append a new group address. Rejects a duplicate flat address, since ETS
 * requires group addresses to be unique within the project.
 */
export function createGroupAddress(groupAddresses, projectId, { name, address }) {
  if (groupAddresses.some((g) => g.address === address)) {
    throw new Error(`A group address with address ${address} already exists`);
  }
  const ga = { id: nextGaId(groupAddresses, projectId), address, name: name ?? '' };
  return [...groupAddresses, ga];
}

/** Rename a device by id, immutably. Throws when the id is unknown. */
export function renameDevice(devices, deviceId, newName) {
  if (!devices.some((d) => d.id === deviceId)) {
    throw new Error(`Device not found: ${deviceId}`);
  }
  return devices.map((d) => (d.id === deviceId ? { ...d, name: newName } : d));
}
