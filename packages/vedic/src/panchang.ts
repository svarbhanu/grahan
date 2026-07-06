/**
 * `panchang()` — the five limbs of the Vedic day, plus sunrise, sunset,
 * Rahu Kaal, and moon phase, for one instant at one place.
 *
 * Semantics: elements (tithi, nakshatra, yoga, karana) are computed **at
 * the given instant**, not frozen at sunrise. The vaar follows the vedic
 * sunrise-to-sunrise day; sunrise/sunset/Rahu Kaal belong to the instant's
 * local calendar date in `timezone`.
 */

import {
  assertLatitude,
  assertLongitude,
  julianDayFromDate,
  moonPhase,
  moonPosition,
  sunPosition,
  sunriseSunset,
  zonedTimeFromDate,
  type MoonPhase,
} from '@grahan/core';
import { siderealLongitude } from './ayanamsa.js';
import { karana, type Karana } from './karana.js';
import { nakshatra, type Nakshatra } from './nakshatra.js';
import { rahuKaal, type RahuKaalWindow } from './rahuKaal.js';
import { tithi, type Tithi } from './tithi.js';
import { vaar, type Vaar } from './vaar.js';
import { yoga, type Yoga } from './yoga.js';

export interface PanchangOptions {
  /** The instant to compute for (a JS Date is always an exact UTC instant). */
  date: Date;
  /** Degrees north-positive. */
  latitude: number;
  /** Degrees east-positive. */
  longitude: number;
  /** IANA zone that defines the local calendar date, e.g. "Asia/Kathmandu". */
  timezone: string;
}

export interface Panchang {
  vaar: Vaar;
  tithi: Tithi;
  nakshatra: Nakshatra;
  yoga: Yoga;
  karana: Karana;
  /** 'normal' days have sunrise/sunset; polar days/nights do not. */
  daylight: 'normal' | 'always-up' | 'always-down';
  /** Local-date sunrise, or null on polar days/nights. */
  sunrise: Date | null;
  sunset: Date | null;
  /** Weekday-indexed eighth of daylight; null when there is no daylight cycle. */
  rahuKaal: RahuKaalWindow | null;
  moonPhase: MoonPhase;
}

/**
 * Compute the panchang for an instant at a location.
 *
 * @example
 * ```ts
 * const p = panchang({
 *   date: new Date('1993-08-18T05:15:00Z'), // 11:00 NPT
 *   latitude: 27.0104,
 *   longitude: 84.8821,
 *   timezone: 'Asia/Kathmandu',
 * });
 * // p.tithi   → { index: 0, paksha: 'shukla', name: 'Pratipada' }
 * // p.nakshatra → { index: 9, name: 'Magha', pada: 3 }
 * // p.vaar.name → 'Wednesday'
 * ```
 */
export function panchang(options: PanchangOptions): Panchang {
  const { date, latitude, longitude, timezone } = options;
  assertLatitude(latitude);
  assertLongitude(longitude);
  const jdUt = julianDayFromDate(date);

  const sunLongitude = sunPosition(jdUt).apparentLongitude;
  const moonLongitude = moonPosition(jdUt).apparentLongitude;
  const siderealSun = siderealLongitude(sunLongitude, jdUt);
  const siderealMoon = siderealLongitude(moonLongitude, jdUt);

  const local = zonedTimeFromDate(date, timezone);
  const events = sunriseSunset({
    year: local.year,
    month: local.month,
    day: local.day,
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

  // Without a sunrise the vedic day degenerates to the civil day.
  const vaarResult = vaar(date, timezone, sunrise ?? date);
  const rahuKaalResult =
    sunrise !== null && sunset !== null
      ? rahuKaal({
          sunrise,
          sunset,
          // Rahu Kaal belongs to the local calendar date's own vaar (the
          // window is inside daylight, where vedic and civil days agree).
          weekday: vaar(sunset, timezone, sunrise).index,
        })
      : null;

  return {
    vaar: vaarResult,
    tithi: tithi(sunLongitude, moonLongitude),
    nakshatra: nakshatra(siderealMoon),
    yoga: yoga(siderealSun, siderealMoon),
    karana: karana(sunLongitude, moonLongitude),
    daylight,
    sunrise,
    sunset,
    rahuKaal: rahuKaalResult,
    moonPhase: moonPhase(jdUt),
  };
}
