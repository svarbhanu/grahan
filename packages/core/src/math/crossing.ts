/**
 * Root-finder for angular boundary crossings: the first instant a
 * monotonically increasing angle (elongation, a longitude, a sum of
 * longitudes) reaches a target value. Generalizes the syzygy search;
 * the vedic layer uses it for tithi/nakshatra/yoga/karana end times.
 */

import { normalizeDegrees, wrap180 } from './angles.js';

/**
 * First instant at or after `jdUtStart` when `value` reaches
 * `targetDegrees`.
 *
 * `value` must be increasing (mod 360) with a rate that stays within
 * roughly ±25% of `meanRatePerDay`: the fixed-point iteration corrects
 * at the mean rate, so each step shrinks the error geometrically.
 * Converges to well under a second.
 *
 * @param value angle in degrees as a function of UT Julian day
 * @param meanRatePerDay mean rate of `value`, degrees per day
 * @param targetDegrees the angle to reach, degrees
 * @param jdUtStart search start, UT Julian day
 *
 * @example
 * ```ts
 * // First quarter moon after J2000: elongation reaches 90°.
 * nextCrossing(
 *   (jd) => normalizeDegrees(
 *     moonPosition(jd).apparentLongitude - sunPosition(jd).apparentLongitude,
 *   ),
 *   360 / 29.530588861,
 *   90,
 *   2451545,
 * ); // ≈ 2451558.1 (2000-01-14 13:34 UT)
 * ```
 */
export function nextCrossing(
  value: (jdUt: number) => number,
  meanRatePerDay: number,
  targetDegrees: number,
  jdUtStart: number,
): number {
  // First guess: advance at the mean rate to the next crossing.
  let t =
    jdUtStart +
    normalizeDegrees(targetDegrees - value(jdUtStart)) / meanRatePerDay;
  // Refine at the mean rate; the correction shrinks geometrically.
  for (let i = 0; i < 20; i++) {
    const correction = wrap180(targetDegrees - value(t)) / meanRatePerDay;
    t += correction;
    if (Math.abs(correction) < 1e-8) break; // < 1 ms
  }
  return t;
}
