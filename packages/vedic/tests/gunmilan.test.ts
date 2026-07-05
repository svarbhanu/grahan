import { describe, expect, it } from 'vitest';
import {
  gunMilan,
  NAKSHATRA_WIDTH,
  VASHYA_SCORES,
  YONI_ORDER,
  YONI_SCORES,
} from '../src/index.js';

/** Longitude in the middle of a nakshatra. */
function nak(index: number): number {
  return (index + 0.5) * NAKSHATRA_WIDTH;
}

describe('gunMilan tables (structural invariants)', () => {
  it('yoni matrix is symmetric with a perfect diagonal', () => {
    for (let i = 0; i < YONI_ORDER.length; i += 1) {
      expect(YONI_SCORES[i]?.[i]).toBe(4);
      for (let j = 0; j < YONI_ORDER.length; j += 1) {
        expect(YONI_SCORES[i]?.[j]).toBe(YONI_SCORES[j]?.[i]);
      }
    }
  });

  it('the seven sworn-enemy yoni pairs score zero', () => {
    const enemies: [string, string][] = [
      ['horse', 'buffalo'],
      ['elephant', 'lion'],
      ['sheep', 'monkey'],
      ['serpent', 'mongoose'],
      ['dog', 'deer'],
      ['cat', 'rat'],
      ['cow', 'tiger'],
    ];
    for (const [a, b] of enemies) {
      const i = YONI_ORDER.indexOf(a as (typeof YONI_ORDER)[number]);
      const j = YONI_ORDER.indexOf(b as (typeof YONI_ORDER)[number]);
      expect(YONI_SCORES[i]?.[j]).toBe(0);
    }
  });

  it('vashya matrix is symmetric', () => {
    for (let i = 0; i < VASHYA_SCORES.length; i += 1) {
      for (let j = 0; j < VASHYA_SCORES.length; j += 1) {
        expect(VASHYA_SCORES[i]?.[j]).toBe(VASHYA_SCORES[j]?.[i]);
      }
    }
  });
});

describe('gunMilan scoring', () => {
  it('any Moon matched with itself scores exactly 28 (loses only nadi)', () => {
    for (let longitude = 2; longitude < 360; longitude += 17.3) {
      const match = gunMilan(longitude, longitude);
      expect(match.total).toBe(28);
      expect(match.kootas.nadi.points).toBe(0);
    }
  });

  it('worked example: bride Revati (Meena), groom Magha (Simha) → 11/36', () => {
    const match = gunMilan(nak(26), nak(9));
    expect(match.kootas.varna.points).toBe(0); // Brahmin bride, Kshatriya groom
    expect(match.kootas.vashya.points).toBe(0); // jalachara vs vanachara
    expect(match.kootas.tara.points).toBe(3); // 11 → 2 and 18 → 9, both good
    expect(match.kootas.yoni.points).toBe(2); // elephant vs rat
    expect(match.kootas.grahaMaitri.points).toBe(5); // Jupiter & Sun, mutual friends
    expect(match.kootas.gana.points).toBe(1); // deva vs rakshasa
    expect(match.kootas.bhakoot.points).toBe(0); // Meena/Simha are 6/8
    expect(match.kootas.nadi.points).toBe(0); // both antya
    expect(match.total).toBe(11);
  });

  it('cat–rat yonis (Punarvasu × Magha) score zero on yoni', () => {
    const match = gunMilan(nak(6), nak(9));
    expect(match.kootas.yoni.bride).toBe('cat');
    expect(match.kootas.yoni.groom).toBe('rat');
    expect(match.kootas.yoni.points).toBe(0);
  });

  it('different nadis earn the full 8', () => {
    // Ashwini (adi) with Bharani (madhya).
    const match = gunMilan(nak(0), nak(1));
    expect(match.kootas.nadi.points).toBe(8);
  });

  it('every koota stays within its maximum across a longitude sweep', () => {
    for (let bride = 1; bride < 360; bride += 41.7) {
      for (let groom = 3; groom < 360; groom += 53.9) {
        const match = gunMilan(bride, groom);
        let sum = 0;
        for (const koota of Object.values(match.kootas)) {
          expect(koota.points).toBeGreaterThanOrEqual(0);
          expect(koota.points).toBeLessThanOrEqual(koota.maximum);
          sum += koota.points;
        }
        expect(match.total).toBe(sum);
        expect(match.total).toBeLessThanOrEqual(36);
      }
    }
  });
});
