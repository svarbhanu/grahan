/**
 * IANA timezone conversions at the API boundary, built on `Intl` (ECMA-402,
 * available in every supported runtime) so grahan stays zero-dependency.
 * All internal math is UTC; these helpers exist only to translate a user's
 * wall-clock input and to render results back into their zone.
 *
 * Limits: years 100–9999 CE, whole-second precision.
 */

/** A wall-clock reading in some timezone (no offset attached). */
export interface ZonedDateTime {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
  /** 0–23 */
  hour: number;
  minute: number;
  second: number;
}

const formatters = new Map<string, Intl.DateTimeFormat>();

function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let f = formatters.get(timeZone);
  if (!f) {
    // Constructing the formatter validates the zone name (throws RangeError).
    f = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    formatters.set(timeZone, f);
  }
  return f;
}

/** Wall-clock digits reassembled as if they were UTC, in epoch ms. */
function wallClockAsUtcMs(z: ZonedDateTime): number {
  if (z.year < 100) {
    // Date.UTC maps years 0–99 to 1900–1999; refuse rather than corrupt.
    throw new RangeError(
      `year ${z.year} is below the supported range (100–9999 CE)`,
    );
  }
  return Date.UTC(z.year, z.month - 1, z.day, z.hour, z.minute, z.second);
}

/**
 * The wall clock shown in `timeZone` at a given instant.
 *
 * @example
 * ```ts
 * zonedTimeFromDate(new Date('1993-08-18T05:15:00Z'), 'Asia/Kathmandu');
 * // { year: 1993, month: 8, day: 18, hour: 11, minute: 0, second: 0 }
 * ```
 */
export function zonedTimeFromDate(date: Date, timeZone: string): ZonedDateTime {
  const parts = formatterFor(timeZone).formatToParts(date);
  const read = (type: Intl.DateTimeFormatPartTypes): number => {
    const part = parts.find((p) => p.type === type);
    if (!part) {
      throw new Error(`Intl returned no "${type}" part for zone ${timeZone}`);
    }
    return Number(part.value);
  };
  return {
    year: read('year'),
    month: read('month'),
    day: read('day'),
    hour: read('hour'),
    minute: read('minute'),
    second: read('second'),
  };
}

/**
 * UTC offset of `timeZone` at a given instant, in minutes (east positive).
 *
 * @example
 * ```ts
 * utcOffsetMinutes('Asia/Kathmandu', new Date('2026-07-02T00:00:00Z')); // 345
 * ```
 */
export function utcOffsetMinutes(timeZone: string, date: Date): number {
  const wallMs = wallClockAsUtcMs(zonedTimeFromDate(date, timeZone));
  // The wall clock is whole-second; compare against the instant floored to a second.
  const instantMs = Math.floor(date.getTime() / 1000) * 1000;
  return Math.round((wallMs - instantMs) / 60000);
}

/**
 * The UTC instant at which `timeZone` shows the given wall clock.
 * DST edges: a nonexistent time (spring-forward gap) maps to a real instant
 * within an hour of the gap; an ambiguous time (fall-back) resolves to the
 * earlier of the two instants.
 *
 * @example
 * ```ts
 * dateFromZonedTime(
 *   { year: 1993, month: 8, day: 18, hour: 11, minute: 0, second: 0 },
 *   'Asia/Kathmandu',
 * ).toISOString(); // "1993-08-18T05:15:00.000Z"
 * ```
 */
export function dateFromZonedTime(
  zoned: ZonedDateTime,
  timeZone: string,
): Date {
  const wallMs = wallClockAsUtcMs(zoned);
  // utc = wall − offset, but the offset depends on the utc instant we are
  // looking for — so start from the wall digits and refine twice.
  let utcMs = wallMs - utcOffsetMinutes(timeZone, new Date(wallMs)) * 60000;
  utcMs = wallMs - utcOffsetMinutes(timeZone, new Date(utcMs)) * 60000;
  return new Date(utcMs);
}
