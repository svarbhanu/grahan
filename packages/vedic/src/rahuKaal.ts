/**
 * Rahu Kaal — the inauspicious eighth of daylight, whose position in the
 * day is indexed by the weekday.
 */

export interface RahuKaalOptions {
  sunrise: Date;
  sunset: Date;
  /** 0 = Sunday … 6 = Saturday. */
  weekday: number;
}

export interface RahuKaalWindow {
  start: Date;
  end: Date;
}

/** Which eighth of daylight (1-based) Rahu rules, indexed Sunday–Saturday. */
const SEGMENT_BY_WEEKDAY: readonly number[] = [8, 2, 7, 5, 6, 4, 3];

/**
 * The Rahu Kaal window between a day's sunrise and sunset.
 *
 * @example
 * ```ts
 * rahuKaal({
 *   sunrise: new Date('2026-07-01T23:26:37Z'), // 05:12 NPT
 *   sunset: new Date('2026-07-02T13:18:46Z'), // 19:04 NPT
 *   weekday: 4, // Thursday → 6th eighth
 * });
 * // { start: 13:51 NPT, end: 15:35 NPT }
 * ```
 */
export function rahuKaal(options: RahuKaalOptions): RahuKaalWindow {
  const { sunrise, sunset, weekday } = options;
  const segment = SEGMENT_BY_WEEKDAY[weekday];
  if (!Number.isInteger(weekday) || segment === undefined) {
    throw new RangeError(`weekday must be an integer 0–6, got ${weekday}`);
  }
  const eighthMs = (sunset.getTime() - sunrise.getTime()) / 8;
  const startMs = sunrise.getTime() + (segment - 1) * eighthMs;
  return { start: new Date(startMs), end: new Date(startMs + eighthMs) };
}
