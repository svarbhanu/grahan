/**
 * Tithi — the lunar day: each 12° of Moon−Sun elongation is one tithi,
 * 30 per lunation (15 waxing, 15 waning). Ayanamsa cancels in the
 * difference, so tropical longitudes are fine.
 */

import { normalizeDegrees } from '@grahan/core';
import { TITHI_NAMES } from './names.js';

export interface Tithi {
  /** 0–29 across the lunation (0 = Shukla Pratipada, 29 = Amavasya). */
  index: number;
  /** Waxing (shukla) or waning (krishna) fortnight. */
  paksha: 'shukla' | 'krishna';
  /** Name within the paksha, e.g. "Pratipada", "Purnima", "Amavasya". */
  name: string;
}

/**
 * Tithi at an instant, from apparent Sun/Moon longitudes in degrees.
 *
 * @example
 * ```ts
 * tithi(145.28, 150.98); // { index: 0, paksha: 'shukla', name: 'Pratipada' }
 * ```
 */
export function tithi(sunLongitude: number, moonLongitude: number): Tithi {
  const elongation = normalizeDegrees(moonLongitude - sunLongitude);
  const index = Math.floor(elongation / 12);
  const name =
    index === 14
      ? 'Purnima'
      : index === 29
        ? 'Amavasya'
        : (TITHI_NAMES[index % 15] ?? '');
  return {
    index,
    paksha: index < 15 ? 'shukla' : 'krishna',
    name,
  };
}
