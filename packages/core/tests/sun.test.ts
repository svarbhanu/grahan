import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sunPosition } from '../src/index.js';
import { angleDiff, errorStats, reportStats } from './helpers/stats.js';

interface SunMoonFixture {
  data: { jdUt: number; sun: number; moon: number; meanNode: number }[];
}

const fixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/sun-moon-longitudes.json', import.meta.url),
    'utf8',
  ),
) as SunMoonFixture;

// Published tolerance is ±0.01°; we hold ourselves to half of it so a
// regression is visible long before the promise breaks.
const BUDGET_DEG = 0.005;

describe('sunPosition vs swisseph (120 instants, 1900–2100)', () => {
  it(`apparent longitude within ±${BUDGET_DEG}° everywhere`, () => {
    const errors = fixture.data.map((row) =>
      angleDiff(sunPosition(row.jdUt).apparentLongitude, row.sun),
    );
    const stats = errorStats(errors);
    reportStats('sun apparent longitude', stats);
    expect(stats.maxAbsDeg).toBeLessThan(BUDGET_DEG);
  });

  it('returns a plausible Earth–Sun distance', () => {
    for (const row of fixture.data) {
      const { distanceAu } = sunPosition(row.jdUt);
      expect(distanceAu).toBeGreaterThan(0.983);
      expect(distanceAu).toBeLessThan(1.017);
    }
  });
});
