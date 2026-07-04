import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { moonPhase } from '../src/index.js';
import { angleDiff } from './helpers/stats.js';

interface SunMoonFixture {
  data: { jdUt: number; sun: number; moon: number }[];
}

const fixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/sun-moon-longitudes.json', import.meta.url),
    'utf8',
  ),
) as SunMoonFixture;

const FOUNDER_JD = 2449217.71875; // 1993-08-18 05:15 UT — Shukla Pratipada

describe('moonPhase', () => {
  it('elongation matches the fixture longitudes within combined budget', () => {
    for (const row of fixture.data) {
      const expected = (((row.moon - row.sun) % 360) + 360) % 360;
      const actual = moonPhase(row.jdUt).elongation;
      expect(Math.abs(angleDiff(actual, expected))).toBeLessThan(0.03);
    }
  });

  it('keeps fraction and phase angle in valid ranges', () => {
    for (const row of fixture.data) {
      const phase = moonPhase(row.jdUt);
      expect(phase.illuminatedFraction).toBeGreaterThanOrEqual(0);
      expect(phase.illuminatedFraction).toBeLessThanOrEqual(1);
      expect(phase.phaseAngle).toBeGreaterThanOrEqual(0);
      expect(phase.phaseAngle).toBeLessThanOrEqual(180);
    }
  });

  it('founder instant is a barely-lit waxing moon (Shukla Pratipada)', () => {
    const phase = moonPhase(FOUNDER_JD);
    expect(phase.phaseName).toBe('new');
    expect(phase.elongation).toBeGreaterThan(0);
    expect(phase.elongation).toBeLessThan(22.5);
    expect(phase.illuminatedFraction).toBeLessThan(0.01);
  });

  it('fraction is near 1 around opposition and near 0 near conjunction', () => {
    for (const row of fixture.data) {
      const phase = moonPhase(row.jdUt);
      const towardFull = 1 - Math.abs(angleDiff(phase.elongation, 180)) / 180;
      if (towardFull > 0.95)
        expect(phase.illuminatedFraction).toBeGreaterThan(0.95);
      if (towardFull < 0.05)
        expect(phase.illuminatedFraction).toBeLessThan(0.05);
    }
  });
});
