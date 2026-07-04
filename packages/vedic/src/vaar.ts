/**
 * Vaar — the vedic weekday. Unlike the civil day, the vedic day runs from
 * sunrise to sunrise: an instant before today's sunrise still belongs to
 * yesterday's vaar.
 */

import { julianDayFromCalendar, zonedTimeFromDate } from '@grahan/core';
import { VAAR_NAMES, WEEKDAY_NAMES } from './names.js';

const MS_PER_DAY = 86_400_000;

export interface Vaar {
  /** 0 = Sunday … 6 = Saturday. */
  index: number;
  /** English weekday name. */
  name: string;
  /** Sanskrit vaar name, e.g. "Budhavaar". */
  vaar: string;
}

/**
 * The vaar an instant belongs to, given that location's local sunrise for
 * the instant's civil date.
 *
 * @example
 * ```ts
 * vaar(new Date('1993-08-18T05:15:00Z'), 'Asia/Kathmandu', sunriseDate);
 * // { index: 3, name: 'Wednesday', vaar: 'Budhavaar' }
 * ```
 */
export function vaar(date: Date, timezone: string, sunrise: Date): Vaar {
  // Before sunrise the vedic day hasn't turned over yet.
  const civil =
    date.getTime() < sunrise.getTime()
      ? new Date(date.getTime() - MS_PER_DAY)
      : date;
  const local = zonedTimeFromDate(civil, timezone);
  const jdMidnight = julianDayFromCalendar({
    year: local.year,
    month: local.month,
    day: local.day,
  });
  // JD 0.5 (noon-anchored) + 1.5 lands integer day counts on 0 = Sunday.
  const index = Math.round(jdMidnight + 1.5) % 7;
  return {
    index,
    name: WEEKDAY_NAMES[index] ?? '',
    vaar: VAAR_NAMES[index] ?? '',
  };
}
