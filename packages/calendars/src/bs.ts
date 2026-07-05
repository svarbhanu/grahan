/**
 * Bikram Sambat (BS) ↔ Gregorian (AD) conversion, driven by the committed
 * month-length table (bs.data.ts documents its provenance). Both sides are
 * plain calendar dates — no time of day, no timezone — so all arithmetic
 * is integer day counts anchored at Baisakh 1, 1975 BS = 1918-04-13 AD.
 */

import {
  calendarFromJulianDay,
  julianDayFromCalendar,
  zonedTimeFromDate,
} from '@grahan/core';
import {
  BS_EPOCH_AD,
  BS_MAX_YEAR,
  BS_MIN_YEAR,
  BS_MONTH_LENGTHS,
  BS_VERIFIED_THROUGH,
} from './bs.data.js';
import {
  BS_MONTH_NAMES,
  BS_WEEKDAY_NAMES,
  type LocalizedName,
  type WeekdayName,
} from './names.js';

/** A Gregorian calendar date (no time, no timezone attached). */
export interface AdDate {
  year: number;
  /** 1–12 */
  month: number;
  day: number;
}

/** A Bikram Sambat calendar date. */
export interface BsDate {
  year: number;
  /** 1–12, where 1 = Baisakh and 12 = Chaitra */
  month: number;
  day: number;
}

/** Weekday of a calendar day. */
export interface Weekday extends WeekdayName {
  /** 0 = Sunday … 6 = Saturday (the JS `Date#getUTCDay` convention). */
  index: number;
}

/** A BS date decorated with display names and a data-quality flag. */
export interface BsDateInfo extends BsDate {
  monthName: LocalizedName;
  weekday: Weekday;
  /**
   * True for dates after BS_VERIFIED_THROUGH: month lengths there are
   * sankranti-projected rather than authority-published, so a date near a
   * month boundary may be ±1 day off the eventual official calendar.
   */
  projected: boolean;
}

/** An AD date with its weekday. */
export interface AdDateInfo extends AdDate {
  weekday: Weekday;
}

/** Days in each BS year of the table, summed once at load. */
const YEAR_LENGTHS: readonly number[] = BS_MONTH_LENGTHS.map((months) =>
  months.reduce((a, b) => a + b, 0),
);

const TOTAL_DAYS = YEAR_LENGTHS.reduce((a, b) => a + b, 0);

/**
 * Integer day number of an AD date (Julian Day Number at that day's noon).
 * Rejects impossible dates like Feb 30 by round-tripping through the
 * calendar conversion.
 */
function dayNumberFromAd({ year, month, day }: AdDate): number {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month) ||
    !Number.isInteger(day)
  ) {
    throw new RangeError(
      `AD date parts must be integers, got ${year}-${month}-${day}`,
    );
  }
  const jd = julianDayFromCalendar({ year, month, day });
  const back = calendarFromJulianDay(jd);
  if (back.year !== year || back.month !== month || back.day !== day) {
    throw new RangeError(`${year}-${month}-${day} is not a real AD date`);
  }
  return jd + 0.5;
}

const EPOCH_DAY_NUMBER = dayNumberFromAd(BS_EPOCH_AD);

function weekdayFromDayNumber(dayNumber: number): Weekday {
  const index = (dayNumber + 1) % 7;
  const names = BS_WEEKDAY_NAMES[index];
  if (!names) {
    throw new RangeError(`no weekday at index ${index}`);
  }
  return { index, ...names };
}

function toBsDateInfo(bs: BsDate, dayNumber: number): BsDateInfo {
  const monthName = BS_MONTH_NAMES[bs.month - 1];
  if (!monthName) {
    throw new RangeError(`no BS month ${bs.month}`);
  }
  return {
    ...bs,
    monthName,
    weekday: weekdayFromDayNumber(dayNumber),
    projected: bs.year > BS_VERIFIED_THROUGH,
  };
}

/**
 * The Bikram Sambat date of a Gregorian calendar date.
 * Supported range: Baisakh 1, {@link BS_MIN_YEAR} through Chaitra's last
 * day, {@link BS_MAX_YEAR} — throws RangeError outside it.
 *
 * @example
 * ```ts
 * bsFromDate({ year: 1993, month: 8, day: 18 });
 * // { year: 2050, month: 5, day: 2,
 * //   monthName: { roman: 'Bhadra', nepali: 'भदौ' },
 * //   weekday: { index: 3, name: 'Wednesday', roman: 'Budhabar', nepali: 'बुधबार' },
 * //   projected: false }
 * ```
 */
