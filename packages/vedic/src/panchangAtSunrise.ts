/**
 * `panchangAtSunrise()` — the panchang the way calendars print it: a
 * civil date labelled by its sunrise elements, each with the instant it
 * ends ("Tritiya upto 14:37, then Chaturthi").
 *
 * Every element type returns the **ordered list of spans touching the
 * vedic day** (sunrise to next sunrise), never a single squashed value.
 * That renders kshaya and vriddhi honestly: a skipped (kshaya) tithi
 * shows up as a middle span that begins and ends inside the window; a
 * doubled (vriddhi) tithi is a single span whose end lies past the next
 * sunrise.
 */

import {
  calendarFromJulianDay,
  dateFromJulianDay,
  dateFromZonedTime,
  julianDayFromCalendar,
  julianDayFromDate,
  moonPhase,
  moonPosition,
  sunPosition,
  sunriseSunset,
  type MoonPhase,
} from '@grahan/core';
import { siderealLongitude } from './ayanamsa.js';
import {
  karanaEndTime,
  nakshatraEndTime,
  tithiEndTime,
  yogaEndTime,
} from './endTimes.js';
import { karana, type Karana } from './karana.js';
import { nakshatra, type Nakshatra } from './nakshatra.js';
import { rahuKaal, type RahuKaalWindow } from './rahuKaal.js';
import { tithi, type Tithi } from './tithi.js';
import { vaar, type Vaar } from './vaar.js';
import { yoga, type Yoga } from './yoga.js';

export interface PanchangAtSunriseOptions {
  /** Civil calendar date in `timezone`. */
  year: number;
  /** 1–12. */
  month: number;
  day: number;
  /** Degrees north-positive. */
  latitude: number;
  /** Degrees east-positive. */
  longitude: number;
  /** IANA zone that defines the civil date, e.g. "Asia/Kathmandu". */
  timezone: string;
}

/** An element together with the span it occupies in the day's window. */
export type ElementSpan<T> = T & {
  /** Instant the element began; null if already running at window start. */
  startsAt: Date | null;
  /** True end instant — may fall past the window end (a "26:15" on calendars). */
  endsAt: Date;
};

export interface PanchangAtSunrise {
  /** Weekday of the sunrise-to-sunrise vedic day. */
  vaar: Vaar;
  /** 'normal' days have a sunrise; polar days/nights do not (see window). */
  daylight: 'normal' | 'always-up' | 'always-down';
  sunrise: Date | null;
  sunset: Date | null;
  /**
   * The listing window. Normal days: this date's sunrise to the next
   * date's sunrise (or +24 h if the next date has none). Polar
   * days/nights: local midnight to the next local midnight.
   */
  window: { start: Date; end: Date };
  /** Ordered spans; `[0]` is the sunrise element — the day's label. */
  tithi: ElementSpan<Tithi>[];
  nakshatra: ElementSpan<Nakshatra>[];
  yoga: ElementSpan<Yoga>[];
  karana: ElementSpan<Karana>[];
  rahuKaal: RahuKaalWindow | null;
  /** Moon phase at the window start. */
  moonPhase: MoonPhase;
}

/** Crossings closer than this to the window end belong to the next day. */
const WINDOW_EDGE_EPS = 1e-6; // of a day, ≈ 0.09 s

function longitudes(jdUt: number) {
  const sun = sunPosition(jdUt).apparentLongitude;
  const moon = moonPosition(jdUt).apparentLongitude;
  return {
    sun,
    moon,
    siderealSun: siderealLongitude(sun, jdUt),
    siderealMoon: siderealLongitude(moon, jdUt),
  };
}

/** Walk one element type's boundary crossings across the window. */
function spansOf<T extends object>(
  evaluate: (jdUt: number) => T,
  endTime: (jdUt: number) => number,
  jdStart: number,
  jdEnd: number,
): ElementSpan<T>[] {
  const result: ElementSpan<T>[] = [];
  let t = jdStart;
  let startsAt: Date | null = null;
  // A karana lasts ≥ ~9.5 h, so even that fits ≤ 4 spans in a window.
  for (let i = 0; i < 10; i++) {
    const end = endTime(t);
    result.push({ ...evaluate(t), startsAt, endsAt: dateFromJulianDay(end) });
    if (end >= jdEnd - WINDOW_EDGE_EPS) break;
    startsAt = dateFromJulianDay(end);
    t = end + WINDOW_EDGE_EPS; // step just past the boundary
  }
  return result;
}

