import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { lahiriAyanamsa, siderealLongitude } from '../src/index.js';

interface AyanamsaFixture {
  data: { jdUt: number; lahiri: number }[];
}

const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/ayanamsa.json', import.meta.url), 'utf8'),
) as AyanamsaFixture;

describe('lahiriAyanamsa vs swisseph (41 epochs, 1900–2100)', () => {
  it('matches within 0.36″ everywhere', () => {
    for (const row of fixture.data) {
      expect(Math.abs(lahiriAyanamsa(row.jdUt) - row.lahiri)).toBeLessThan(
        0.0001,
      );
    }
  });

  it('reproduces the founder-chart value 23.7681°', () => {
    expect(lahiriAyanamsa(2449217.71875)).toBeCloseTo(23.768087, 4);
  });
});

describe('siderealLongitude', () => {
  it('subtracts the ayanamsa and wraps', () => {
    const jd = 2449217.71875;
    expect(siderealLongitude(145.280987, jd)).toBeCloseTo(121.5129, 3);
    expect(siderealLongitude(10, jd)).toBeCloseTo(10 - 23.768087 + 360, 4);
  });
});
