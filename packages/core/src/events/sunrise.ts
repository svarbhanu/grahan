/**
 * Sunrise and sunset for one local calendar date (Meeus ch. 15, solved by
 * direct hour-angle iteration instead of interpolation tables).
 *
 * Convention: upper limb touching the refracted horizon (≈36.7′, calibrated
 * to Swiss Ephemeris — see STANDARD_REFRACTION) with the true solar
 * semidiameter, matching the committed fixtures. Polar daylight conditions
 * are explicit results, never NaN.
 */

import { degToRad, radToDeg } from '../math/angles.js';
import { dateFromJulianDay, julianDayFromDate } from '../time/julian.js';
import { dateFromZonedTime } from '../time/timezone.js';
import { sunPosition } from '../bodies/sun.js';
import { equatorialFromEcliptic } from '../earth/coordinates.js';
import { trueObliquity } from '../earth/nutation.js';
import { localSiderealTime } from '../earth/sidereal.js';

/**
 * Horizontal refraction at the rise/set event, degrees (≈36.7′).
 * Calibrated against the Swiss Ephemeris fixture set (272 events, 5 sites):
 * SE evaluates refraction at the event's *true* altitude below the horizon,
 * which yields more bending than the textbook 34′ apparent-horizon value.
 */
const STANDARD_REFRACTION = 0.6117;
/** Solar semidiameter at 1 AU, arcseconds. */
const SEMIDIAMETER_1AU = 959.63;
/** Degrees the hour angle advances per day (sidereal rate). */
const HOUR_ANGLE_RATE = 360.98564736629;

export type SunEvent =
  | { kind: 'rises'; date: Date }
  | { kind: 'always-up' }
  | { kind: 'always-down' };

export interface SunriseOptions {
  year: number;
  month: number;
  day: number;
  /** Geographic latitude, degrees north-positive. */
  latitude: number;
  /** Geographic longitude, degrees east-positive. */
  longitude: number;
  /** IANA zone defining whose calendar date this is, e.g. "Asia/Kathmandu". */
  timezone: string;
}

export interface SunDayEvents {
  sunrise: SunEvent;
  sunset: SunEvent;
}

/** Wrap an angle to [−180, 180). */
function wrapSigned(deg: number): number {
  return ((((deg + 180) % 360) + 360) % 360) - 180;
}

function sunEquatorial(jdUt: number) {
  const sun = sunPosition(jdUt);
  return {
    ...equatorialFromEcliptic(
      sun.apparentLongitude,
      sun.latitude,
      trueObliquity(jdUt),
    ),
    distanceAu: sun.distanceAu,
  };
}

/**
 * Rise/set altitude of the Sun's centre: upper limb on the refracted
 * horizon, using the true (distance-dependent) semidiameter — the same
 * convention as Swiss Ephemeris. At tangent polar crossings even 0.5′
 * here moves the event by minutes.
 */
function standardAltitude(distanceAu: number): number {
  return -(STANDARD_REFRACTION + SEMIDIAMETER_1AU / distanceAu / 3600);
}

/** Semi-diurnal arc H₀, or the polar state when the Sun never crosses h₀. */
function semiDiurnalArc(
  jdUt: number,
  latitude: number,
): number | 'always-up' | 'always-down' {
  const { declination, distanceAu } = sunEquatorial(jdUt);
  const phi = degToRad(latitude);
  const delta = degToRad(declination);
  const cosH0 =
    (Math.sin(degToRad(standardAltitude(distanceAu))) -
      Math.sin(phi) * Math.sin(delta)) /
    (Math.cos(phi) * Math.cos(delta));
  if (cosH0 > 1) return 'always-down'; // never gets up to h₀
  if (cosH0 < -1) return 'always-up'; // never gets down to h₀
  return radToDeg(Math.acos(cosH0));
}

/** Sun's geometric altitude, degrees. */
function sunAltitude(
  jdUt: number,
  latitude: number,
  longitude: number,
): number {
  const { rightAscension, declination } = sunEquatorial(jdUt);
  const hourAngle = degToRad(
    localSiderealTime(jdUt, longitude) - rightAscension,
  );
  const phi = degToRad(latitude);
  const delta = degToRad(declination);
  return radToDeg(
    Math.asin(
      Math.sin(phi) * Math.sin(delta) +
        Math.cos(phi) * Math.cos(delta) * Math.cos(hourAngle),
    ),
  );
}

/**
 * Sunrise and sunset for a local calendar date at a location.
 *
 * @example
 * ```ts
 * sunriseSunset({
 *   year: 2026, month: 7, day: 2,
 *   latitude: 27.7172, longitude: 85.324, timezone: 'Asia/Kathmandu',
 * });
 * // { sunrise: { kind: 'rises', date: 2026-07-01T23:26:37Z }, sunset: … }
 * ```
 */
export function sunriseSunset(options: SunriseOptions): SunDayEvents {
  const { year, month, day, latitude, longitude, timezone } = options;
  const jdStart = julianDayFromDate(
    dateFromZonedTime(
      { year, month, day, hour: 0, minute: 0, second: 0 },
      timezone,
    ),
  );
  const jdEnd = jdStart + 1;

  // Solar transit: start from local clock noon, pull the hour angle to zero.
  let transit = jdStart + 0.5;
  for (let i = 0; i < 3; i += 1) {
    const { rightAscension } = sunEquatorial(transit);
    const hourAngle = wrapSigned(
      localSiderealTime(transit, longitude) - rightAscension,
    );
    transit -= hourAngle / HOUR_ANGLE_RATE;
  }

  // The local-day window may contain an event belonging to the previous or
  // next solar cycle (e.g. a 71°N sunset minutes after local midnight), so
  // candidates come from three neighbouring transits; the earliest crossing
  // that lands inside the window wins — matching the fixtures' forward
  // search from local midnight.
  const findEvent = (sign: 1 | -1): SunEvent => {
    const candidates: number[] = [];
    for (const dayOffset of [-1, 0, 1]) {
      const baseTransit = transit + dayOffset;
      const baseArc = semiDiurnalArc(baseTransit, latitude);
      if (typeof baseArc !== 'number') continue; // circumpolar on that cycle
      let jd = baseTransit + (sign * baseArc) / HOUR_ANGLE_RATE;
      let crossed = true;
      for (let i = 0; i < 3 && crossed; i += 1) {
        const arc = semiDiurnalArc(jd, latitude);
        if (typeof arc !== 'number') {
          crossed = false;
          break;
        }
        const { rightAscension } = sunEquatorial(jd);
        const hourAngle = wrapSigned(
          localSiderealTime(jd, longitude) - rightAscension,
        );
        jd -= wrapSigned(hourAngle - sign * arc) / HOUR_ANGLE_RATE;
      }
      if (crossed && jd >= jdStart && jd < jdEnd) candidates.push(jd);
    }
    if (candidates.length === 0) {
      // No crossing inside this local day: classify by the altitude at the
      // middle of the window, mirroring the fixture generator's rule.
      const kind =
        sunAltitude(jdStart + 0.5, latitude, longitude) > 0
          ? 'always-up'
          : 'always-down';
      return { kind };
    }
    return { kind: 'rises', date: dateFromJulianDay(Math.min(...candidates)) };
  };

  return { sunrise: findEvent(-1), sunset: findEvent(1) };
}
