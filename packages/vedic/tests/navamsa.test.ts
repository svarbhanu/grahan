import { describe, expect, it } from 'vitest';
import { navamsaRashi, NAVAMSA_WIDTH } from '../src/index.js';

describe('navamsaRashi', () => {
  it('matches the classical starting rule for movable signs (from itself)', () => {
    // Mesha, Karka, Tula, Makara: first navamsa is the sign itself.
    for (const rashi of [0, 3, 6, 9]) {
      expect(navamsaRashi(rashi * 30)).toBe(rashi);
    }
  });

  it('matches the classical rule for fixed signs (from the 9th)', () => {
    // Vrishabha, Simha, Vrishchika, Kumbha: first navamsa is the 9th sign.
    for (const rashi of [1, 4, 7, 10]) {
      expect(navamsaRashi(rashi * 30)).toBe((rashi + 8) % 12);
    }
  });

  it('matches the classical rule for dual signs (from the 5th)', () => {
    // Mithuna, Kanya, Dhanu, Meena: first navamsa is the 5th sign.
    for (const rashi of [2, 5, 8, 11]) {
      expect(navamsaRashi(rashi * 30)).toBe((rashi + 4) % 12);
    }
  });

  it('every rashi walks through nine consecutive navamsas', () => {
    for (let rashi = 0; rashi < 12; rashi += 1) {
      const first = navamsaRashi(rashi * 30);
      for (let part = 0; part < 9; part += 1) {
        const longitude = rashi * 30 + part * NAVAMSA_WIDTH + 0.01;
        expect(navamsaRashi(longitude)).toBe((first + part) % 12);
      }
    }
  });

  it('places the founder Moon (Simha 7°12′) in Mithuna navamsa', () => {
    expect(navamsaRashi(127.2)).toBe(2);
  });
});