export function bsFromDate(ad: AdDate): BsDateInfo {
  const dayNumber = dayNumberFromAd(ad);
  let rest = dayNumber - EPOCH_DAY_NUMBER;
  if (rest < 0 || rest >= TOTAL_DAYS) {
    throw new RangeError(
      `${ad.year}-${ad.month}-${ad.day} is outside the BS table ` +
        `(${BS_MIN_YEAR}–${BS_MAX_YEAR} BS ≈ 1918-04-13 onward)`,
    );
  }
  let year = BS_MIN_YEAR;
  for (const [i, yearLength] of YEAR_LENGTHS.entries()) {
    if (rest < yearLength) {
      year = BS_MIN_YEAR + i;
      break;
    }
    rest -= yearLength;
  }
  const months = BS_MONTH_LENGTHS[year - BS_MIN_YEAR];
  if (!months) {
    throw new RangeError(`no month table for BS ${year}`);
  }
  for (const [i, monthLength] of months.entries()) {
    if (rest < monthLength) {
      return toBsDateInfo({ year, month: i + 1, day: rest + 1 }, dayNumber);
    }
    rest -= monthLength;
  }
  throw new RangeError(`day offset left over in BS ${year} — corrupt table`);
}

/**
 * The Gregorian date of a Bikram Sambat calendar date. Validates the BS
 * date against the real month lengths (e.g. Baisakh 2062 has 31 days).
 *
 * @example
 * ```ts
 * dateFromBs({ year: 2050, month: 5, day: 2 });
 * // { year: 1993, month: 8, day: 18,
 * //   weekday: { index: 3, name: 'Wednesday', roman: 'Budhabar', nepali: 'बुधबार' } }
 * ```
 */
export function dateFromBs(bs: BsDate): AdDateInfo {
  if (
    !Number.isInteger(bs.year) ||
    !Number.isInteger(bs.month) ||
    !Number.isInteger(bs.day)
  ) {
    throw new RangeError(
      `BS date parts must be integers, got ${bs.year}-${bs.month}-${bs.day}`,
    );
  }
  const months = BS_MONTH_LENGTHS[bs.year - BS_MIN_YEAR];
  if (!months) {
    throw new RangeError(
      `BS year ${bs.year} is outside the table (${BS_MIN_YEAR}–${BS_MAX_YEAR})`,
    );
  }
  const monthLength = months[bs.month - 1];
  if (bs.month < 1 || bs.month > 12 || monthLength === undefined) {
    throw new RangeError(`BS month must be 1–12, got ${bs.month}`);
  }
  if (bs.day < 1 || bs.day > monthLength) {
    const name = BS_MONTH_NAMES[bs.month - 1]?.roman ?? String(bs.month);
    throw new RangeError(
      `${name} ${bs.year} has ${monthLength} days, got day ${bs.day}`,
    );
  }
  let offset = bs.day - 1;
  for (let i = 0; i < bs.month - 1; i++) {
    offset += months[i] ?? 0;
  }
  for (let y = BS_MIN_YEAR; y < bs.year; y++) {
    offset += YEAR_LENGTHS[y - BS_MIN_YEAR] ?? 0;
  }
  const dayNumber = EPOCH_DAY_NUMBER + offset;
  const cal = calendarFromJulianDay(dayNumber - 0.5);
  return {
    year: cal.year,
    month: cal.month,
    day: cal.day,
    weekday: weekdayFromDayNumber(dayNumber),
  };
}

/**
 * Today's Bikram Sambat date — "today" as read on the wall clock of the
 * given IANA timezone, the only place an instant enters the BS API.
 *
 * @example
 * ```ts
 * todayBs({ timezone: 'Asia/Kathmandu' });
 * // on 2026-07-05: { year: 2083, month: 3, day: 21,
 * //   monthName: { roman: 'Asar', nepali: 'असार' }, weekday: { … 'Sunday' … },
 * //   projected: false }
 * ```
 */
export function todayBs(options: { timezone: string }): BsDateInfo {
  const now = zonedTimeFromDate(new Date(), options.timezone);
  return bsFromDate({ year: now.year, month: now.month, day: now.day });
}
