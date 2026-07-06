/**
 * Syzygy finder: the instants when the Moon–Sun elongation reaches an
 * exact value — 0° (new moon) or 180° (full moon). Eclipse searches
 * start from these instants.
 */

import { normalizeDegrees } from '../math/angles.js';
import { nextCrossing } from '../math/crossing.js';
import { moonPosition } from '../bodies/moon.js';
import { sunPosition } from '../bodies/sun.js';

/** Mean synodic elongation rate, degrees per day (Meeus ch. 49). */
const MEAN_ELONGATION_RATE = 360 / 29.530588861;

function elongation(jdUt: number): number {
  return normalizeDegrees(
    moonPosition(jdUt).apparentLongitude - sunPosition(jdUt).apparentLongitude,
  );
}

/**
 * First instant at or after `jdUt` when the elongation equals
 * `targetDegrees` (0 = new moon, 90 = first quarter, 180 = full moon,
 * 270 = last quarter). Converges to well under a second.
 *
 * @example
 * ```ts
 * nextSyzygy(2451545, 180); // ≈ 2451564.6 (full moon of 2000-01-21)
 * ```
 */
export function nextSyzygy(jdUt: number, targetDegrees: number): number {
  // The true elongation rate stays within ±14% of the mean rate.
  return nextCrossing(elongation, MEAN_ELONGATION_RATE, targetDegrees, jdUt);
}

/**
 * First new moon (elongation 0°) at or after `jdUt`, as a Julian day (UT).
 *
 * @example
 * ```ts
 * nextNewMoon(2451545); // ≈ 2451550.26 (2000-01-06 18:14 UT)
 * ```
 */
export function nextNewMoon(jdUt: number): number {
  return nextSyzygy(jdUt, 0);
}

/**
 * First full moon (elongation 180°) at or after `jdUt`, as a Julian day (UT).
 *
 * @example
 * ```ts
 * nextFullMoon(2451545); // ≈ 2451564.6 (2000-01-21 04:40 UT)
 * ```
 */
export function nextFullMoon(jdUt: number): number {
  return nextSyzygy(jdUt, 180);
}
