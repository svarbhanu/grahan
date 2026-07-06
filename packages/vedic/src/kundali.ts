/**
 * `kundali()` — the sidereal birth chart: nine grahas, the lagna, and
 * whole-sign bhavas, with nakshatra and navamsa (D9) placements.
 *
 * The Date is the exact birth instant (a JS Date is always UTC inside);
 * no timezone is needed because nothing here depends on the local
 * calendar date — only on the instant and the place.
 */

import {
  ascendant,
  julianDayFromDate,
  meanLunarNode,
  moonPosition,
  normalizeDegrees,
  planetPosition,
  sunPosition,
  trueLunarNode,
  wrap180,
  type Planet,
} from '@grahan/core';
import { lahiriAyanamsa, siderealLongitude } from './ayanamsa.js';
import { nakshatra, type Nakshatra } from './nakshatra.js';
import { navamsaRashi } from './navamsa.js';
import { GRAHA_ORDER, RASHI_NAMES, type Graha } from './names.js';

/** Which lunar node stands in for Rahu/Ketu. */
export type NodeKind = 'mean' | 'true';

export interface KundaliOptions {
  /** The exact birth instant. */
  date: Date;
  /** Degrees north-positive. */
  latitude: number;
  /** Degrees east-positive. */
  longitude: number;
  /**
   * Rahu/Ketu from the mean node (default, smooth regression) or the
   * true osculating node (wobbles ±1.7° around it, briefly direct).
   */
  node?: NodeKind;
}

export interface RashiPosition {
  /** Sidereal ecliptic longitude, degrees [0, 360). */
  longitude: number;
  /** Rashi index 0–11 (0 = Mesha). */
  rashi: number;
  rashiName: string;
  /** Degrees into the rashi, [0, 30). */
  degreeInRashi: number;
  nakshatra: Nakshatra;
  /** Navamsa (D9) rashi index 0–11. */
  navamsaRashi: number;
}

export interface GrahaPosition extends RashiPosition {
  graha: Graha;
  /**
   * Apparent backwards motion. Always true for the mean node's
   * Rahu/Ketu; the true node runs direct for short stretches.
   */
  retrograde: boolean;
  /** Whole-sign house 1–12, counted from the lagna's rashi. */
  bhava: number;
}

export interface Bhava {
  /** House number 1–12. */
  bhava: number;
  rashi: number;
  rashiName: string;
  /** Grahas occupying this house. */
  grahas: Graha[];
}

export interface Kundali {
  /** Lahiri ayanamsa at the instant, degrees. */
  ayanamsa: number;
  lagna: RashiPosition;
  /** All nine grahas in conventional order (Sun … Ketu). */
  grahas: GrahaPosition[];
  /** The twelve whole-sign houses, house 1 = the lagna's rashi. */
  bhavas: Bhava[];
}

const CLASSICAL_PLANETS: readonly Planet[] = [
  'mars',
  'mercury',
  'jupiter',
  'venus',
  'saturn',
];

export interface GrahaLongitude {
  graha: Graha;
  /** Sidereal (Lahiri) ecliptic longitude, degrees [0, 360). */
  longitude: number;
  retrograde: boolean;
}

/**
 * Sidereal longitudes and retrograde flags of all nine grahas at an
 * instant — the shared engine behind `kundali()` and `transits()`.
 *
 * @example
 * ```ts
 * grahaSiderealPositions(2449217.71875)[1];
 * // { graha: 'moon', longitude: ≈127.20, retrograde: false }
 * ```
 */
export function grahaSiderealPositions(
  jdUt: number,
  node: NodeKind = 'mean',
): GrahaLongitude[] {
  const sidereal = (tropical: number): number =>
    siderealLongitude(tropical, jdUt);
  const positions = new Map<Graha, GrahaLongitude>();
  positions.set('sun', {
    graha: 'sun',
    longitude: sidereal(sunPosition(jdUt).apparentLongitude),
    retrograde: false,
  });
  positions.set('moon', {
    graha: 'moon',
    longitude: sidereal(moonPosition(jdUt).apparentLongitude),
    retrograde: false,
  });
  for (const planet of CLASSICAL_PLANETS) {
    const position = planetPosition(planet, jdUt);
    positions.set(planet, {
      graha: planet,
      longitude: sidereal(position.apparentLongitude),
      retrograde: position.retrograde,
    });
  }
  const rahu = node === 'true' ? trueLunarNode(jdUt) : meanLunarNode(jdUt);
  // The mean node regresses ~3′/day, so it is always retrograde; the
  // true node has to be checked — it briefly runs direct.
  const nodeRetrograde =
    node === 'true' ? wrap180(trueLunarNode(jdUt + 0.5) - rahu) < 0 : true;
  positions.set('rahu', {
    graha: 'rahu',
    longitude: sidereal(rahu),
    retrograde: nodeRetrograde,
  });
  positions.set('ketu', {
    graha: 'ketu',
    longitude: sidereal(rahu + 180),
    retrograde: nodeRetrograde,
  });
  return GRAHA_ORDER.map((graha) => {
    const value = positions.get(graha);
    if (value === undefined) throw new Error(`missing graha ${graha}`);
    return value;
  });
}

function rashiPosition(longitude: number): Omit<RashiPosition, 'nakshatra'> {
  const normalized = normalizeDegrees(longitude);
  const rashi = Math.floor(normalized / 30);
  return {
    longitude: normalized,
    rashi,
    rashiName: RASHI_NAMES[rashi] ?? '',
    degreeInRashi: normalized - rashi * 30,
    navamsaRashi: navamsaRashi(normalized),
  };
}

/**
 * Compute the sidereal kundali for a birth instant and place.
 *
 * @example
 * ```ts
 * const k = kundali({
 *   date: new Date('1993-08-18T05:15:00Z'), // 11:00 NPT
 *   latitude: 27.0104,
 *   longitude: 84.8821,
 * });
 * // k.lagna.rashiName          → 'Tula' (Libra 11°47′)
 * // k.grahas[1].nakshatra.name → 'Magha' (Moon), pada 3
 * // k.grahas[6].retrograde     → true   (Saturn)
 * ```
 */
export function kundali(options: KundaliOptions): Kundali {
  const { date, latitude, longitude, node = 'mean' } = options;
  const jdUt = julianDayFromDate(date);
  const ayanamsa = lahiriAyanamsa(jdUt);

  const lagnaLongitude = siderealLongitude(
    ascendant(jdUt, latitude, longitude),
    jdUt,
  );
  const lagna: RashiPosition = {
    ...rashiPosition(lagnaLongitude),
    nakshatra: nakshatra(lagnaLongitude),
  };

  const grahas: GrahaPosition[] = grahaSiderealPositions(jdUt, node).map(
    (position) => {
      const base = rashiPosition(position.longitude);
      return {
        ...base,
        nakshatra: nakshatra(position.longitude),
        graha: position.graha,
        retrograde: position.retrograde,
        bhava: ((base.rashi - lagna.rashi + 12) % 12) + 1,
      };
    },
  );

  const bhavas: Bhava[] = Array.from({ length: 12 }, (_, index) => {
    const rashi = (lagna.rashi + index) % 12;
    return {
      bhava: index + 1,
      rashi,
      rashiName: RASHI_NAMES[rashi] ?? '',
      grahas: grahas
        .filter((graha) => graha.rashi === rashi)
        .map((graha) => graha.graha),
    };
  });

  return { ayanamsa, lagna, grahas, bhavas };
}
