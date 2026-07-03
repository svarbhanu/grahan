/**
 * Angle utilities shared by every calculation module.
 */

/**
 * Reduce an angle in degrees to the range [0, 360).
 *
 * @example
 * ```ts
 * normalizeDegrees(-45); // 315
 * ```
 */
export function normalizeDegrees(degrees: number): number {
  const d = degrees % 360;
  return d < 0 ? d + 360 : d;
}

/**
 * Degrees to radians.
 *
 * @example
 * ```ts
 * degToRad(180); // 3.141592653589793
 * ```
 */
export function degToRad(degrees: number): number {
  return (degrees * Math.PI) / 180;
}

/**
 * Radians to degrees.
 *
 * @example
 * ```ts
 * radToDeg(Math.PI); // 180
 * ```
 */
export function radToDeg(radians: number): number {
  return (radians * 180) / Math.PI;
}

/** A degrees–minutes–seconds decomposition; components are non-negative. */
export interface Dms {
  negative: boolean;
  degrees: number;
  minutes: number;
  /** May be fractional. */
  seconds: number;
}

/**
 * Split decimal degrees into degrees, arcminutes, and arcseconds.
 *
 * @example
 * ```ts
 * degreesToDms(23.7681); // { negative: false, degrees: 23, minutes: 46, seconds: 5.16 }
 * ```
 */
export function degreesToDms(deg: number): Dms {
  const negative = deg < 0;
  const abs = Math.abs(deg);
  const degrees = Math.floor(abs);
  const minutesFloat = (abs - degrees) * 60;
  const minutes = Math.floor(minutesFloat);
  const seconds = (minutesFloat - minutes) * 60;
  return { negative, degrees, minutes, seconds };
}

/**
 * Combine degrees, arcminutes, and arcseconds (all non-negative) into
 * decimal degrees.
 *
 * @example
 * ```ts
 * dmsToDegrees(23, 26, 44); // 23.445555…
 * ```
 */
export function dmsToDegrees(
  degrees: number,
  minutes: number,
  seconds: number,
  negative = false,
): number {
  const abs = degrees + minutes / 60 + seconds / 3600;
  return negative ? -abs : abs;
}

/**
 * Format decimal degrees as `D°MM′SS″`, rounding seconds to
 * `secondsDecimals` places (default 0) and carrying overflow.
 *
 * @example
 * ```ts
 * formatDms(23.7681, 1); // "23°46′05.2″"
 * ```
 */
export function formatDms(deg: number, secondsDecimals = 0): string {
  const negative = deg < 0;
  const factor = 10 ** secondsDecimals;
  // Work in rounded second-fractions so 59.9…″ carries into the minute.
  let units = Math.round(Math.abs(deg) * 3600 * factor);
  const perMinute = 60 * factor;
  const perDegree = 3600 * factor;
  const degrees = Math.floor(units / perDegree);
  units -= degrees * perDegree;
  const minutes = Math.floor(units / perMinute);
  const seconds = (units - minutes * perMinute) / factor;
  const secondsText = seconds
    .toFixed(secondsDecimals)
    .padStart(secondsDecimals === 0 ? 2 : 3 + secondsDecimals, '0');
  const sign = negative ? '-' : '';
  const mm = String(minutes).padStart(2, '0');
  return `${sign}${degrees}°${mm}′${secondsText}″`;
}
