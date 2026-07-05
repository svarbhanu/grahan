/**
 * Nakshatra — the 27 lunar mansions, each 13°20′ of the sidereal zodiac,
 * subdivided into four padas of 3°20′.
 */

import { normalizeDegrees } from '@grahan/core';
import { NAKSHATRA_NAMES } from './names.js';

/** Width of one nakshatra, 13°20′. */
export const NAKSHATRA_WIDTH = 360 / 27;
const PADA_WIDTH = 360 / 108; // 3°20′

export interface Nakshatra {
  /** 0–26 (0 = Ashwini). */
  index: number;
  name: string;
  /** Quarter within the nakshatra, 1–4. */
  pada: number;
}

/**
 * Nakshatra of a sidereal longitude (normally the Moon's).
 *
 * @example
 * ```ts
 * nakshatra(127.21); // { index: 9, name: 'Magha', pada: 3 }
 * ```
 */
export function nakshatra(siderealLongitude: number): Nakshatra {
  const longitude = normalizeDegrees(siderealLongitude);
  const index = Math.floor(longitude / NAKSHATRA_WIDTH);
  return {
    index,
    name: NAKSHATRA_NAMES[index] ?? '',
    pada: (Math.floor(longitude / PADA_WIDTH) % 4) + 1,
  };
}
