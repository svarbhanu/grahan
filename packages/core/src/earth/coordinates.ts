/**
 * Coordinate transformations between the ecliptic and equatorial frames
 * (Meeus ch. 13).
 */

import { degToRad, normalizeDegrees, radToDeg } from '../math/angles.js';

export interface EquatorialCoordinates {
  /** Right ascension α, degrees [0, 360). */
  rightAscension: number;
  /** Declination δ, degrees [−90, 90]. */
  declination: number;
}

/**
 * Ecliptic longitude/latitude → right ascension/declination
 * (Meeus eq. 13.3 and 13.4).
 *
 * @example
 * ```ts
 * equatorialFromEcliptic(113.21563, 6.68417, 23.4392911);
 * // ≈ { rightAscension: 116.32894, declination: 28.02618 } (Meeus ex. 13.a)
 * ```
 */
export function equatorialFromEcliptic(
  longitude: number,
  latitude: number,
  obliquity: number,
): EquatorialCoordinates {
  const lon = degToRad(longitude);
  const lat = degToRad(latitude);
  const eps = degToRad(obliquity);
  const rightAscension = Math.atan2(
    Math.sin(lon) * Math.cos(eps) - Math.tan(lat) * Math.sin(eps),
    Math.cos(lon),
  );
  const declination = Math.asin(
    Math.sin(lat) * Math.cos(eps) +
      Math.cos(lat) * Math.sin(eps) * Math.sin(lon),
  );
  return {
    rightAscension: normalizeDegrees(radToDeg(rightAscension)),
    declination: radToDeg(declination),
  };
}
