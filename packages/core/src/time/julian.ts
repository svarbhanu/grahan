/**
 * Julian day conversions (Meeus, Astronomical Algorithms 2nd ed., ch. 7).
 *
 * The Julian day (JD) is a continuous count of days since noon on
 * -4712-01-01 (Julian calendar). All astronomy math in grahan runs on JD
 * so that calendars and timezones stay out of the inner loops.
 */

/** JD of the Unix epoch, 1970-01-01T00:00:00Z. */
const UNIX_EPOCH_JD = 2440587.5;

const MS_PER_DAY = 86_400_000;

/** JD of the standard epoch J2000.0 (2000-01-01T12:00:00 TT). */
export const J2000 = 2451545.0;

/**
 * A calendar date whose day may be fractional (12.5 = noon on the 12th).
 * Dates before 1582-10-15 are interpreted in the Julian calendar, matching
 * historical usage and Meeus's conventions.
 */
export interface CalendarDate {
  year: number;
  /** 1–12 */
  month: number;
  /** 1–31, may be fractional */
  day: number;
}

/**
 * Julian day of a JavaScript `Date` (which is always an instant in UTC).
 *
 * @example
 * ```ts
 * julianDayFromDate(new Date(Date.UTC(2000, 0, 1, 12))); // 2451545 (J2000.0)
 * ```
 */
export function julianDayFromDate(date: Date): number {
  return date.getTime() / MS_PER_DAY + UNIX_EPOCH_JD;
}

/**
 * The `Date` (UTC instant) of a Julian day, rounded to the millisecond.
 *
 * @example
 * ```ts
 * dateFromJulianDay(2451545).toISOString(); // "2000-01-01T12:00:00.000Z"
 * ```
 */
export function dateFromJulianDay(jd: number): Date {
  return new Date(Math.round((jd - UNIX_EPOCH_JD) * MS_PER_DAY));
}

/**
 * Julian day of a calendar date (Meeus eq. 7.1). Valid for any year;
 * dates from 1582-10-15 on are Gregorian, earlier ones Julian.
 *
 * @example
 * ```ts
 * julianDayFromCalendar({ year: 1957, month: 10, day: 4.81 }); // 2436116.31
 * ```
 */
export function julianDayFromCalendar({
  year,
  month,
  day,
}: CalendarDate): number {
  let y = year;
  let m = month;
  if (m <= 2) {
    y -= 1;
    m += 12;
  }
  const isGregorian =
    year > 1582 ||
    (year === 1582 && (month > 10 || (month === 10 && day >= 15)));
  let b = 0;
  if (isGregorian) {
    const a = Math.floor(y / 100);
    b = 2 - a + Math.floor(a / 4);
  }
  return (
    Math.floor(365.25 * (y + 4716)) +
    Math.floor(30.6001 * (m + 1)) +
    day +
    b -
    1524.5
  );
}

/**
 * Calendar date of a Julian day (Meeus ch. 7, inverse algorithm).
 * Returns Gregorian dates from 1582-10-15 on, Julian before.
 *
 * @example
 * ```ts
 * calendarFromJulianDay(2436116.31); // { year: 1957, month: 10, day: 4.81 }
 * ```
 */
export function calendarFromJulianDay(jd: number): CalendarDate {
  const z = Math.floor(jd + 0.5);
  const f = jd + 0.5 - z;
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e) + f;
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  return { year, month, day };
}

/**
 * Julian centuries since J2000.0 — the time variable `T` used by nearly
 * every series expansion in Meeus and VSOP87.
 *
 * @example
 * ```ts
 * j2000Century(2446895.5); // -0.127296372348 (Meeus example 12.a)
 * ```
 */
export function j2000Century(jd: number): number {
  return (jd - J2000) / 36525;
}
