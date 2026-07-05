/**
 * Apparent geocentric positions of the five classical planets from
 * truncated VSOP87D (Meeus ch. 33): heliocentric planet and Earth,
 * light-time iteration, FK5 frame correction, annual aberration, nutation —
 * the same "apparent ecliptic of date" frame as the Swiss Ephemeris
 * fixtures and the rest of grahan.
 */

import { degToRad, normalizeDegrees, radToDeg } from '../math/angles.js';
import { ttFromUt } from '../time/deltaT.js';
import { j2000Century, J2000 } from '../time/julian.js';
import { nutation } from '../earth/nutation.js';
import { EARTH_B, EARTH_L, EARTH_R } from './vsop87-earth.data.js';
import { MERCURY_B, MERCURY_L, MERCURY_R } from './vsop87-mercury.data.js';
import { VENUS_B, VENUS_L, VENUS_R } from './vsop87-venus.data.js';
import { MARS_B, MARS_L, MARS_R } from './vsop87-mars.data.js';
import { JUPITER_B, JUPITER_L, JUPITER_R } from './vsop87-jupiter.data.js';
import { SATURN_B, SATURN_L, SATURN_R } from './vsop87-saturn.data.js';
import type { Vsop87Series } from './vsop87-earth.data.js';
import { evaluateSeries } from './vsop87.js';

export type Planet = 'mercury' | 'venus' | 'mars' | 'jupiter' | 'saturn';

export interface PlanetPosition {
  /** Apparent geocentric ecliptic longitude, degrees [0, 360). */
  apparentLongitude: number;
  /** Geocentric ecliptic latitude, degrees. */
  latitude: number;
  /** Earth–planet distance, astronomical units. */
  distanceAu: number;
  /** Rate of apparent longitude, degrees/day (negative while retrograde). */
  speed: number;
  /** True while the planet appears to move backwards through the zodiac. */
  retrograde: boolean;
}

interface SeriesSet {
  l: Vsop87Series;
  b: Vsop87Series;
  r: Vsop87Series;
}

const SERIES: Record<Planet, SeriesSet> = {
  mercury: { l: MERCURY_L, b: MERCURY_B, r: MERCURY_R },
  venus: { l: VENUS_L, b: VENUS_B, r: VENUS_R },
  mars: { l: MARS_L, b: MARS_B, r: MARS_R },
  jupiter: { l: JUPITER_L, b: JUPITER_B, r: JUPITER_R },
  saturn: { l: SATURN_L, b: SATURN_B, r: SATURN_R },
};

const EARTH: SeriesSet = { l: EARTH_L, b: EARTH_B, r: EARTH_R };

const LIGHT_TIME_DAYS_PER_AU = 0.005775518;
const ABERRATION_ARCSEC = 20.49552;

/** Heliocentric rectangular coordinates (AU), ecliptic of date. */
function rectangular(set: SeriesSet, jdTt: number): [number, number, number] {
  const tau = (jdTt - J2000) / 365250;
  const lon = evaluateSeries(set.l, tau);
  const lat = evaluateSeries(set.b, tau);
  const radius = evaluateSeries(set.r, tau);
  return [
    radius * Math.cos(lat) * Math.cos(lon),
    radius * Math.cos(lat) * Math.sin(lon),
    radius * Math.sin(lat),
  ];
}

interface Apparent {
  longitude: number;
  latitude: number;
  distanceAu: number;
}

function apparentEcliptic(planet: Planet, jdUt: number): Apparent {
  const jdTt = ttFromUt(jdUt);
  const [xe, ye, ze] = rectangular(EARTH, jdTt);

  // Light-time iteration: see the planet where it WAS, τ = 0.00578·Δ days
  // ago. Two passes converge to far below a milliarcsecond.
  let x = 0;
  let y = 0;
  let z = 0;
  let distance = 0;
  let jdPlanet = jdTt;
  for (let pass = 0; pass < 2; pass += 1) {
    const [xp, yp, zp] = rectangular(SERIES[planet], jdPlanet);
    x = xp - xe;
    y = yp - ye;
    z = zp - ze;
    distance = Math.hypot(x, y, z);
    jdPlanet = jdTt - LIGHT_TIME_DAYS_PER_AU * distance;
  }

  let longitude = normalizeDegrees(radToDeg(Math.atan2(y, x)));
  let latitude = radToDeg(Math.atan2(z, Math.hypot(x, y)));

  // VSOP87 dynamical ecliptic → FK5 (Meeus 32.3), a ~0.09″ tweak.
  const t = j2000Century(jdTt);
  const lonFk5 = degToRad(longitude - 1.397 * t - 0.00031 * t * t);
  const latRad = degToRad(latitude);
  longitude +=
    (-0.09033 +
      0.03916 * (Math.cos(lonFk5) + Math.sin(lonFk5)) * Math.tan(latRad)) /
    3600;
  latitude += (0.03916 * (Math.cos(lonFk5) - Math.sin(lonFk5))) / 3600;

  // Annual aberration (Meeus 23.2) using the geometric Sun and Earth's
  // orbital eccentricity/perihelion (Meeus 23.4).
  const tauEarth = (jdTt - J2000) / 365250;
  const sunLongitude = normalizeDegrees(
    radToDeg(evaluateSeries(EARTH.l, tauEarth)) + 180,
  );
  const eccentricity = 0.016708634 - 0.000042037 * t - 0.0000001267 * t * t;
  const perihelion = 102.93735 + 1.71946 * t + 0.00046 * t * t;
  const sunMinusLon = degToRad(sunLongitude - longitude);
  const periMinusLon = degToRad(perihelion - longitude);
  longitude +=
    ((-ABERRATION_ARCSEC * Math.cos(sunMinusLon) +
      eccentricity * ABERRATION_ARCSEC * Math.cos(periMinusLon)) /
      Math.cos(latRad)) /
    3600;
  latitude +=
    (-ABERRATION_ARCSEC *
      Math.sin(latRad) *
      (Math.sin(sunMinusLon) - eccentricity * Math.sin(periMinusLon))) /
    3600;

  longitude += nutation(jdUt).longitude;

  return {
    longitude: normalizeDegrees(longitude),
    latitude,
    distanceAu: distance,
  };
}

/**
 * Apparent geocentric position of a classical planet, with its daily
 * motion and retrograde flag (central difference over ±0.5 day).
 *
 * @example
 * ```ts
 * planetPosition('saturn', 2449217.71875).retrograde; // true (1993-08-18)
 * ```
 */
export function planetPosition(planet: Planet, jdUt: number): PlanetPosition {
  const now = apparentEcliptic(planet, jdUt);
  const before = apparentEcliptic(planet, jdUt - 0.5).longitude;
  const after = apparentEcliptic(planet, jdUt + 0.5).longitude;
  const speed = normalizeDegrees(after - before + 180) - 180;
  return {
    apparentLongitude: now.longitude,
    latitude: now.latitude,
    distanceAu: now.distanceAu,
    speed,
    retrograde: speed < 0,
  };
}
