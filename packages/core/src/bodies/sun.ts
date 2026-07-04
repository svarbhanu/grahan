/**
 * Apparent position of the Sun from truncated VSOP87D (Meeus ch. 25/32).
 *
 * The Earth's heliocentric position is evaluated from the VSOP87D series,
 * flipped to give the geocentric Sun, converted to the FK5 frame, and
 * corrected for aberration and nutation — matching the "apparent geocentric
 * ecliptic of date" frame used by our Swiss Ephemeris fixtures.
 */

import { degToRad, normalizeDegrees, radToDeg } from '../math/angles.js';
import { ttFromUt } from '../time/deltaT.js';
import { J2000 } from '../time/julian.js';
import { nutation } from '../earth/nutation.js';
import {
  EARTH_B,
  EARTH_L,
  EARTH_R,
  type Vsop87Series,
} from './vsop87-earth.data.js';

export interface SunPosition {
  /** Apparent geocentric ecliptic longitude, degrees [0, 360). */
  apparentLongitude: number;
  /** Geocentric ecliptic latitude, degrees (always within ±0.001°). */
  latitude: number;
  /** Earth–Sun distance, astronomical units. */
  distanceAu: number;
}

function evaluateSeries(series: Vsop87Series, tau: number): number {
  let total = 0;
  let tauPower = 1;
  for (const order of series) {
    let sum = 0;
    for (const [a, b, c] of order) {
      sum += a * Math.cos(b + c * tau);
    }
    total += sum * tauPower;
    tauPower *= tau;
  }
  return total;
}

/**
 * Apparent geocentric position of the Sun.
 *
 * @example
 * ```ts
 * sunPosition(2451545).apparentLongitude; // ≈ 280.46 (Sun in Capricorn at J2000)
 * ```
 */
export function sunPosition(jdUt: number): SunPosition {
  const jdTt = ttFromUt(jdUt);
  const tau = (jdTt - J2000) / 365250; // julian millennia (VSOP87 time unit)

  const heliocentricLon = evaluateSeries(EARTH_L, tau);
  const heliocentricLat = evaluateSeries(EARTH_B, tau);
  const distanceAu = evaluateSeries(EARTH_R, tau);

  // Geocentric Sun = heliocentric Earth + 180°, latitude flipped.
  let longitude = normalizeDegrees(radToDeg(heliocentricLon) + 180);
  let latitude = -radToDeg(heliocentricLat);

  // VSOP87 dynamical ecliptic → FK5 (Meeus 25.9), a ~0.09″ tweak.
  const t = 10 * tau;
  const lonFk5 = degToRad(longitude - 1.397 * t - 0.00031 * t * t);
  longitude +=
    (-0.09033 +
      0.03916 *
        (Math.cos(lonFk5) + Math.sin(lonFk5)) *
        Math.tan(degToRad(latitude))) /
    3600;
  latitude += (0.03916 * (Math.cos(lonFk5) - Math.sin(lonFk5))) / 3600;

  // Aberration (Meeus 25.10) and nutation → apparent place.
  longitude -= 20.4898 / distanceAu / 3600;
  longitude += nutation(jdUt).longitude;

  return {
    apparentLongitude: normalizeDegrees(longitude),
    latitude,
    distanceAu,
  };
}
