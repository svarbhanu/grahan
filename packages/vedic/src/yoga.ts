/**
 * Yoga — the 27 divisions of the *sum* of the sidereal Sun and Moon
 * longitudes, 13°20′ each. Unlike tithi, the ayanamsa does not cancel in a
 * sum, so sidereal longitudes are required.
 */

import { normalizeDegrees } from '@grahan/core';
import { YOGA_NAMES } from './names.js';

const YOGA_WIDTH = 360 / 27;

export interface Yoga {
  /** 0–26 (0 = Vishkambha). */
  index: number;
  name: string;
}

/**
 * Yoga from sidereal Sun and Moon longitudes in degrees.
 *
 * @example
 * ```ts
 * yoga(121.51, 127.21); // { index: 18, name: 'Parigha' }
 * ```
 */
export function yoga(
  siderealSunLongitude: number,
  siderealMoonLongitude: number,
): Yoga {
  const index = Math.floor(
    normalizeDegrees(siderealSunLongitude + siderealMoonLongitude) / YOGA_WIDTH,
  );
  return { index, name: YOGA_NAMES[index] ?? '' };
}
