/**
 * End instants of the four movable panchang elements: the moment the
 * current tithi, karana, nakshatra, or yoga gives way to the next one
 * ("Tritiya upto 14:37"). Each is the next crossing of the element's
 * boundary angle, solved with core's mean-rate iteration; the sidereal
 * elements (nakshatra, yoga) are solved on the sidereal value directly,
 * so the boundaries move with the ayanamsa as they should.
 */

import {
  assertFinite,
  moonPosition,
  nextCrossing,
  normalizeDegrees,
  sunPosition,
} from '@grahan/core';
import { siderealLongitude } from './ayanamsa.js';

/** Mean synodic elongation rate, degrees per day (Meeus ch. 49). */
const SYNODIC_RATE = 360 / 29.530588861;
/** Mean sidereal lunar rate, degrees per day (sidereal month 27.3217 d). */
const SIDEREAL_MOON_RATE = 360 / 27.321661547;
/** Mean rate of the yoga sum: sidereal Moon plus sidereal Sun. */
const YOGA_RATE = SIDEREAL_MOON_RATE + 360 / 365.256363;

const TITHI_WIDTH = 12;
const KARANA_WIDTH = 6;
const NAKSHATRA_WIDTH = 360 / 27;
const YOGA_WIDTH = 360 / 27;

function elongation(jdUt: number): number {
  return normalizeDegrees(
    moonPosition(jdUt).apparentLongitude - sunPosition(jdUt).apparentLongitude,
  );
}

function siderealMoon(jdUt: number): number {
  return siderealLongitude(moonPosition(jdUt).apparentLongitude, jdUt);
}

function yogaSum(jdUt: number): number {
  return normalizeDegrees(
    siderealLongitude(sunPosition(jdUt).apparentLongitude, jdUt) +
      siderealMoon(jdUt),
  );
}

/** Next instant `value` crosses a multiple of `widthDegrees`. */
function nextBoundary(
  value: (jdUt: number) => number,
  widthDegrees: number,
  meanRatePerDay: number,
  jdUt: number,
): number {
  assertFinite(jdUt, 'jdUt');
  const target = normalizeDegrees(
    (Math.floor(value(jdUt) / widthDegrees) + 1) * widthDegrees,
  );
  return nextCrossing(value, meanRatePerDay, target, jdUt);
}

/**
 * Instant the tithi in effect at `jdUt` ends (Moon–Sun elongation
 * reaches the next multiple of 12°), as a UT Julian day.
 *
 * @example
 * ```ts
 * // Founder instant, Shukla Pratipada:
 * tithiEndTime(2449217.71875); // ≈ 2449218.167 (1993-08-18 16:00:35 UT)
 * ```
 */
export function tithiEndTime(jdUt: number): number {
  return nextBoundary(elongation, TITHI_WIDTH, SYNODIC_RATE, jdUt);
}

/**
 * Instant the karana (half-tithi) in effect at `jdUt` ends (elongation
 * reaches the next multiple of 6°), as a UT Julian day.
 *
 * @example
 * ```ts
 * karanaEndTime(2449217.71875); // ≈ 2449217.740 (1993-08-18 05:45:49 UT)
 * ```
 */
export function karanaEndTime(jdUt: number): number {
  return nextBoundary(elongation, KARANA_WIDTH, SYNODIC_RATE, jdUt);
}

/**
 * Instant the nakshatra in effect at `jdUt` ends (sidereal Moon reaches
 * the next multiple of 13°20′), as a UT Julian day.
 *
 * @example
 * ```ts
 * // Magha runs out mid-afternoon on the founder date:
 * nakshatraEndTime(2449217.71875); // ≈ 2449218.126 (1993-08-18 15:02 UT)
 * ```
 */
export function nakshatraEndTime(jdUt: number): number {
  return nextBoundary(siderealMoon, NAKSHATRA_WIDTH, SIDEREAL_MOON_RATE, jdUt);
}

/**
 * Instant the yoga in effect at `jdUt` ends (sidereal Sun + Moon sum
 * reaches the next multiple of 13°20′), as a UT Julian day.
 *
 * @example
 * ```ts
 * // Parigha ends around midday on the founder date:
 * yogaEndTime(2449217.71875); // ≈ 2449218.007 (1993-08-18 12:10 UT)
 * ```
 */
export function yogaEndTime(jdUt: number): number {
  return nextBoundary(yogaSum, YOGA_WIDTH, YOGA_RATE, jdUt);
}
