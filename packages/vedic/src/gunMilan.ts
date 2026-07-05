/**
 * Gun-milan (ashtakoota) — the classical 36-point match between two Moon
 * positions: varna 1, vashya 2, tara 3, yoni 4, graha-maitri 5, gana 6,
 * bhakoot 7, nadi 8. Inputs are the two sidereal Moon longitudes; a
 * matched pair with itself always scores 28 (nadi and none else lost).
 */

import { normalizeDegrees } from '@grahan/core';
import { NAKSHATRA_WIDTH } from './nakshatra.js';
import {
  FRIENDSHIP,
  GANA_BY_NAKSHATRA,
  LORD_BY_RASHI,
  NADI_BY_NAKSHATRA,
  VARNA_BY_RASHI,
  VASHYA_ORDER,
  VASHYA_SCORES,
  YONI_BY_NAKSHATRA,
  YONI_ORDER,
  YONI_SCORES,
  type Vashya,
} from './gunMilan.data.js';

export interface Koota {
  points: number;
  maximum: number;
  /** The classified values behind the score, bride first. */
  bride: string;
  groom: string;
}

export interface GunMilan {
  total: number;
  maximum: number;
  kootas: {
    varna: Koota;
    vashya: Koota;
    tara: Koota;
    yoni: Koota;
    grahaMaitri: Koota;
    gana: Koota;
    bhakoot: Koota;
    nadi: Koota;
  };
}

const VARNA_NAMES = ['Shudra', 'Vaishya', 'Kshatriya', 'Brahmin'] as const;
const BAD_TARA = new Set([3, 5, 7]);
const BAD_BHAKOOT = new Set(['2/12', '5/9', '6/8']);

/** Vashya class of a sidereal longitude (Dhanu and Makara split in half). */
function vashyaOf(longitude: number): Vashya {
  const rashi = Math.floor(longitude / 30);
  const firstHalf = longitude - rashi * 30 < 15;
  if (rashi === 8) return firstHalf ? 'manava' : 'chatushpada'; // Dhanu
  if (rashi === 9) return firstHalf ? 'chatushpada' : 'jalachara'; // Makara
  const byRashi: readonly Vashya[] = [
    'chatushpada', 'chatushpada', 'manava', 'jalachara', 'vanachara',
    'manava', 'manava', 'keeta', 'manava', 'jalachara', 'manava', 'jalachara',
  ];
  return byRashi[rashi] ?? 'manava';
}

function relation(lord: string, other: string): 'friend' | 'enemy' | 'neutral' {
  const entry = FRIENDSHIP[lord];
  if (entry === undefined) return 'neutral';
  if (entry.friends.includes(other)) return 'friend';
  if (entry.enemies.includes(other)) return 'enemy';
  return 'neutral';
}

function maitriPoints(brideLord: string, groomLord: string): number {
  if (brideLord === groomLord) return 5;
  const pair = [relation(brideLord, groomLord), relation(groomLord, brideLord)]
    .sort()
    .join('+');
  switch (pair) {
    case 'friend+friend':
      return 5;
    case 'friend+neutral':
      return 4;
    case 'neutral+neutral':
      return 3;
    case 'enemy+friend':
      return 1;
    case 'enemy+neutral':
      return 0.5;
    default:
      return 0; // enemy+enemy
  }
}

/** Tara count from one nakshatra to another, folded to 1–9 (0 → 9). */
function taraRemainder(from: number, to: number): number {
  const count = ((to - from + 27) % 27) + 1;
  const remainder = count % 9;
  return remainder === 0 ? 9 : remainder;
}

/**
 * Ashtakoota compatibility of two Moons (sidereal longitudes, degrees).
 *
 * @example
 * ```ts
 * const match = gunMilan(342.5, 127.2); // bride Revati, groom Magha
 * // match.total        → 11 (of 36)
 * // match.kootas.nadi  → { points: 0, … } both Antya nadi
 * ```
 */
