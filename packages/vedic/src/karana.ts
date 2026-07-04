/**
 * Karana — the half-tithi: each 6° of Moon−Sun elongation. Four fixed
 * karanas anchor the lunation (Kimstughna opens it, Shakuni/Chatushpada/
 * Naga close it); the seven movable ones cycle through the 56 slots
 * between.
 */

import { normalizeDegrees } from '@grahan/core';
import { FIXED_KARANAS, MOVABLE_KARANAS } from './names.js';

export interface Karana {
  /** Slot 0–59 across the lunation (0 = Kimstughna). */
  index: number;
  name: string;
}

/**
 * Karana at an instant, from apparent Sun/Moon longitudes in degrees.
 *
 * @example
 * ```ts
 * karana(145.28, 150.98); // { index: 0, name: 'Kimstughna' }
 * ```
 */
export function karana(sunLongitude: number, moonLongitude: number): Karana {
  const index = Math.floor(normalizeDegrees(moonLongitude - sunLongitude) / 6);
  const name =
    index === 0
      ? 'Kimstughna'
      : index >= 57
        ? (FIXED_KARANAS[index - 57] ?? '')
        : (MOVABLE_KARANAS[(index - 1) % 7] ?? '');
  return { index, name };
}
