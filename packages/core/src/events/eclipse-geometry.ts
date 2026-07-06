/**
 * Shared geometry for solar-eclipse work: rectangular equatorial-of-date
 * vectors of the Sun and Moon, and the adopted radii. Internal module —
 * not re-exported from the package index.
 */

import { degToRad } from '../math/angles.js';
import { moonPosition } from '../bodies/moon.js';
import { sunPosition } from '../bodies/sun.js';
import { trueObliquity } from '../earth/nutation.js';

export const EARTH_RADIUS_KM = 6378.137;
export const EARTH_FLATTENING = 1 / 298.257223563;
export const SUN_RADIUS_KM = 696000;
export const KM_PER_AU = 149597870.7;
/**
 * Moon radius for eclipse work, NASA convention: the larger IAU value
 * for penumbral (partial) phases, Danjon's smaller one for umbral
 * (total/annular) phases — the pair that best fits the fixtures.
 */
export const MOON_RADIUS_PENUMBRAL_KM = 0.2725076 * EARTH_RADIUS_KM;
export const MOON_RADIUS_UMBRAL_KM = 0.272281 * EARTH_RADIUS_KM;

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const dot = (a: Vec3, b: Vec3) => a.x * b.x + a.y * b.y + a.z * b.z;
export const sub = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x - b.x,
  y: a.y - b.y,
  z: a.z - b.z,
});
export const add = (a: Vec3, b: Vec3): Vec3 => ({
  x: a.x + b.x,
  y: a.y + b.y,
  z: a.z + b.z,
});
export const scale = (a: Vec3, k: number): Vec3 => ({
  x: a.x * k,
  y: a.y * k,
  z: a.z * k,
});
export const norm = (a: Vec3) => Math.hypot(a.x, a.y, a.z);
export const unit = (a: Vec3): Vec3 => scale(a, 1 / norm(a));

/** Angle between two vectors, radians — stable at small separations. */
export function angleBetween(a: Vec3, b: Vec3): number {
  const cross: Vec3 = {
    x: a.y * b.z - a.z * b.y,
    y: a.z * b.x - a.x * b.z,
    z: a.x * b.y - a.y * b.x,
  };
  return Math.atan2(norm(cross), dot(a, b));
}

/** Ecliptic spherical position → rectangular equatorial-of-date, km. */
export function equatorialVector(
  lonDeg: number,
  latDeg: number,
  distanceKm: number,
  obliquityDeg: number,
): Vec3 {
  const lon = degToRad(lonDeg);
  const lat = degToRad(latDeg);
  const eps = degToRad(obliquityDeg);
  const xe = Math.cos(lat) * Math.cos(lon);
  const ye = Math.cos(lat) * Math.sin(lon);
  const ze = Math.sin(lat);
  return {
    x: distanceKm * xe,
    y: distanceKm * (ye * Math.cos(eps) - ze * Math.sin(eps)),
    z: distanceKm * (ye * Math.sin(eps) + ze * Math.cos(eps)),
  };
}

/** Geocentric equatorial-of-date vectors of the Sun and Moon, km. */
export function sunMoonVectors(jdUt: number): { sun: Vec3; moon: Vec3 } {
  const eps = trueObliquity(jdUt);
  const sunEcl = sunPosition(jdUt);
  const moonEcl = moonPosition(jdUt);
  return {
    sun: equatorialVector(
      sunEcl.apparentLongitude,
      sunEcl.latitude,
      sunEcl.distanceAu * KM_PER_AU,
      eps,
    ),
    moon: equatorialVector(
      moonEcl.apparentLongitude,
      moonEcl.latitude,
      moonEcl.distanceKm,
      eps,
    ),
  };
}
