/**
 * Lunar eclipses: detection, classification, magnitudes, and contact
 * times from the geometry of the Earth's shadow at the Moon's distance
 * (Meeus ch. 54 geometry, NASA/Danjon shadow-enlargement convention).
 */

import { degToRad, radToDeg } from '../math/angles.js';
import { assertFinite } from '../math/validate.js';
import { goldenMinimize } from '../math/optimize.js';
import { moonPosition } from '../bodies/moon.js';
import { sunPosition } from '../bodies/sun.js';
import { nextFullMoon } from './syzygy.js';

const EARTH_RADIUS_KM = 6378.137;
const SUN_RADIUS_KM = 696000;
const KM_PER_AU = 149597870.7;
/** Moon radius / Earth equatorial radius adopted for eclipse work. */
const MOON_RADIUS_RATIO = 0.272481;
/**
 * Shadow radii are computed for the Earth's mean radius at 45° latitude
 * (the 0.998340 factor) and enlarged for the screening atmosphere.
 * Danjon's rule enlarges the terrestrial terms by 1/85 — the convention
 * NASA's canon uses, and the best fit to our Swiss Ephemeris fixtures.
 */
const FLATTENING_FACTOR = 0.99834;
const SHADOW_ENLARGEMENT = 1 + 1 / 85;

/** The Moon's latitude at full moon can't exceed this when any eclipse occurs. */
const NO_ECLIPSE_LATITUDE = 1.8;

export type LunarEclipseType = 'penumbral' | 'partial' | 'total';

/**
 * A lunar eclipse. All instants are Julian days (UT); contacts that a
 * given eclipse type does not have are null.
 */
export interface LunarEclipse {
  type: LunarEclipseType;
  /** Instant of greatest eclipse (least Moon–shadow-axis separation). */
  maximum: number;
  /** Umbral magnitude at maximum; negative for penumbral eclipses. */
  magnitude: number;
  /** Penumbral magnitude at maximum (> 0 for every lunar eclipse). */
  penumbralMagnitude: number;
  /** P1 — Moon first touches the penumbra. */
  penumbralBegin: number;
  /** U1 — Moon first touches the umbra (partial and total only). */
  partialBegin: number | null;
  /** U2 — Moon fully inside the umbra (total only). */
  totalBegin: number | null;
  /** U3 — Moon starts leaving the umbra (total only). */
  totalEnd: number | null;
  /** U4 — Moon fully clear of the umbra (partial and total only). */
  partialEnd: number | null;
  /** P4 — Moon fully clear of the penumbra. */
  penumbralEnd: number;
}

interface ShadowGeometry {
  /** Moon centre to shadow-axis separation, degrees. */
  separation: number;
  /** Penumbral shadow radius at the Moon's distance, degrees. */
  penumbraRadius: number;
  /** Umbral shadow radius at the Moon's distance, degrees. */
  umbraRadius: number;
  /** Moon semidiameter, degrees. */
  moonSemidiameter: number;
}

/** Great-circle separation of two ecliptic positions, degrees. */
function separationDeg(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
): number {
  const b1 = degToRad(lat1);
  const b2 = degToRad(lat2);
  const dl = degToRad(lon2 - lon1);
  const x =
    Math.cos(b1) * Math.sin(b2) - Math.sin(b1) * Math.cos(b2) * Math.cos(dl);
  const y = Math.cos(b2) * Math.sin(dl);
  const z =
    Math.sin(b1) * Math.sin(b2) + Math.cos(b1) * Math.cos(b2) * Math.cos(dl);
  return radToDeg(Math.atan2(Math.hypot(x, y), z));
}

function shadowGeometry(jdUt: number): ShadowGeometry {
  const sun = sunPosition(jdUt);
  const moon = moonPosition(jdUt);
  const sunDistanceKm = sun.distanceAu * KM_PER_AU;

  const moonParallax = Math.asin(EARTH_RADIUS_KM / moon.distanceKm);
  const sunParallax = Math.asin(EARTH_RADIUS_KM / sunDistanceKm);
  const sunSemidiameter = Math.asin(SUN_RADIUS_KM / sunDistanceKm);
  const earthTerm =
    SHADOW_ENLARGEMENT * (FLATTENING_FACTOR * moonParallax + sunParallax);

  return {
    separation: separationDeg(
      moon.apparentLongitude,
      moon.latitude,
      sun.apparentLongitude + 180, // the shadow axis is the antisolar point
      -sun.latitude,
    ),
    penumbraRadius: radToDeg(earthTerm + sunSemidiameter),
    umbraRadius: radToDeg(earthTerm - sunSemidiameter),
    moonSemidiameter: radToDeg(
      Math.asin(MOON_RADIUS_RATIO * Math.sin(moonParallax)),
    ),
  };
}

