/**
 * Gochar (transits) — where the nine grahas stand right now, read against
 * a natal chart: houses are counted whole-sign both from the natal lagna
 * and from the natal Moon (chandra lagna), as jyotish practice does.
 */

import { julianDayFromDate } from '@grahan/core';
import {
  grahaSiderealPositions,
  type Kundali,
  type NodeKind,
} from './kundali.js';
import { nakshatra, type Nakshatra } from './nakshatra.js';
import { RASHI_NAMES, type Graha } from './names.js';

export interface TransitOptions {
  /** The instant to read the sky for. */
  date: Date;
  /** The natal chart the transit is judged against. */
  natal: Kundali;
  /** Rahu/Ketu from the mean (default) or true osculating node. */
  node?: NodeKind;
}

export interface TransitPosition {
  graha: Graha;
  /** Sidereal longitude now, degrees [0, 360). */
  longitude: number;
  rashi: number;
  rashiName: string;
  degreeInRashi: number;
  nakshatra: Nakshatra;
  retrograde: boolean;
  /** Whole-sign house from the natal lagna, 1–12. */
  bhavaFromLagna: number;
  /** Whole-sign house from the natal Moon's rashi, 1–12. */
  bhavaFromMoon: number;
}

/**
 * Current graha positions relative to a natal chart.
 *
 * @example
 * ```ts
 * const natal = kundali({ date: birth, latitude, longitude });
 * const now = transits({ date: new Date(), natal });
 * // now[6] → Saturn's rashi today + its house from lagna and from Moon
 * ```
 */
export function transits(options: TransitOptions): TransitPosition[] {
  const { date, natal, node = 'mean' } = options;
  const natalMoon = natal.grahas.find((graha) => graha.graha === 'moon');
  const moonRashi = natalMoon?.rashi ?? natal.lagna.rashi;

  return grahaSiderealPositions(julianDayFromDate(date), node).map(
    (position) => {
      const rashi = Math.floor(position.longitude / 30);
      return {
        graha: position.graha,
        longitude: position.longitude,
        rashi,
        rashiName: RASHI_NAMES[rashi] ?? '',
        degreeInRashi: position.longitude - rashi * 30,
        nakshatra: nakshatra(position.longitude),
        retrograde: position.retrograde,
        bhavaFromLagna: ((rashi - natal.lagna.rashi + 12) % 12) + 1,
        bhavaFromMoon: ((rashi - moonRashi + 12) % 12) + 1,
      };
    },
  );
}
