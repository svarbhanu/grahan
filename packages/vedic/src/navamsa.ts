/**
 * Navamsa (D9) — the ninth divisional chart: each rashi splits into nine
 * 3°20′ parts, counted continuously from Mesha. The continuous count is
 * exactly equivalent to the classical rule (movable signs start from
 * themselves, fixed from the 9th, dual from the 5th).
 */

import { normalizeDegrees } from '@grahan/core';

/** Width of one navamsa, 3°20′. */
export const NAVAMSA_WIDTH = 30 / 9;

/**
 * The navamsa rashi (0 = Mesha) occupied by a sidereal longitude.
 *
 * @example
 * ```ts
 * navamsaRashi(127.2); // 2 (Moon at Simha 7°12′ falls in Mithuna navamsa)
 * ```
 */
export function navamsaRashi(siderealLongitude: number): number {
  return Math.floor(normalizeDegrees(siderealLongitude) / NAVAMSA_WIDTH) % 12;
}
