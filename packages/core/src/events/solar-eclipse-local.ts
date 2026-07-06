/**
 * Solar eclipses as seen from one place: whether, when and how much of
 * the Sun disappears — local type, magnitude, obscuration and the four
 * contact times, computed from topocentric Sun/Moon discs.
 * All instants are Julian days (UT).
 */

import { degToRad } from '../math/angles.js';
import { goldenMinimize } from '../math/optimize.js';
import { greenwichApparentSiderealTime } from '../earth/sidereal.js';
import { nextNewMoon } from './syzygy.js';
import { moonPosition } from '../bodies/moon.js';
import {
  EARTH_FLATTENING,
  EARTH_RADIUS_KM,
  MOON_RADIUS_PENUMBRAL_KM,
  MOON_RADIUS_UMBRAL_KM,
  SUN_RADIUS_KM,
  type Vec3,
  angleBetween,
  dot,
  norm,
  sub,
  sunMoonVectors,
  unit,
} from './eclipse-geometry.js';

/** The Moon's latitude at new moon can't exceed this when any eclipse occurs. */
const NO_ECLIPSE_LATITUDE = 1.7;

/**
 * An eclipse counts as visible when the Sun's true centre altitude
 * reaches −0.3° (upper limb on the refracted horizon) during it.
 */
const VISIBILITY_ALTITUDE = degToRad(-0.3);

/** An observing site. Altitude is metres above sea level. */
export interface Observer {
  latitude: number;
  longitude: number;
  altitudeM?: number;
}

export type LocalSolarEclipseType = 'partial' | 'annular' | 'total';

/** A solar eclipse as seen from one place. Instants are Julian days (UT). */
export interface LocalSolarEclipse {
  /** What this site sees at local maximum. */
  type: LocalSolarEclipseType;
  /** Instant of greatest local eclipse (least disc separation). */
  maximum: number;
  /**
   * Magnitude at maximum, NASA convention: fraction of the solar
   * diameter covered (partial), Moon/Sun diameter ratio (total/annular).
   */
  magnitude: number;
  /** Fraction of the Sun's disc area covered at maximum, 0–1. */
  obscuration: number;
  /** C1 — the Moon first dents the Sun. */
  firstContact: number;
  /** C2 — totality/annularity begins here (null when partial). */
  secondContact: number | null;
  /** C3 — totality/annularity ends here (null when partial). */
  thirdContact: number | null;
  /** C4 — the Sun is whole again. */
  fourthContact: number;
}

interface LocalGeometry {
  /** Topocentric Sun–Moon separation, radians. */
  separation: number;
  /** Topocentric semidiameters, radians. */
  sunSemidiameter: number;
  moonPenumbral: number;
  moonUmbral: number;
  /** True altitude of the Sun's centre, radians. */
  sunAltitude: number;
}

/** Observer's geocentric position (equatorial frame of date), km (Meeus ch. 11). */
function observerVector(jdUt: number, observer: Observer): Vec3 {
  const lat = degToRad(observer.latitude);
  const heightRatio = (observer.altitudeM ?? 0) / 1000 / EARTH_RADIUS_KM;
  const u = Math.atan((1 - EARTH_FLATTENING) * Math.tan(lat));
  const rhoSin =
    (1 - EARTH_FLATTENING) * Math.sin(u) + heightRatio * Math.sin(lat);
  const rhoCos = Math.cos(u) + heightRatio * Math.cos(lat);
  const theta = degToRad(
    greenwichApparentSiderealTime(jdUt) + observer.longitude,
  );
  return {
    x: EARTH_RADIUS_KM * rhoCos * Math.cos(theta),
    y: EARTH_RADIUS_KM * rhoCos * Math.sin(theta),
    z: EARTH_RADIUS_KM * rhoSin,
  };
}

function localGeometry(jdUt: number, observer: Observer): LocalGeometry {
  const { sun, moon } = sunMoonVectors(jdUt);
  const site = observerVector(jdUt, observer);
  const toSun = sub(sun, site);
  const toMoon = sub(moon, site);

  // Geodetic zenith of the site (ellipsoid normal).
  const lat = degToRad(observer.latitude);
  const theta = degToRad(
    greenwichApparentSiderealTime(jdUt) + observer.longitude,
  );
  const up: Vec3 = {
    x: Math.cos(lat) * Math.cos(theta),
    y: Math.cos(lat) * Math.sin(theta),
    z: Math.sin(lat),
  };

  return {
    separation: angleBetween(toSun, toMoon),
    sunSemidiameter: Math.asin(SUN_RADIUS_KM / norm(toSun)),
    moonPenumbral: Math.asin(MOON_RADIUS_PENUMBRAL_KM / norm(toMoon)),
    moonUmbral: Math.asin(MOON_RADIUS_UMBRAL_KM / norm(toMoon)),
    sunAltitude: Math.asin(dot(unit(toSun), up)),
  };
}

/** The discs overlap at this site (>0 while the local eclipse runs). */
function partialMargin(g: LocalGeometry): number {
  return g.sunSemidiameter + g.moonPenumbral - g.separation;
}

/** Totality or annularity at this site (>0 inside C2..C3). */
function centralMargin(g: LocalGeometry): number {
  return Math.abs(g.moonUmbral - g.sunSemidiameter) - g.separation;
}