export function gunMilan(
  brideMoonSidereal: number,
  groomMoonSidereal: number,
): GunMilan {
  const bride = normalizeDegrees(brideMoonSidereal);
  const groom = normalizeDegrees(groomMoonSidereal);
  const brideRashi = Math.floor(bride / 30);
  const groomRashi = Math.floor(groom / 30);
  const brideNak = Math.floor(bride / NAKSHATRA_WIDTH);
  const groomNak = Math.floor(groom / NAKSHATRA_WIDTH);

  const brideVarna = VARNA_BY_RASHI[brideRashi] ?? 0;
  const groomVarna = VARNA_BY_RASHI[groomRashi] ?? 0;
  const varna: Koota = {
    points: groomVarna >= brideVarna ? 1 : 0,
    maximum: 1,
    bride: VARNA_NAMES[brideVarna] ?? '',
    groom: VARNA_NAMES[groomVarna] ?? '',
  };

  const brideVashya = vashyaOf(bride);
  const groomVashya = vashyaOf(groom);
  const vashya: Koota = {
    points:
      VASHYA_SCORES[VASHYA_ORDER.indexOf(groomVashya)]?.[
        VASHYA_ORDER.indexOf(brideVashya)
      ] ?? 0,
    maximum: 2,
    bride: brideVashya,
    groom: groomVashya,
  };

  const taraFromBride = taraRemainder(brideNak, groomNak);
  const taraFromGroom = taraRemainder(groomNak, brideNak);
  const tara: Koota = {
    points:
      (BAD_TARA.has(taraFromBride) ? 0 : 1.5) +
      (BAD_TARA.has(taraFromGroom) ? 0 : 1.5),
    maximum: 3,
    bride: `tara ${taraFromBride}`,
    groom: `tara ${taraFromGroom}`,
  };

  const brideYoni = YONI_BY_NAKSHATRA[brideNak] ?? 'horse';
  const groomYoni = YONI_BY_NAKSHATRA[groomNak] ?? 'horse';
  const yoni: Koota = {
    points:
      YONI_SCORES[YONI_ORDER.indexOf(brideYoni)]?.[
        YONI_ORDER.indexOf(groomYoni)
      ] ?? 0,
    maximum: 4,
    bride: brideYoni,
    groom: groomYoni,
  };

  const brideLord = LORD_BY_RASHI[brideRashi] ?? 'sun';
  const groomLord = LORD_BY_RASHI[groomRashi] ?? 'sun';
  const grahaMaitri: Koota = {
    points: maitriPoints(brideLord, groomLord),
    maximum: 5,
    bride: brideLord,
    groom: groomLord,
  };

  const brideGana = GANA_BY_NAKSHATRA[brideNak] ?? 'deva';
  const groomGana = GANA_BY_NAKSHATRA[groomNak] ?? 'deva';
  const ganaPair = [brideGana, groomGana].sort().join('+');
  const gana: Koota = {
    points:
      brideGana === groomGana
        ? 6
        : ganaPair === 'deva+manushya'
          ? 5
          : ganaPair === 'deva+rakshasa'
            ? 1
            : 0,
    maximum: 6,
    bride: brideGana,
    groom: groomGana,
  };

  const stepsApart = [
    ((groomRashi - brideRashi + 12) % 12) + 1,
    ((brideRashi - groomRashi + 12) % 12) + 1,
  ].sort((a, b) => a - b);
  const bhakoot: Koota = {
    points: BAD_BHAKOOT.has(`${stepsApart[0]}/${stepsApart[1]}`) ? 0 : 7,
    maximum: 7,
    bride: `rashi ${brideRashi + 1}`,
    groom: `rashi ${groomRashi + 1}`,
  };

  const brideNadi = NADI_BY_NAKSHATRA[brideNak] ?? 'adi';
  const groomNadi = NADI_BY_NAKSHATRA[groomNak] ?? 'adi';
  const nadi: Koota = {
    points: brideNadi === groomNadi ? 0 : 8,
    maximum: 8,
    bride: brideNadi,
    groom: groomNadi,
  };

  const kootas = { varna, vashya, tara, yoni, grahaMaitri, gana, bhakoot, nadi };
  const total = Object.values(kootas).reduce(
    (sum, koota) => sum + koota.points,
    0,
  );
  return { total, maximum: 36, kootas };
}
