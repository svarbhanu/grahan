/**
 * Nutation and obliquity of the ecliptic (Meeus ch. 22).
 *
 * Uses the abridged nutation expression (principal terms only), accurate to
 * about 0.5″ in Δψ — grahan's tightest published tolerance is 36″, so this
 * carries two orders of magnitude of margin.
 */

import { degToRad } from '../math/angles.js';
import { ttFromUt } from '../time/deltaT.js';
import { j2000Century } from '../time/julian.js';

export interface Nutation {
  /** Nutation in longitude Δψ, degrees. */
  longitude: number;
  /** Nutation in obliquity Δε, degrees. */
  obliquity: number;
}

/**
 * Nutation in longitude and obliquity.
 *
 * @example
 * ```ts
 * nutation(2451545); // { longitude: ≈-0.00387, obliquity: ≈-0.00159 }
 * ```
 */
export function nutation(jdUt: number): Nutation {
  const t = j2000Century(ttFromUt(jdUt));
  // Longitude of the Moon's ascending node and mean longitudes of Sun/Moon.
  const omega = degToRad(125.04452 - 1934.136261 * t + 0.0020708 * t * t);
  const sun2 = 2 * degToRad(280.4665 + 36000.7698 * t);
  const moon2 = 2 * degToRad(218.3165 + 481267.8813 * t);
  const longitude =
    (-17.2 * Math.sin(omega) -
      1.32 * Math.sin(sun2) -
      0.23 * Math.sin(moon2) +
      0.21 * Math.sin(2 * omega)) /
    3600;
  const obliquity =
    (9.2 * Math.cos(omega) +
      0.57 * Math.cos(sun2) +
      0.1 * Math.cos(moon2) -
      0.09 * Math.cos(2 * omega)) /
    3600;
  return { longitude, obliquity };
}

/**
 * Mean obliquity of the ecliptic ε₀ (Meeus 22.2), degrees.
 *
 * @example
 * ```ts
 * meanObliquity(2451545); // ≈ 23.4393
 * ```
 */
export function meanObliquity(jdUt: number): number {
  const t = j2000Century(ttFromUt(jdUt));
  return (
    23.43929111 - (46.815 * t + 0.00059 * t * t - 0.001813 * t * t * t) / 3600
  );
}

/**
 * True obliquity ε = ε₀ + Δε, degrees.
 *
 * @example
 * ```ts
 * trueObliquity(2451545); // ≈ 23.4377
 * ```
 */
export function trueObliquity(jdUt: number): number {
  return meanObliquity(jdUt) + nutation(jdUt).obliquity;
}
