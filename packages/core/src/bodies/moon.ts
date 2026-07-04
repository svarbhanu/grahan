/**
 * Apparent position of the Moon (Meeus ch. 47, truncated ELP-2000/82).
 * Intrinsic accuracy ≈ 10″ in longitude — grahan's published Moon
 * tolerance is 180″, and tests assert 36″ against the fixtures.
 */

import { degToRad, normalizeDegrees } from '../math/angles.js';
import { ttFromUt } from '../time/deltaT.js';
import { j2000Century } from '../time/julian.js';
import { nutation } from '../earth/nutation.js';
import { MOON_B, MOON_LR } from './moon.data.js';

export interface MoonPosition {
  /** Apparent geocentric ecliptic longitude, degrees [0, 360). */
  apparentLongitude: number;
  /** Geocentric ecliptic latitude, degrees (within ±5.3°). */
  latitude: number;
  /** Earth–Moon centre distance, kilometres. */
  distanceKm: number;
}

/** The five fundamental arguments of lunar theory (Meeus 47.1–47.5), degrees. */
function fundamentalArguments(t: number) {
  return {
    meanLongitude:
      218.3164477 +
      481267.88123421 * t -
      0.0015786 * t ** 2 +
      t ** 3 / 538841 -
      t ** 4 / 65194000,
    elongation:
      297.8501921 +
      445267.1114034 * t -
      0.0018819 * t ** 2 +
      t ** 3 / 545868 -
      t ** 4 / 113065000,
    sunAnomaly:
      357.5291092 + 35999.0502909 * t - 0.0001536 * t ** 2 + t ** 3 / 24490000,
    moonAnomaly:
      134.9633964 +
      477198.8675055 * t +
      0.0087414 * t ** 2 +
      t ** 3 / 69699 -
      t ** 4 / 14712000,
    latitudeArgument:
      93.272095 +
      483202.0175233 * t -
      0.0036539 * t ** 2 -
      t ** 3 / 3526000 +
      t ** 4 / 863310000,
  };
}

/**
 * Apparent geocentric position of the Moon.
 *
 * @example
 * ```ts
 * moonPosition(2451545).apparentLongitude; // ≈ 222.6 at J2000
 * ```
 */
export function moonPosition(jdUt: number): MoonPosition {
  const t = j2000Century(ttFromUt(jdUt));
  const arg = fundamentalArguments(t);
  const d = degToRad(arg.elongation);
  const m = degToRad(arg.sunAnomaly);
  const mp = degToRad(arg.moonAnomaly);
  const f = degToRad(arg.latitudeArgument);
  // Damping factor for terms involving the Sun's anomaly (Meeus 47.6).
  const e = 1 - 0.002516 * t - 0.0000074 * t ** 2;
  const eFactor = (mCoeff: number) =>
    mCoeff === 0 ? 1 : Math.abs(mCoeff) === 1 ? e : e * e;

  let sumL = 0;
  let sumR = 0;
  for (const [cd, cm, cmp, cf, sinCoeff, cosCoeff] of MOON_LR) {
    const angle = cd * d + cm * m + cmp * mp + cf * f;
    const damping = eFactor(cm);
    sumL += sinCoeff * damping * Math.sin(angle);
    sumR += cosCoeff * damping * Math.cos(angle);
  }

  let sumB = 0;
  for (const [cd, cm, cmp, cf, sinCoeff] of MOON_B) {
    sumB +=
      sinCoeff * eFactor(cm) * Math.sin(cd * d + cm * m + cmp * mp + cf * f);
  }

  // Additive corrections: Venus, Jupiter, and flattening terms (Meeus p. 342).
  const a1 = degToRad(119.75 + 131.849 * t);
  const a2 = degToRad(53.09 + 479264.29 * t);
  const a3 = degToRad(313.45 + 481266.484 * t);
  const lp = degToRad(arg.meanLongitude);
  sumL += 3958 * Math.sin(a1) + 1962 * Math.sin(lp - f) + 318 * Math.sin(a2);
  sumB +=
    -2235 * Math.sin(lp) +
    382 * Math.sin(a3) +
    175 * Math.sin(a1 - f) +
    175 * Math.sin(a1 + f) +
    127 * Math.sin(lp - mp) -
    115 * Math.sin(lp + mp);

  return {
    apparentLongitude: normalizeDegrees(
      arg.meanLongitude + sumL / 1e6 + nutation(jdUt).longitude,
    ),
    latitude: sumB / 1e6,
    distanceKm: 385000.56 + sumR / 1000,
  };
}
