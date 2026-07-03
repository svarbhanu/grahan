/**
 * ΔT — the difference TT − UT1 in seconds — from the Espenak–Meeus
 * polynomial expressions (NASA eclipse site, "Polynomial Expressions for
 * Delta T"). Ephemeris series run on Terrestrial Time (TT); civil instants
 * are UT. ΔT bridges the two.
 *
 * The piecewise fits below cover 1800–2150. Outside that range the
 * long-term parabola is used and accuracy degrades — fine for grahan's
 * documented scope.
 */

import { calendarFromJulianDay } from './julian.js';

/**
 * ΔT in seconds for a (possibly fractional) calendar year.
 *
 * @example
 * ```ts
 * deltaTSeconds(2000); // ≈ 63.9
 * ```
 */
export function deltaTSeconds(year: number): number {
  if (year < 1800 || year > 2150) {
    const u = (year - 1820) / 100;
    return -20 + 32 * u * u;
  }
  if (year < 1860) {
    const t = year - 1800;
    return (
      13.72 -
      0.332447 * t +
      0.0068612 * t ** 2 +
      0.0041116 * t ** 3 -
      0.00037436 * t ** 4 +
      0.0000121272 * t ** 5 -
      0.0000001699 * t ** 6 +
      0.000000000875 * t ** 7
    );
  }
  if (year < 1900) {
    const t = year - 1860;
    return (
      7.62 +
      0.5737 * t -
      0.251754 * t ** 2 +
      0.01680668 * t ** 3 -
      0.0004473624 * t ** 4 +
      t ** 5 / 233174
    );
  }
  if (year < 1920) {
    const t = year - 1900;
    return (
      -2.79 +
      1.494119 * t -
      0.0598939 * t ** 2 +
      0.0061966 * t ** 3 -
      0.000197 * t ** 4
    );
  }
  if (year < 1941) {
    const t = year - 1920;
    return 21.2 + 0.84493 * t - 0.0761 * t ** 2 + 0.0020936 * t ** 3;
  }
  if (year < 1961) {
    const t = year - 1950;
    return 29.07 + 0.407 * t - t ** 2 / 233 + t ** 3 / 2547;
  }
  if (year < 1986) {
    const t = year - 1975;
    return 45.45 + 1.067 * t - t ** 2 / 260 - t ** 3 / 718;
  }
  if (year < 2005) {
    const t = year - 2000;
    return (
      63.86 +
      0.3345 * t -
      0.060374 * t ** 2 +
      0.0017275 * t ** 3 +
      0.000651814 * t ** 4 +
      0.00002373599 * t ** 5
    );
  }
  if (year < 2050) {
    const t = year - 2000;
    return 62.92 + 0.32217 * t + 0.005589 * t ** 2;
  }
  // 2050–2150
  const u = (year - 1820) / 100;
  return -20 + 32 * u * u - 0.5628 * (2150 - year);
}

/**
 * Convert a UT Julian day to a TT Julian day by adding ΔT.
 *
 * @example
 * ```ts
 * ttFromUt(2451544.5); // ≈ 2451544.50074 (ΔT ≈ 64 s in 2000)
 * ```
 */
export function ttFromUt(utJd: number): number {
  const { year, month } = calendarFromJulianDay(utJd);
  return utJd + deltaTSeconds(year + (month - 0.5) / 12) / 86400;
}
