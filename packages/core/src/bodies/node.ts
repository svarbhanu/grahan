/**
 * Ascending node of the lunar orbit (Meeus ch. 47) — in Vedic astrology
 * this is Rahu; Ketu sits exactly opposite. The mean node regresses
 * smoothly; the true (osculating) node wobbles ±1.7° around it with a
 * ~173-day period and even runs direct for short stretches.
 */

import { degToRad, normalizeDegrees, radToDeg } from '../math/angles.js';
import { ttFromUt } from '../time/deltaT.js';
import { j2000Century } from '../time/julian.js';
import { nutation } from '../earth/nutation.js';
import { moonPosition } from './moon.js';

/**
 * Mean longitude of the Moon's ascending node, degrees [0, 360), referred
 * to the true equinox of date (nutation applied) so it lives in the same
 * frame as the apparent Sun/Moon longitudes. The mean node regresses
 * through the zodiac in ≈ 18.6 years.
 *
 * @example
 * ```ts
 * meanLunarNode(2451545); // ≈ 125.07 at J2000
 * ```
 */
export function meanLunarNode(jdUt: number): number {
  const t = j2000Century(ttFromUt(jdUt));
  return normalizeDegrees(meanNodeOfDate(t) + nutation(jdUt).longitude);
}

/** Mean node from its polynomial elements, mean equinox, degrees. */
function meanNodeOfDate(t: number): number {
  return (
    125.0445479 -
    1934.1362891 * t +
    0.0020754 * t ** 2 +
    t ** 3 / 467441 -
    t ** 4 / 60616000
  );
}

/** Geocentric ecliptic-of-date Cartesian position of the Moon, km. */
function moonCartesian(jdUt: number): [number, number, number] {
  const p = moonPosition(jdUt);
  const lambda = degToRad(p.apparentLongitude);
  const beta = degToRad(p.latitude);
  const cosB = Math.cos(beta);
  return [
    p.distanceKm * cosB * Math.cos(lambda),
    p.distanceKm * cosB * Math.sin(lambda),
    p.distanceKm * Math.sin(beta),
  ];
}

/**
 * True (osculating) longitude of the Moon's ascending node, degrees
 * [0, 360), true equinox of date. Computed the way Swiss Ephemeris
 * does: the instantaneous orbit plane from the Moon's position and
 * velocity (r × v), whose ascending intersection with the ecliptic is
 * the node. Many jyotish traditions prefer this "true Rahu" over the
 * mean node.
 *
 * @example
 * ```ts
 * trueLunarNode(2451545); // ≈ 123.97 at J2000 (mean node is ≈ 125.07)
 * ```
 */
export function trueLunarNode(jdUt: number): number {
  const step = 0.01; // days; central difference over the smooth series
  const r = moonCartesian(jdUt);
  const before = moonCartesian(jdUt - step);
  const after = moonCartesian(jdUt + step);
  const vx = (after[0] - before[0]) / (2 * step);
  const vy = (after[1] - before[1]) / (2 * step);
  const vz = (after[2] - before[2]) / (2 * step);
  // Orbit normal h = r × v; the ascending node lies along ẑ × h.
  const hx = r[1] * vz - r[2] * vy;
  const hy = r[2] * vx - r[0] * vz;
  return normalizeDegrees(radToDeg(Math.atan2(hx, -hy)));
}
