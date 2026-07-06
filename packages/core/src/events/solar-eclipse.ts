/**
 * Solar eclipses, global circumstances: detection near new moons, type,
 * centrality, greatest-eclipse instant, location, and magnitude.
 *
 * Instead of classical Besselian elements this works on the true
 * three-dimensional geometry: the Moon–Sun shadow axis against the
 * (flattening-corrected) ellipsoid, and topocentric Sun/Moon discs at
 * the surface point nearest the axis. All instants are Julian days (UT).
 */

import { normalizeDegrees, radToDeg } from '../math/angles.js';
import { assertFinite } from '../math/validate.js';
import { goldenMinimize } from '../math/optimize.js';
import { moonPosition } from '../bodies/moon.js';
import { greenwichApparentSiderealTime } from '../earth/sidereal.js';
import { nextNewMoon } from './syzygy.js';
import {
  EARTH_FLATTENING,
  EARTH_RADIUS_KM,
  MOON_RADIUS_PENUMBRAL_KM,
  MOON_RADIUS_UMBRAL_KM,
  SUN_RADIUS_KM,
  type Vec3,
  add,
  angleBetween,
  dot,
  norm,
  scale,
  sub,
  sunMoonVectors,
  unit,
} from './eclipse-geometry.js';

/** The Moon's latitude at new moon can't exceed this when any eclipse occurs. */
const NO_ECLIPSE_LATITUDE = 1.7;

export type SolarEclipseType = 'partial' | 'annular' | 'total' | 'hybrid';

/** A solar eclipse seen globally. Instants are Julian days (UT). */
export interface SolarEclipse {
  type: SolarEclipseType;
  /** True when the shadow axis crosses the Earth's surface. */
  central: boolean;
  /** Greatest eclipse: the shadow axis closest to the Earth's centre. */
  maximum: number;
  /**
   * Magnitude at greatest eclipse, NASA convention: fraction of the
   * solar diameter covered for partial eclipses, Moon/Sun apparent
   * diameter ratio for central ones.
   */
  magnitude: number;
  /** Geodetic point under (or nearest) the shadow axis at maximum. */
  greatest: { latitude: number; longitude: number };
  /** P1 — penumbra first touches Earth (eclipse begins somewhere). */
  globalBegin: number;
  /** Totality/annularity first exists somewhere on Earth (null for partial). */
  centralBegin: number | null;
  /** Totality/annularity last exists somewhere on Earth (null for partial). */
  centralEnd: number | null;
  /** P4 — penumbra leaves Earth (eclipse ends everywhere). */
  globalEnd: number;
}

interface Circumstances {
  /** Shadow axis crosses the (stretched) ellipsoid. */
  axisHits: boolean;
  /** Distance of the axis from the geocentre in stretched space, km. */
  axisDistanceKm: number;
  /** Topocentric Sun–Moon separation at the surface point, radians. */
  separation: number;
  /** Topocentric semidiameters at the surface point, radians. */
  sunSemidiameter: number;
  moonPenumbral: number;
  moonUmbral: number;
  /** The surface point itself (true space, on the ellipsoid), km. */
  surfacePoint: Vec3;
}

/**
 * Geometry at the ellipsoid point nearest the shadow axis (the point
 * the axis pierces, when it hits). The flattened Earth is handled by
 * stretching z by 1/(1−f), which maps the ellipsoid to a sphere and
 * keeps lines straight.
 */
function circumstances(jdUt: number): Circumstances {
  const { sun, moon } = sunMoonVectors(jdUt);

  const stretch = 1 / (1 - EARTH_FLATTENING);
  const moonS: Vec3 = { x: moon.x, y: moon.y, z: moon.z * stretch };
  const sunS: Vec3 = { x: sun.x, y: sun.y, z: sun.z * stretch };
  const dirS = unit(sub(moonS, sunS));

  // Closest approach of the stretched axis to the geocentre.
  const s0 = -dot(moonS, dirS);
  const closest = add(moonS, scale(dirS, s0));
  const axisDistanceKm = norm(closest);
  const axisHits = axisDistanceKm <= EARTH_RADIUS_KM;

  // Surface point: axis piercing point (day side) or nearest limb point.
  const pointS = axisHits
    ? add(
        moonS,
        scale(dirS, s0 - Math.sqrt(EARTH_RADIUS_KM ** 2 - axisDistanceKm ** 2)),
      )
    : scale(unit(closest), EARTH_RADIUS_KM);
  const surfacePoint: Vec3 = {
    x: pointS.x,
    y: pointS.y,
    z: pointS.z * (1 - EARTH_FLATTENING),
  };

  const toMoon = sub(moon, surfacePoint);
  const toSun = sub(sun, surfacePoint);
  const separation = angleBetween(toMoon, toSun);
  const moonDist = norm(toMoon);

  return {
    axisHits,
    axisDistanceKm,
    separation,
    sunSemidiameter: Math.asin(SUN_RADIUS_KM / norm(toSun)),
    moonPenumbral: Math.asin(MOON_RADIUS_PENUMBRAL_KM / moonDist),
    moonUmbral: Math.asin(MOON_RADIUS_UMBRAL_KM / moonDist),
    surfacePoint,
  };
}

