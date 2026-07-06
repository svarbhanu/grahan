import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { meanLunarNode, trueLunarNode } from '../src/index.js';
import { angleDiff, errorStats, reportStats } from './helpers/stats.js';

interface SunMoonFixture {
  data: { jdUt: number; sun: number; moon: number; meanNode: number }[];
}

interface TrueNodeFixture {
  source: string;
  data: { jdUt: number; trueNode: number; meanNode: number; speed: number }[];
}

const fixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/sun-moon-longitudes.json', import.meta.url),
    'utf8',
  ),
) as SunMoonFixture;

const trueNodeFixture = JSON.parse(
  readFileSync(new URL('../fixtures/true-node.json', import.meta.url), 'utf8'),
) as TrueNodeFixture;

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

describe('trueLunarNode vs swisseph osculating node (160 instants)', () => {
  it('fixture is the swisseph set', () => {
    expect(trueNodeFixture.source).toContain('swisseph');
    expect(trueNodeFixture.data.length).toBeGreaterThanOrEqual(150);
  });

  it('tracks the osculating node', () => {
    const errors = trueNodeFixture.data.map((row) =>
      angleDiff(trueLunarNode(row.jdUt), row.trueNode),
    );
    const stats = errorStats(errors);
    reportStats('true lunar node', stats);
    // Measured 2026-07-06: max 65.9″, mean 14.7″ — the Moon series'
    // own truncation error carried into the osculating plane.
    expect(stats.maxAbsDeg).toBeLessThan(0.03);
  });

  it('wobbles around the mean node within ±2°', () => {
    for (const row of trueNodeFixture.data) {
      const dev = angleDiff(trueLunarNode(row.jdUt), meanLunarNode(row.jdUt));
      expect(Math.abs(dev)).toBeLessThan(2);
    }
  });
});
