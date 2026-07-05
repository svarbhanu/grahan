/**
 * Muhurta — finding auspicious windows. `abhijitMuhurta()` gives the
 * midday window (the middle 1/15 of daylight); `findMuhurta()` scans a
 * range against configurable panchang rules and merges passing instants
 * into windows.
 */

import {
  julianDayFromDate,
  moonPosition,
  sunPosition,
  sunriseSunset,
  zonedTimeFromDate,
} from '@grahan/core';
import { siderealLongitude } from './ayanamsa.js';
import { nakshatra } from './nakshatra.js';
import { rahuKaal, type RahuKaalWindow } from './rahuKaal.js';
import { tithi } from './tithi.js';
import { vaar } from './vaar.js';
import { yoga } from './yoga.js';

export interface Place {
  latitude: number;
  longitude: number;
  /** IANA zone defining the local calendar date, e.g. "Asia/Kathmandu". */
  timezone: string;
}

export interface MuhurtaWindow {
  start: Date;
  end: Date;
}

export interface MuhurtaRules {
  /** Exclude the day's Rahu Kaal. Default true. */
  avoidRahuKaal?: boolean;
  /** Only accept instants between sunrise and sunset. Default true. */
  daylightOnly?: boolean;
  /** Accepted vaar indices (0 = Sunday), unrestricted when omitted. */
  allowedVaars?: readonly number[];
  /** Accepted tithi indices 0–29, unrestricted when omitted. */
  allowedTithis?: readonly number[];
  /** Accepted nakshatra indices 0–26, unrestricted when omitted. */
  allowedNakshatras?: readonly number[];
  /** Accepted yoga indices 0–26, unrestricted when omitted. */
  allowedYogas?: readonly number[];
}

export interface FindMuhurtaOptions extends Place {
  from: Date;
  to: Date;
  rules?: MuhurtaRules;
  /** Scan resolution in minutes; window edges snap to it. Default 5. */
  stepMinutes?: number;
}

interface DayContext {
  sunrise: Date | null;
  sunset: Date | null;
  rahu: RahuKaalWindow | null;
}

function dayContext(date: Date, place: Place): DayContext {
  const local = zonedTimeFromDate(date, place.timezone);
  const events = sunriseSunset({
    year: local.year,
    month: local.month,
    day: local.day,
    latitude: place.latitude,
    longitude: place.longitude,
    timezone: place.timezone,
  });
  const sunrise = events.sunrise.kind === 'rises' ? events.sunrise.date : null;
  const sunset = events.sunset.kind === 'rises' ? events.sunset.date : null;
  const rahu =
    sunrise !== null && sunset !== null
      ? rahuKaal({
          sunrise,
          sunset,
          weekday: vaar(sunset, place.timezone, sunrise).index,
        })
      : null;
  return { sunrise, sunset, rahu };
}

/**
 * Abhijit muhurta — the middle 1/15 of daylight (about 24 minutes around
 * local solar noon), or null on polar days without a sunrise/sunset pair.
 *
 * @example
 * ```ts
 * abhijitMuhurta(new Date('2026-07-02T06:00:00Z'),
 *   { latitude: 27.7172, longitude: 85.324, timezone: 'Asia/Kathmandu' });
 * // ≈ { start: 11:40 NPT, end: 12:35 NPT } (a 55-min 1/15 of a 13.8-h day)
 * ```
 */
export function abhijitMuhurta(date: Date, place: Place): MuhurtaWindow | null {
  const { sunrise, sunset } = dayContext(date, place);
  if (sunrise === null || sunset === null) return null;
  const daylightMs = sunset.getTime() - sunrise.getTime();
  const centerMs = sunrise.getTime() + daylightMs / 2;
  return {
    start: new Date(centerMs - daylightMs / 30),
    end: new Date(centerMs + daylightMs / 30),
  };
}

function passes(
  date: Date,
  place: Place,
  rules: MuhurtaRules,
  day: DayContext,
): boolean {
  const {
    avoidRahuKaal = true,
    daylightOnly = true,
    allowedVaars,
    allowedTithis,
    allowedNakshatras,
    allowedYogas,
  } = rules;
  const time = date.getTime();
  if (daylightOnly) {
    if (day.sunrise === null || day.sunset === null) return false;
    if (time < day.sunrise.getTime() || time > day.sunset.getTime())
      return false;
  }
  if (avoidRahuKaal && day.rahu !== null) {
    if (time >= day.rahu.start.getTime() && time < day.rahu.end.getTime())
      return false;
  }
  if (
    allowedVaars !== undefined &&
    !allowedVaars.includes(
      vaar(date, place.timezone, day.sunrise ?? date).index,
    )
  )
    return false;

  if (
    allowedTithis === undefined &&
    allowedNakshatras === undefined &&
    allowedYogas === undefined
  )
    return true;
  const jdUt = julianDayFromDate(date);
  const sun = sunPosition(jdUt).apparentLongitude;
  const moon = moonPosition(jdUt).apparentLongitude;
  if (
    allowedTithis !== undefined &&
    !allowedTithis.includes(tithi(sun, moon).index)
  )
    return false;
  const siderealSun = siderealLongitude(sun, jdUt);
  const siderealMoon = siderealLongitude(moon, jdUt);
  if (
    allowedNakshatras !== undefined &&
    !allowedNakshatras.includes(nakshatra(siderealMoon).index)
  )
    return false;
  if (
    allowedYogas !== undefined &&
    !allowedYogas.includes(yoga(siderealSun, siderealMoon).index)
  )
    return false;
  return true;
}

/**
 * Scan `[from, to]` and return the windows where every rule holds.
 * Edges are quantized to `stepMinutes`, so treat them as ±step accurate.
 *
 * @example
 * ```ts
 * findMuhurta({
 *   from, to, latitude: 27.7172, longitude: 85.324,
 *   timezone: 'Asia/Kathmandu',
 *   rules: { avoidRahuKaal: true, allowedVaars: [1, 3, 4, 5] },
 * }); // → [{ start, end }, …] daylight windows outside Rahu Kaal
 * ```
 */
export function findMuhurta(options: FindMuhurtaOptions): MuhurtaWindow[] {
  const { from, to, rules = {}, stepMinutes = 5 } = options;
  const place: Place = {
    latitude: options.latitude,
    longitude: options.longitude,
    timezone: options.timezone,
  };
  const stepMs = stepMinutes * 60_000;
  const days = new Map<string, DayContext>();
  const windows: MuhurtaWindow[] = [];
  let openStart: Date | null = null;

  for (let ms = from.getTime(); ms <= to.getTime(); ms += stepMs) {
    const instant = new Date(ms);
    const local = zonedTimeFromDate(instant, place.timezone);
    const key = `${local.year}-${local.month}-${local.day}`;
    let day = days.get(key);
    if (day === undefined) {
      day = dayContext(instant, place);
      days.set(key, day);
    }
    if (passes(instant, place, rules, day)) {
      openStart ??= instant;
    } else if (openStart !== null) {
      windows.push({ start: openStart, end: instant });
      openStart = null;
    }
  }
  if (openStart !== null) windows.push({ start: openStart, end: to });
  return windows;
}
