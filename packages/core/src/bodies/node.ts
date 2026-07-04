/**
 * Mean ascending node of the lunar orbit (Meeus ch. 47) — in Vedic
 * astrology this is Rahu; Ketu sits exactly opposite.
 */

import { normalizeDegrees } from '../math/angles.js';
import { ttFromUt } from '../time/deltaT.js';
import { j2000Century } from '../time/julian.js';
import { nutation } from '../earth/nutation.js';

/**
 * Mean longitude of the Moon's ascending node, degrees [0, 360), referred
 * to the true equinox of date (nutation applied) so it lives in the same
 * frame as the apparent Sun/Moon longitudes. The mean node regresses
 * through the zodiac in ≈ 18.6 years.
 *
 * @example
 * ```ts
 * meanLunarNode(2451545); // ≈ 125.07 at J2000
 * ```
 */
export function meanLunarNode(jdUt: number): number {
  const t = j2000Century(ttFromUt(jdUt));
  const meanNode =
    125.0445479 -
    1934.1362891 * t +
    0.0020754 * t ** 2 +
    t ** 3 / 467441 -
    t ** 4 / 60616000;
  return normalizeDegrees(meanNode + nutation(jdUt).longitude);
}
