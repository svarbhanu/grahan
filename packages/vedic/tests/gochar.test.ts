import { describe, expect, it } from 'vitest';
import { kundali, transits } from '../src/index.js';

const NATAL = kundali({
  date: new Date('1993-08-18T05:15:00Z'),
  latitude: 27.0104,
  longitude: 84.8821,
});

describe('transits', () => {
  it('at the birth instant reproduces the natal placements', () => {
    const now = transits({ date: new Date('1993-08-18T05:15:00Z'), natal: NATAL });
    expect(now).toHaveLength(9);
    for (const [index, transit] of now.entries()) {
      const natal = NATAL.grahas[index];
      expect(transit.graha).toBe(natal?.graha);
      expect(transit.rashi).toBe(natal?.rashi);
      expect(transit.bhavaFromLagna).toBe(natal?.bhava);
      expect(Math.abs(transit.longitude - (natal?.longitude ?? 0))).toBeLessThan(
        1e-9,
      );
    }
  });

  it('counts houses from the natal Moon (chandra lagna)', () => {
    const now = transits({ date: new Date('1993-08-18T05:15:00Z'), natal: NATAL });
    const byGraha = new Map(now.map((t) => [t.graha, t]));
    // Natal Moon is in Simha; Sun also in Simha → 1st from Moon;
    // Saturn in Kumbha → 7th from Moon.
    expect(byGraha.get('sun')?.bhavaFromMoon).toBe(1);
    expect(byGraha.get('moon')?.bhavaFromMoon).toBe(1);
    expect(byGraha.get('saturn')?.bhavaFromMoon).toBe(7);
  });

  it('a 2026 transit puts every graha in a valid house from both lagnas', () => {
    const now = transits({ date: new Date('2026-07-04T12:00:00Z'), natal: NATAL });
    for (const transit of now) {
      expect(transit.bhavaFromLagna).toBeGreaterThanOrEqual(1);
      expect(transit.bhavaFromLagna).toBeLessThanOrEqual(12);
      expect(transit.bhavaFromMoon).toBeGreaterThanOrEqual(1);
      expect(transit.bhavaFromMoon).toBeLessThanOrEqual(12);
      expect(transit.rashiName).not.toBe('');
    }
  });
});