/** Fraction of the Sun's disc area covered — circle-overlap geometry. */
function obscurationOf(g: LocalGeometry): number {
  const rs = g.sunSemidiameter;
  const rm = g.moonPenumbral;
  const d = g.separation;
  if (d >= rs + rm) return 0;
  if (d <= Math.abs(rs - rm)) return rm >= rs ? 1 : (rm / rs) ** 2;
  const alphaS = Math.acos((d * d + rs * rs - rm * rm) / (2 * d * rs));
  const alphaM = Math.acos((d * d + rm * rm - rs * rs) / (2 * d * rm));
  const lens =
    rs * rs * (alphaS - Math.sin(2 * alphaS) / 2) +
    rm * rm * (alphaM - Math.sin(2 * alphaM) / 2);
  return lens / (Math.PI * rs * rs);
}

/** Bisect the instant where `margin` crosses zero between inside and outside. */
function contactTime(
  insideJd: number,
  outsideJd: number,
  observer: Observer,
  margin: (g: LocalGeometry) => number,
): number {
  let inside = insideJd;
  let outside = outsideJd;
  for (let i = 0; i < 50; i++) {
    const mid = (inside + outside) / 2;
    if (margin(localGeometry(mid, observer)) > 0) inside = mid;
    else outside = mid;
  }
  return (inside + outside) / 2;
}

function eclipseAtSite(
  newMoonJd: number,
  observer: Observer,
): LocalSolarEclipse | null {
  if (Math.abs(moonPosition(newMoonJd).latitude) > NO_ECLIPSE_LATITUDE) {
    return null;
  }
  // The topocentric separation is not unimodal across a whole day: the
  // daily parallax swing adds lobes (including a "through the Earth"
  // alignment on the night side). Coarse-scan for the right basin, then
  // refine inside it.
  const sepAt = (t: number) => localGeometry(t, observer).separation;
  let coarseBest = newMoonJd;
  let coarseMin = Infinity;
  for (let t = newMoonJd - 0.5; t <= newMoonJd + 0.5; t += 1 / 48) {
    const s = sepAt(t);
    if (s < coarseMin) {
      coarseMin = s;
      coarseBest = t;
    }
  }
  const maximum = goldenMinimize(
    sepAt,
    coarseBest - 1 / 48,
    coarseBest + 1 / 48,
    1e-8,
  );
  const g = localGeometry(maximum, observer);
  if (partialMargin(g) <= 0) return null;

  const firstContact = contactTime(maximum, maximum - 0.25, observer, (x) =>
    partialMargin(x),
  );
  const fourthContact = contactTime(maximum, maximum + 0.25, observer, (x) =>
    partialMargin(x),
  );

  // Visible only if the Sun comes up at some point during the eclipse
  // (every instant in C1..C4 already has the discs overlapping).
  const bestAltitudeAt = goldenMinimize(
    (t) => -localGeometry(t, observer).sunAltitude,
    firstContact,
    fourthContact,
    1e-6,
  );
  if (
    localGeometry(bestAltitudeAt, observer).sunAltitude < VISIBILITY_ALTITUDE
  ) {
    return null;
  }

  let type: LocalSolarEclipseType = 'partial';
  let secondContact: number | null = null;
  let thirdContact: number | null = null;
  if (centralMargin(g) > 0) {
    type = g.moonUmbral >= g.sunSemidiameter ? 'total' : 'annular';
    secondContact = contactTime(
      maximum,
      maximum - 0.25,
      observer,
      centralMargin,
    );
    thirdContact = contactTime(
      maximum,
      maximum + 0.25,
      observer,
      centralMargin,
    );
  }

  // When the geometric peak is below the horizon, the maximum this site
  // can *see* is at the sunrise/sunset inside the eclipse — report that
  // instant and its circumstances (the swisseph/Espenak convention).
  let visibleMaximum = maximum;
  let atMax = g;
  if (g.sunAltitude < VISIBILITY_ALTITUDE) {
    let inside = bestAltitudeAt;
    let outside = maximum;
    for (let i = 0; i < 50; i++) {
      const mid = (inside + outside) / 2;
      if (localGeometry(mid, observer).sunAltitude >= VISIBILITY_ALTITUDE)
        inside = mid;
      else outside = mid;
    }
    visibleMaximum = (inside + outside) / 2;
    atMax = localGeometry(visibleMaximum, observer);
  }
  const magnitude =
    type === 'partial'
      ? partialMargin(atMax) / (2 * atMax.sunSemidiameter)
      : atMax.moonUmbral / atMax.sunSemidiameter;

  return {
    type,
    maximum: visibleMaximum,
    magnitude,
    obscuration:
      type === 'total' && centralMargin(atMax) > 0 ? 1 : obscurationOf(atMax),
    firstContact,
    secondContact,
    thirdContact,
    fourthContact,
  };
}

/**
 * Find the first solar eclipse visible from `observer` whose local
 * maximum falls at or after `jdUt`. "Visible" means the Sun is above
 * the horizon during some part of the eclipse.
 *
 * @example
 * ```ts
 * // Kathmandu's next solar eclipse after mid-2026: 2027-08-02.
 * nextSolarEclipseAt(2461227.5, { latitude: 27.7172, longitude: 85.324 });
 * ```
 */
export function nextSolarEclipseAt(
  jdUt: number,
  observer: Observer,
): LocalSolarEclipse {
  let t = jdUt;
  for (let i = 0; i < 1000; i++) {
    const newMoon = nextNewMoon(t);
    const eclipse = eclipseAtSite(newMoon, observer);
    if (eclipse && eclipse.maximum >= jdUt) return eclipse;
    t = newMoon + 20; // safely inside the next lunation
  }
  /* v8 ignore next 2 -- every site sees a partial eclipse within a few years */
  throw new Error('no local solar eclipse found in 1000 lunations');
}
