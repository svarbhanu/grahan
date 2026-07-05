import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { planetPosition, type Planet } from '../src/index.js';
import { angleDiff, errorStats, reportStats } from './helpers/stats.js';

type PlanetRow = { jdUt: number } & Record<string, number>;

const fixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/planet-longitudes.json', import.meta.url),
    'utf8',
  ),
) as { data: PlanetRow[] };

const PLANETS: Planet[] = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];

// Published tolerance is ±0.02°; we hold ourselves to half of it so a
// regression is visible long before the promise breaks.
const BUDGET_DEG = 0.01;

// Near a station the sign of a ~0 speed is numerically arbitrary; only
// compare retrograde flags when swisseph says the motion is decisive.
const STATION_DEG_PER_DAY = 0.005;

describe('planetPosition vs swisseph (120 instants, 1900–2100)', () => {
  for (const planet of PLANETS) {
    it(`${planet}: apparent longitude within ±${BUDGET_DEG}° everywhere`, () => {
      const errors = fixture.data.map((row) =>
        angleDiff(
          planetPosition(planet, row.jdUt).apparentLongitude,
          row[planet] ?? Number.NaN,
        ),
      );
      const stats = errorStats(errors);
      reportStats(`${planet} apparent longitude`, stats);
      expect(stats.maxAbsDeg).toBeLessThan(BUDGET_DEG);
    });

    it(`${planet}: retrograde flag matches swisseph speed sign`, () => {
      for (const row of fixture.data) {
        const reference = row[`${planet}Speed`] ?? Number.NaN;
        if (Math.abs(reference) < STATION_DEG_PER_DAY) continue;
        const { retrograde, speed } = planetPosition(planet, row.jdUt);
        expect(retrograde, `${planet} @ jd ${row.jdUt}`).toBe(reference < 0);
        expect(Math.abs(speed - reference)).toBeLessThan(0.01);
      }
    });
  }

  it('mercury retrogrades a plausible number of times across 2026', () => {
    // Mercury stations 6–8 times per year (3–4 retrograde episodes).
    const jdStart = 2461041.5; // 2026-01-01
    let flips = 0;
    let previous = planetPosition('mercury', jdStart).retrograde;
    for (let day = 1; day <= 365; day += 1) {
      const current = planetPosition('mercury', jdStart + day).retrograde;
      if (current !== previous) flips += 1;
      previous = current;
    }
    expect(flips).toBeGreaterThanOrEqual(6);
    expect(flips).toBeLessThanOrEqual(8);
  });
});
