import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ascendant, midheaven } from '../src/index.js';
import { angleDiff, errorStats, reportStats } from './helpers/stats.js';

interface AscendantRow {
  jdUt: number;
  lat: number;
  lon: number;
  ascendant: number;
  midheaven: number;
}

const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/ascendant.json', import.meta.url), 'utf8'),
) as { data: AscendantRow[] };

// The ascendant moves ~1°/4 min of clock time, so time error dominates.
// ±0.01° keeps the lagna's whole-sign house assignment safe everywhere.
const BUDGET_DEG = 0.01;

describe('ascendant/midheaven vs swisseph (4 sites × 42 instants)', () => {
  it(`ascendant within ±${BUDGET_DEG}° everywhere (1.4°N–60°N)`, () => {
    const errors = fixture.data.map((row) =>
      angleDiff(ascendant(row.jdUt, row.lat, row.lon), row.ascendant),
    );
    const stats = errorStats(errors);
    reportStats('ascendant', stats);
    expect(stats.maxAbsDeg).toBeLessThan(BUDGET_DEG);
  });

  it(`midheaven within ±${BUDGET_DEG}° everywhere`, () => {
    const errors = fixture.data.map((row) =>
      angleDiff(midheaven(row.jdUt, row.lon), row.midheaven),
    );
    const stats = errorStats(errors);
    reportStats('midheaven', stats);
    expect(stats.maxAbsDeg).toBeLessThan(BUDGET_DEG);
  });

  it('ascendant is 90° of zodiac ahead of the MC in longitude order', () => {
    // Not literally 90°, but the asc must always lie in the half-turn of
    // the zodiac after the MC (houses 10 → 1 rise in sequence).
    for (const row of fixture.data) {
      const gap =
        (((ascendant(row.jdUt, row.lat, row.lon) -
          midheaven(row.jdUt, row.lon)) %
          360) +
          360) %
        360;
      expect(gap).toBeGreaterThan(0);
      expect(gap).toBeLessThan(180);
    }
  });
});
