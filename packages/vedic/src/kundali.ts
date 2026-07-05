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
  type Planet,
} from '@grahan/core';
import { lahiriAyanamsa, siderealLongitude } from './ayanamsa.js';
import { nakshatra, type Nakshatra } from './nakshatra.js';
import { navamsaRashi } from './navamsa.js';
import { GRAHA_ORDER, RASHI_NAMES, type Graha } from './names.js';

export interface KundaliOptions {
  /** The exact birth instant. */
  date: Date;
  /** Degrees north-positive. */
  latitude: number;
  /** Degrees east-positive. */
  longitude: number;
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
  /** Apparent backwards motion; always true for Rahu/Ketu (mean node). */
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
  const { date, latitude, longitude } = options;
  const jdUt = julianDayFromDate(date);
  const ayanamsa = lahiriAyanamsa(jdUt);

  const sidereal = (tropical: number): number =>
    siderealLongitude(tropical, jdUt);

  const tropicalByGraha = new Map<Graha, { longitude: number; retrograde: boolean }>();
  tropicalByGraha.set('sun', {
    longitude: sunPosition(jdUt).apparentLongitude,
    retrograde: false,
  });
  tropicalByGraha.set('moon', {
    longitude: moonPosition(jdUt).apparentLongitude,
    retrograde: false,
  });
  for (const planet of CLASSICAL_PLANETS) {
    const position = planetPosition(planet, jdUt);
    tropicalByGraha.set(planet, {
      longitude: position.apparentLongitude,
      retrograde: position.retrograde,
    });
  }
  const rahu = meanLunarNode(jdUt);
  // The mean node regresses ~3′/day, so Rahu/Ketu are always retrograde.
  tropicalByGraha.set('rahu', { longitude: rahu, retrograde: true });
  tropicalByGraha.set('ketu', { longitude: rahu + 180, retrograde: true });

  const lagnaLongitude = sidereal(ascendant(jdUt, latitude, longitude));
  const lagna: RashiPosition = {
    ...rashiPosition(lagnaLongitude),
    nakshatra: nakshatra(lagnaLongitude),
  };

  const grahas: GrahaPosition[] = GRAHA_ORDER.map((graha) => {
    const tropical = tropicalByGraha.get(graha);
    if (tropical === undefined) throw new Error(`missing graha ${graha}`);
    const longitudeSidereal = sidereal(tropical.longitude);
    const base = rashiPosition(longitudeSidereal);
    return {
      ...base,
      nakshatra: nakshatra(longitudeSidereal),
      graha,
      retrograde: tropical.retrograde,
      bhava: ((base.rashi - lagna.rashi + 12) % 12) + 1,
    };
  });

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
