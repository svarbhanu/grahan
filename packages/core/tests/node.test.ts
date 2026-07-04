import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { meanLunarNode } from '../src/index.js';
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

describe('meanLunarNode vs swisseph (120 instants, 1900–2100)', () => {
  it('within ±0.003° everywhere (same polynomial family)', () => {
    const errors = fixture.data.map((row) =>
      angleDiff(meanLunarNode(row.jdUt), row.meanNode),
    );
    const stats = errorStats(errors);
    reportStats('mean lunar node', stats);
    expect(stats.maxAbsDeg).toBeLessThan(0.003);
  });
});
