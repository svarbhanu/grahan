/**
 * Lahiri (Chitrapaksha) ayanamsa — the rotating offset between the tropical
 * zodiac (equinox-anchored, what @grahan/core computes) and the sidereal
 * zodiac (star-anchored, what jyotish uses).
 *
 * Implemented as a cubic in julian centuries fitted to Swiss Ephemeris 2.10
 * `SIDM_LAHIRI` at 41 epochs spanning 1900–2100 (see fixtures/ayanamsa.json
 * and scripts/fit_ayanamsa.py); max fit residual 0.002″ inside that window.
 * Outside 1900–2100 the cubic extrapolates smoothly but is unverified.
 */

import { j2000Century, normalizeDegrees } from '@grahan/core';

/**
 * Lahiri ayanamsa in degrees at a UT julian day.
 *
 * @example
 * ```ts
 * lahiriAyanamsa(2449217.71875); // 23.7681 (1993-08-18)
 * ```
 */
export function lahiriAyanamsa(jdUt: number): number {
  const t = j2000Century(jdUt);
  return (
    23.857092340656987 +
    1.3968881881553707 * t +
    0.00030694937343626763 * t * t -
    3.986271419308174e-7 * t * t * t
  );
}

/**
 * Convert a tropical ecliptic longitude to sidereal (Lahiri), degrees [0, 360).
 *
 * @example
 * ```ts
 * siderealLongitude(145.281, 2449217.71875); // ≈ 121.513 (Leo 1°30′)
 * ```
 */
export function siderealLongitude(
  tropicalLongitude: number,
  jdUt: number,
): number {
  return normalizeDegrees(tropicalLongitude - lahiriAyanamsa(jdUt));
}
