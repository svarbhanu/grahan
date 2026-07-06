/**
 * Ascendant and midheaven — where the ecliptic crosses the eastern horizon
 * and the meridian. The tropical building blocks for house systems; the
 * Vedic layer subtracts an ayanamsa to get the sidereal lagna.
 *
 * Valid for |latitude| ≲ 66°: inside the polar circles the ecliptic can lie
 * almost along the horizon and the ascendant degenerates.
 */

import { degToRad, normalizeDegrees, radToDeg } from '../math/angles.js';
import {
  assertFinite,
  assertLatitude,
  assertLongitude,
} from '../math/validate.js';
import { trueObliquity } from './nutation.js';
import { localSiderealTime } from './sidereal.js';

/**
 * Tropical ecliptic longitude rising in the east, degrees [0, 360).
 *
 * @throws RangeError on a non-finite jdUt or out-of-range latitude/longitude
 * @example
 * ```ts
 * ascendant(2449217.71875, 27.0104, 84.8821);
 * // ≈ 215.55 (Libra 11°47′ + ayanamsa 23.77 — the founder chart's lagna)
 * ```
 */
export function ascendant(
  jdUt: number,
  latitude: number,
  longitude: number,
): number {
  assertFinite(jdUt, 'jdUt');
  assertLatitude(latitude);
  assertLongitude(longitude);
  const theta = degToRad(localSiderealTime(jdUt, longitude));
  const eps = degToRad(trueObliquity(jdUt));
  const phi = degToRad(latitude);
  return normalizeDegrees(
    radToDeg(
      Math.atan2(
        Math.cos(theta),
        -(Math.sin(theta) * Math.cos(eps) + Math.tan(phi) * Math.sin(eps)),
      ),
    ),
  );
}

/**
 * Tropical ecliptic longitude culminating on the meridian (MC), degrees.
 *
 * @example
 * ```ts
 * midheaven(2449217.71875, 84.8821); // ≈ 133.05
 * ```
 */
export function midheaven(jdUt: number, longitude: number): number {
  const theta = degToRad(localSiderealTime(jdUt, longitude));
  const eps = degToRad(trueObliquity(jdUt));
  return normalizeDegrees(
    radToDeg(Math.atan2(Math.sin(theta), Math.cos(theta) * Math.cos(eps))),
  );
}
