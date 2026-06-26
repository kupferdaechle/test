// KNX 3-level group address conversion (FR-09).
//
// A 3-level group address is Main / Middle / Sub, packed into a 16-bit integer:
//   main:   5 bits (0–31)   -> bits 11–15
//   middle: 3 bits (0–7)    -> bits 8–10
//   sub:    8 bits (0–255)  -> bits 0–7
// integer = main * 2048 + middle * 256 + sub

const MAIN_MAX = 31;
const MIDDLE_MAX = 7;
const SUB_MAX = 255;

/** Pack a 3-level address into its flat integer. Throws on out-of-range parts. */
export function toInteger(main, middle, sub) {
  if (main < 0 || main > MAIN_MAX) throw new RangeError(`main out of range: ${main}`);
  if (middle < 0 || middle > MIDDLE_MAX) throw new RangeError(`middle out of range: ${middle}`);
  if (sub < 0 || sub > SUB_MAX) throw new RangeError(`sub out of range: ${sub}`);
  return main * 2048 + middle * 256 + sub;
}

/** Split a flat integer back into its 3-level parts. */
export function fromInteger(address) {
  return {
    main: (address >> 11) & 0x1f,
    middle: (address >> 8) & 0x07,
    sub: address & 0xff,
  };
}

/** Render a flat integer as the canonical "main/middle/sub" string. */
export function toGroupAddressString(address) {
  const { main, middle, sub } = fromInteger(address);
  return `${main}/${middle}/${sub}`;
}
