import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { DASHA_ORDER, DASHA_YEARS, vimshottari } from '../src/index.js';

const founder = JSON.parse(
  readFileSync(
    new URL('../fixtures/founder-chart.json', import.meta.url),
    'utf8',
  ),
) as { data: { bodiesSidereal: Record<string, number> } };

const BIRTH = new Date('1993-08-18T05:15:00Z');
const MOON = founder.data.bodiesSidereal['moon'] ?? Number.NaN;
const DAY_MS = 86_400_000;
const YEAR_MS = 365.25 * DAY_MS;

describe('vimshottari (founder golden values from CLAUDE.md)', () => {
  const v = vimshottari(MOON, BIRTH);

  it('Moon in Magha starts a Ketu mahadasha with ≈3.22 years balance', () => {
    expect(v.birthLord).toBe('ketu');
    expect(v.balanceYears).toBeCloseTo(3.22, 1);
  });

  it('the Moon mahadasha begins 2022-11-05 ±1 day', () => {
    const moonMd = v.mahadashas[3];
    expect(moonMd?.lord).toBe('moon');
    const expected = Date.UTC(2022, 10, 5);
    expect(Math.abs((moonMd?.start.getTime() ?? 0) - expected)).toBeLessThan(
      1.5 * DAY_MS,
    );
  });

  it('mahadashas chain seamlessly in Vimshottari order', () => {
    expect(v.mahadashas).toHaveLength(9);
    expect(v.mahadashas[0]?.start.getTime()).toBe(BIRTH.getTime());
    for (let i = 1; i < v.mahadashas.length; i += 1) {
      expect(v.mahadashas[i]?.start.getTime()).toBe(
        v.mahadashas[i - 1]?.end.getTime(),
      );
      expect(v.mahadashas[i]?.lord).toBe(
        DASHA_ORDER[(DASHA_ORDER.indexOf('ketu') + i) % 9],
      );
    }
  });

  it('full mahadashas run their canonical years', () => {
    for (const md of v.mahadashas.slice(1)) {
      const years = (md.end.getTime() - md.start.getTime()) / YEAR_MS;
      expect(years).toBeCloseTo(DASHA_YEARS[md.lord] ?? Number.NaN, 6);
    }
  });

  it('antardashas start from the mahadasha lord and tile the period', () => {
    for (const [i, md] of v.mahadashas.entries()) {
      if (i > 0) {
        expect(md.antardashas).toHaveLength(9);
        expect(md.antardashas[0]?.lord).toBe(md.lord);
        expect(md.antardashas[0]?.start.getTime()).toBe(md.start.getTime());
      }
      const last = md.antardashas[md.antardashas.length - 1];
      expect(last?.end.getTime()).toBeCloseTo(md.end.getTime(), -4);
      for (let j = 1; j < md.antardashas.length; j += 1) {
        expect(md.antardashas[j]?.start.getTime()).toBe(
          md.antardashas[j - 1]?.end.getTime(),
        );
      }
    }
  });

  it('the birth mahadasha keeps only what remains, antars clipped to birth', () => {
    const first = v.mahadashas[0];
    const spanYears =
      ((first?.end.getTime() ?? 0) - (first?.start.getTime() ?? 0)) / YEAR_MS;
    expect(spanYears).toBeCloseTo(v.balanceYears, 6);
    expect(first?.antardashas[0]?.start.getTime()).toBe(BIRTH.getTime());
    expect(first && first.antardashas.length).toBeLessThan(10);
  });

  it('the nine dasha years sum to 120', () => {
    const total = DASHA_ORDER.reduce(
      (sum, lord) => sum + (DASHA_YEARS[lord] ?? 0),
      0,
    );
    expect(total).toBe(120);
  });
});
