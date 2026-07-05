/**
 * Vimshottari dasha — the 120-year planetary period cycle, seeded by the
 * Moon's nakshatra at birth. Years are 365.25 days (the panchang-software
 * convention); periods already elapsed at birth are omitted, and the
 * antardasha running at birth is clipped to start at the birth instant.
 */

import { normalizeDegrees } from '@grahan/core';
import { NAKSHATRA_WIDTH } from './nakshatra.js';
import type { Graha } from './names.js';

/** Mahadasha lords in Vimshottari order, starting from Ashwini's lord. */
export const DASHA_ORDER: readonly Graha[] = [
  'ketu',
  'venus',
  'sun',
  'moon',
  'mars',
  'rahu',
  'jupiter',
  'saturn',
  'mercury',
];

/** Mahadasha lengths in years; the nine sum to 120. */
export const DASHA_YEARS: Readonly<Record<string, number>> = {
  ketu: 7,
  venus: 20,
  sun: 6,
  moon: 10,
  mars: 7,
  rahu: 18,
  jupiter: 16,
  saturn: 19,
  mercury: 17,
};

const YEAR_MS = 365.25 * 86_400_000;
const CYCLE_YEARS = 120;

export interface DashaPeriod {
  lord: Graha;
  start: Date;
  end: Date;
}

export interface Mahadasha extends DashaPeriod {
  antardashas: DashaPeriod[];
}

export interface Vimshottari {
  /** Lord of the mahadasha running at birth. */
  birthLord: Graha;
  /** Years of the birth mahadasha remaining at birth (365.25-day years). */
  balanceYears: number;
  /** One full cycle from birth: the clipped birth mahadasha + 8 more. */
  mahadashas: Mahadasha[];
}

function lordYears(lord: Graha): number {
  return DASHA_YEARS[lord] ?? 0;
}

function antardashas(
  lord: Graha,
  fullStartMs: number,
  clipMs: number,
): DashaPeriod[] {
  // Antardashas cycle in dasha order starting from the mahadasha's own
  // lord, each scaled to (its years / 120) of the mahadasha.
  const periods: DashaPeriod[] = [];
  const startIndex = DASHA_ORDER.indexOf(lord);
  let cursorMs = fullStartMs;
  for (let i = 0; i < DASHA_ORDER.length; i += 1) {
    const sub = DASHA_ORDER[(startIndex + i) % DASHA_ORDER.length];
    if (sub === undefined) continue;
    const lengthMs =
      ((lordYears(lord) * lordYears(sub)) / CYCLE_YEARS) * YEAR_MS;
    const endMs = cursorMs + lengthMs;
    if (endMs > clipMs) {
      periods.push({
        lord: sub,
        start: new Date(Math.max(cursorMs, clipMs)),
        end: new Date(endMs),
      });
    }
    cursorMs = endMs;
  }
  return periods;
}

/**
 * The Vimshottari dasha timeline for a birth.
 *
 * @example
 * ```ts
 * const v = vimshottari(127.2033, new Date('1993-08-18T05:15:00Z'));
 * // v.birthLord     → 'ketu'   (Moon in Magha)
 * // v.balanceYears  → ≈3.218
 * // v.mahadashas[3] → { lord: 'moon', start: ≈2022-11-05, … }
 * ```
 */
export function vimshottari(
  moonSiderealLongitude: number,
  birth: Date,
): Vimshottari {
  const longitude = normalizeDegrees(moonSiderealLongitude);
  const nakshatraIndex = Math.floor(longitude / NAKSHATRA_WIDTH);
  const elapsedFraction =
    (longitude - nakshatraIndex * NAKSHATRA_WIDTH) / NAKSHATRA_WIDTH;

  const startIndex = nakshatraIndex % DASHA_ORDER.length;
  const birthLord = DASHA_ORDER[startIndex] ?? 'ketu';
  const balanceYears = lordYears(birthLord) * (1 - elapsedFraction);

  const birthMs = birth.getTime();
  const mahadashas: Mahadasha[] = [];
  // The birth mahadasha theoretically began before birth; antardasha
  // boundaries are anchored to that theoretical start.
  let fullStartMs = birthMs - lordYears(birthLord) * elapsedFraction * YEAR_MS;
  for (let i = 0; i < DASHA_ORDER.length; i += 1) {
    const lord = DASHA_ORDER[(startIndex + i) % DASHA_ORDER.length];
    if (lord === undefined) continue;
    const endMs = fullStartMs + lordYears(lord) * YEAR_MS;
    mahadashas.push({
      lord,
      start: new Date(Math.max(fullStartMs, birthMs)),
      end: new Date(endMs),
      antardashas: antardashas(lord, fullStartMs, birthMs),
    });
    fullStartMs = endMs;
  }

  return { birthLord, balanceYears, mahadashas };
}