function nextCivilDate(options: PanchangAtSunriseOptions) {
  const { year, month, day } = options;
  return calendarFromJulianDay(julianDayFromCalendar({ year, month, day }) + 1);
}

/**
 * The sunrise-labelled panchang of a civil date: elements at sunrise
 * plus every transition touching the vedic day.
 *
 * @example
 * ```ts
 * const p = panchangAtSunrise({
 *   year: 2026, month: 7, day: 2,
 *   latitude: 27.7172, longitude: 85.324, timezone: 'Asia/Kathmandu',
 * });
 * // p.vaar.name     → 'Thursday'
 * // p.tithi[0].name → 'Dwitiya' (krishna), upto p.tithi[0].endsAt 09:53 NPT
 * // p.tithi[1].name → 'Tritiya' — the label of the *next* civil day
 * ```
 */
export function panchangAtSunrise(
  options: PanchangAtSunriseOptions,
): PanchangAtSunrise {
  const { year, month, day, latitude, longitude, timezone } = options;
  // sunriseSunset validates the civil date, latitude, and longitude.
  const events = sunriseSunset({
    year,
    month,
    day,
    latitude,
    longitude,
    timezone,
  });
  const sunrise = events.sunrise.kind === 'rises' ? events.sunrise.date : null;
  const sunset = events.sunset.kind === 'rises' ? events.sunset.date : null;
  const daylight =
    sunrise !== null && sunset !== null
      ? 'normal'
      : events.sunrise.kind === 'rises'
        ? 'normal'
        : events.sunrise.kind;

  let windowStart: Date;
  let windowEnd: Date;
  if (sunrise !== null) {
    windowStart = sunrise;
    const next = nextCivilDate(options);
    const nextEvents = sunriseSunset({
      year: next.year,
      month: next.month,
      day: next.day,
      latitude,
      longitude,
      timezone,
    });
    windowEnd =
      nextEvents.sunrise.kind === 'rises'
        ? nextEvents.sunrise.date
        : dateFromJulianDay(julianDayFromDate(sunrise) + 1);
  } else {
    // Polar day/night: the vedic day degenerates to the civil day.
    const next = nextCivilDate(options);
    const midnight = { hour: 0, minute: 0, second: 0 };
    windowStart = dateFromZonedTime(
      { year, month, day, ...midnight },
      timezone,
    );
    windowEnd = dateFromZonedTime(
      { year: next.year, month: next.month, day: next.day, ...midnight },
      timezone,
    );
  }
  const jdStart = julianDayFromDate(windowStart);
  const jdEnd = julianDayFromDate(windowEnd);

  const vaarResult = vaar(windowStart, timezone, sunrise ?? windowStart);
  const rahuKaalResult =
    sunrise !== null && sunset !== null
      ? rahuKaal({
          sunrise,
          sunset,
          weekday: vaar(sunset, timezone, sunrise).index,
        })
      : null;

  return {
    vaar: vaarResult,
    daylight,
    sunrise,
    sunset,
    window: { start: windowStart, end: windowEnd },
    tithi: spansOf(
      (jd) => {
        const lon = longitudes(jd);
        return tithi(lon.sun, lon.moon);
      },
      tithiEndTime,
      jdStart,
      jdEnd,
    ),
    nakshatra: spansOf(
      (jd) => nakshatra(longitudes(jd).siderealMoon),
      nakshatraEndTime,
      jdStart,
      jdEnd,
    ),
    yoga: spansOf(
      (jd) => {
        const lon = longitudes(jd);
        return yoga(lon.siderealSun, lon.siderealMoon);
      },
      yogaEndTime,
      jdStart,
      jdEnd,
    ),
    karana: spansOf(
      (jd) => {
        const lon = longitudes(jd);
        return karana(lon.sun, lon.moon);
      },
      karanaEndTime,
      jdStart,
      jdEnd,
    ),
    rahuKaal: rahuKaalResult,
    moonPhase: moonPhase(jdStart),
  };
}