/** Sun and Moon discs overlap somewhere on Earth (>0 during the eclipse). */
function partialMargin(c: Circumstances): number {
  return c.sunSemidiameter + c.moonPenumbral - c.separation;
}

/** Totality or annularity exists at the surface point (>0 inside). */
function centralMargin(c: Circumstances): number {
  return Math.abs(c.moonUmbral - c.sunSemidiameter) - c.separation;
}

/** Instant of least axis–geocentre distance. */
function findMaximum(newMoonJd: number): number {
  return goldenMinimize(
    (t) => circumstances(t).axisDistanceKm,
    newMoonJd - 0.5,
    newMoonJd + 0.5,
    1e-8,
  );
}

/** Bisect the instant where `margin` crosses zero between inside and outside. */
function contactTime(
  insideJd: number,
  outsideJd: number,
  margin: (c: Circumstances) => number,
): number {
  let inside = insideJd;
  let outside = outsideJd;
  for (let i = 0; i < 50; i++) {
    const mid = (inside + outside) / 2;
    if (margin(circumstances(mid)) > 0) inside = mid;
    else outside = mid;
  }
  return (inside + outside) / 2;
}

/** Geodetic latitude/longitude (degrees) of an on-ellipsoid point. */
function geodetic(
  point: Vec3,
  jdUt: number,
): { latitude: number; longitude: number } {
  const rho = Math.hypot(point.x, point.y);
  const latitude = radToDeg(
    Math.atan2(point.z, rho * (1 - EARTH_FLATTENING) ** 2),
  );
  const lonDeg = normalizeDegrees(
    radToDeg(Math.atan2(point.y, point.x)) -
      greenwichApparentSiderealTime(jdUt),
  );
  return { latitude, longitude: lonDeg > 180 ? lonDeg - 360 : lonDeg };
}

function eclipseAtConjunction(newMoonJd: number): SolarEclipse | null {
  if (Math.abs(moonPosition(newMoonJd).latitude) > NO_ECLIPSE_LATITUDE) {
    return null;
  }
  const maximum = findMaximum(newMoonJd);
  const c = circumstances(maximum);
  if (partialMargin(c) <= 0) return null;

  const central = c.axisHits;
  let type: SolarEclipseType;
  if (centralMargin(c) > 0) {
    type = c.moonUmbral >= c.sunSemidiameter ? 'total' : 'annular';
  } else {
    type = 'partial';
  }
  const magnitude =
    type === 'partial'
      ? partialMargin(c) / (2 * c.sunSemidiameter)
      : c.moonUmbral / c.sunSemidiameter;

  const globalBegin = contactTime(maximum, maximum - 0.35, (g) =>
    partialMargin(g),
  );
  const globalEnd = contactTime(maximum, maximum + 0.35, (g) =>
    partialMargin(g),
  );
  let centralBegin: number | null = null;
  let centralEnd: number | null = null;
  if (type !== 'partial') {
    centralBegin = contactTime(maximum, maximum - 0.35, centralMargin);
    centralEnd = contactTime(maximum, maximum + 0.35, centralMargin);
    // Hybrid check: does the eclipse switch between total and annular
    // along the central track? The Moon's apparent excess over the Sun
    // peaks in the track interior (observer nearest the Moon) and is
    // smallest at the track ends, so those three probes decide it.
    const ratioMargin = (t: number) => {
      const g = circumstances(t);
      return g.moonUmbral - g.sunSemidiameter;
    };
    const nudge = 2e-5; // ~1.7 s inside the contacts
    const tPeak = goldenMinimize(
      (t) => -ratioMargin(t),
      centralBegin,
      centralEnd,
      1e-7,
    );
    const sawTotal = ratioMargin(tPeak) > 0;
    const sawAnnular =
      ratioMargin(centralBegin + nudge) < 0 ||
      ratioMargin(centralEnd - nudge) < 0;
    if (sawTotal && sawAnnular) type = 'hybrid';
    else if (sawTotal) type = 'total';
    else type = 'annular';
  }

  return {
    type,
    central,
    maximum,
    magnitude,
    greatest: geodetic(c.surfacePoint, maximum),
    globalBegin,
    centralBegin,
    centralEnd,
    globalEnd,
  };
}

/**
 * Find the first solar eclipse whose greatest-eclipse instant falls at
 * or after `jdUt`. Scans successive new moons; there is always a solar
 * eclipse within six lunations of any start instant.
 *
 * @example
 * ```ts
 * const e = nextSolarEclipse(2449900); // 1995-10-24, totality over Asia
 * e.type; // 'total'
 * ```
 */
export function nextSolarEclipse(jdUt: number): SolarEclipse {
  assertFinite(jdUt, 'jdUt');
  let t = jdUt;
  for (let i = 0; i < 250; i++) {
    const newMoon = nextNewMoon(t);
    const eclipse = eclipseAtConjunction(newMoon);
    if (eclipse && eclipse.maximum >= jdUt) return eclipse;
    t = newMoon + 20; // safely inside the next lunation
  }
  /* v8 ignore next 2 -- eclipses recur within six lunations */
  throw new Error('no solar eclipse found in 250 lunations');
}
