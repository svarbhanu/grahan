/**
 * Sidereal time (Meeus ch. 12) — the rotation angle of the Earth relative
 * to the equinox, the bridge between celestial coordinates and a place on
 * the ground.
 */

import { degToRad, normalizeDegrees } from '../math/angles.js';
import { j2000Century, J2000 } from '../time/julian.js';
import { nutation, trueObliquity } from './nutation.js';

/**
 * Greenwich mean sidereal time, degrees [0, 360) (Meeus eq. 12.4).
 *
 * @example
 * ```ts
 * greenwichMeanSiderealTime(2446895.5); // 197.693195 (Meeus example 12.a)
 * ```
 */
export function greenwichMeanSiderealTime(jdUt: number): number {
  const t = j2000Century(jdUt);
  return normalizeDegrees(
    280.46061837 +
      360.98564736629 * (jdUt - J2000) +
      0.000387933 * t * t -
      (t * t * t) / 38710000,
  );
}

/**
 * Greenwich apparent sidereal time: GMST corrected by the equation of the
 * equinoxes Δψ·cos ε, degrees [0, 360).
 *
 * @example
 * ```ts
 * greenwichApparentSiderealTime(2446895.5); // ≈ 197.69256
 * ```
 */
export function greenwichApparentSiderealTime(jdUt: number): number {
  const equationOfEquinoxes =
    nutation(jdUt).longitude * Math.cos(degToRad(trueObliquity(jdUt)));
  return normalizeDegrees(
    greenwichMeanSiderealTime(jdUt) + equationOfEquinoxes,
  );
}

/**
 * Local apparent sidereal time for an east-positive longitude, degrees.
 * (Meeus counts longitudes west-positive; grahan uses the modern
 * east-positive convention everywhere.)
 *
 * @example
 * ```ts
 * localSiderealTime(2451545, 85.324); // Kathmandu's LST at J2000
 * ```
 */
export function localSiderealTime(jdUt: number, longitude: number): number {
  return normalizeDegrees(greenwichApparentSiderealTime(jdUt) + longitude);
}
