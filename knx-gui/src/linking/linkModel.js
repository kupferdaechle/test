// FR-04 (KNX-correct link model).
//
// A communication object (KO) holds an ORDERED list of linked group-address ids.
// Per the KNX specification (support.knx.org, "Sending Group Address"):
//   - index 0 is the SENDING address — the KO sends its value on this GA;
//   - every linked GA is also a LISTENING address — the KO updates from any.
// There is no per-link Send/Receive flag: direction is encoded by order, and
// whether a KO may send or receive at all comes from its app-XML flags
// (TransmitFlag / WriteFlag). The real file stores this as Links="GA-x GA-y".
//
// All functions are pure and immutable.

/** Parse a space-separated `Links` attribute into an ordered id list. */
export function parseLinks(linksAttr) {
  if (!linksAttr) return [];
  return linksAttr.trim().split(/\s+/).filter(Boolean);
}

/** Serialize an ordered id list back into the file's `Links` attribute form. */
export function serializeLinks(gaList) {
  return gaList.join(' ');
}

/** Append a GA as a listening address. No-op if already linked. */
export function addLink(gaList, gaId) {
  return gaList.includes(gaId) ? gaList.slice() : [...gaList, gaId];
}

/** Remove a GA from the link list. The next GA then becomes the sending one. */
export function removeLink(gaList, gaId) {
  return gaList.filter((g) => g !== gaId);
}

/** Promote a GA to the sending position (index 0), preserving the rest's order. */
export function setSending(gaList, gaId) {
  return [gaId, ...gaList.filter((g) => g !== gaId)];
}

/** The sending group address, or null when nothing is linked. */
export function sendingGa(gaList) {
  return gaList.length > 0 ? gaList[0] : null;
}

/** Every linked GA acts as a listening address. */
export function listeningGas(gaList) {
  return gaList.slice();
}