/** Instant of least Moon–shadow separation. */
function findMaximum(fullMoonJd: number): number {
  return goldenMinimize(
    (t) => shadowGeometry(t).separation,
    fullMoonJd - 0.25,
    fullMoonJd + 0.25,
    1e-8,
  );
}

/**
 * Contact instant where the separation crosses `radiusOf(geometry)`,
 * bisected between the maximum (inside) and a bracket time (outside).
 */
function contactTime(
  insideJd: number,
  outsideJd: number,
  radiusOf: (g: ShadowGeometry) => number,
): number {
  let inside = insideJd;
  let outside = outsideJd;
  for (let i = 0; i < 50; i++) {
    const mid = (inside + outside) / 2;
    const g = shadowGeometry(mid);
    if (g.separation < radiusOf(g)) inside = mid;
    else outside = mid;
  }
  return (inside + outside) / 2;
}

/** Both contacts around the maximum for one shadow-circle radius. */
function contacts(
  maximum: number,
  radiusOf: (g: ShadowGeometry) => number,
): [number, number] {
  return [
    contactTime(maximum, maximum - 0.5, radiusOf),
    contactTime(maximum, maximum + 0.5, radiusOf),
  ];
}

function eclipseAtOpposition(fullMoonJd: number): LunarEclipse | null {
  if (Math.abs(moonPosition(fullMoonJd).latitude) > NO_ECLIPSE_LATITUDE) {
    return null;
  }
  const maximum = findMaximum(fullMoonJd);
  const g = shadowGeometry(maximum);
  const s = g.moonSemidiameter;
  const penumbralMagnitude = (g.penumbraRadius + s - g.separation) / (2 * s);
  if (penumbralMagnitude <= 0) return null;
  const magnitude = (g.umbraRadius + s - g.separation) / (2 * s);
  const type: LunarEclipseType =
    magnitude < 0 ? 'penumbral' : magnitude < 1 ? 'partial' : 'total';

  const [penumbralBegin, penumbralEnd] = contacts(
    maximum,
    (geo) => geo.penumbraRadius + geo.moonSemidiameter,
  );
  const [partialBegin, partialEnd] =
    type === 'penumbral'
      ? [null, null]
      : contacts(maximum, (geo) => geo.umbraRadius + geo.moonSemidiameter);
  const [totalBegin, totalEnd] =
    type === 'total'
      ? contacts(maximum, (geo) => geo.umbraRadius - geo.moonSemidiameter)
      : [null, null];

  return {
    type,
    maximum,
    magnitude,
    penumbralMagnitude,
    penumbralBegin,
    partialBegin,
    totalBegin,
    totalEnd,
    partialEnd,
    penumbralEnd,
  };
}

/**
 * Find the first lunar eclipse whose maximum falls at or after `jdUt`.
 * Scans successive full moons; there is always an eclipse within six
 * lunations of any start instant.
 *
 * @example
 * ```ts
 * const e = nextLunarEclipse(2451545); // total eclipse of 2000-01-21
 * e.type; // 'total'
 * ```
 */
export function nextLunarEclipse(jdUt: number): LunarEclipse {
  assertFinite(jdUt, 'jdUt');
  let t = jdUt;
  for (let i = 0; i < 250; i++) {
    const fullMoon = nextFullMoon(t);
    const eclipse = eclipseAtOpposition(fullMoon);
    if (eclipse && eclipse.maximum >= jdUt) return eclipse;
    t = fullMoon + 20; // safely inside the next lunation
  }
  /* v8 ignore next 2 -- eclipses recur within six lunations */
  throw new Error('no lunar eclipse found in 250 lunations');
}
