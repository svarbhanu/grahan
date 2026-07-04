import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { moonPosition } from '../src/index.js';
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

// Published tolerance is ±0.05°. The truncated Meeus series shows ~10″ mean
// error (its stated intrinsic accuracy — a coefficient typo would inflate
// this) with a truncation tail observed up to ~65″ across 1900–2100, so we
// assert 0.025° — still twice as tight as the promise.
const BUDGET_DEG = 0.025;

describe('moonPosition vs swisseph (120 instants, 1900–2100)', () => {
  it(`apparent longitude within ±${BUDGET_DEG}° everywhere`, () => {
    const errors = fixture.data.map((row) =>
      angleDiff(moonPosition(row.jdUt).apparentLongitude, row.moon),
    );
    const stats = errorStats(errors);
    reportStats('moon apparent longitude', stats);
    expect(stats.maxAbsDeg).toBeLessThan(BUDGET_DEG);
  });

  it('returns plausible latitude and distance', () => {
    for (const row of fixture.data) {
      const { latitude, distanceKm } = moonPosition(row.jdUt);
      expect(Math.abs(latitude)).toBeLessThan(5.4);
      expect(distanceKm).toBeGreaterThan(356000);
      expect(distanceKm).toBeLessThan(407000);
    }
  });
});
