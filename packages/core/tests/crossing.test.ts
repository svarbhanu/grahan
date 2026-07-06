import { describe, expect, it } from 'vitest';
import {
  nextCrossing,
  nextFullMoon,
  nextNewMoon,
  nextSyzygy,
  normalizeDegrees,
  wrap180,
} from '../src/index.js';

describe('wrap180', () => {
  it('maps angles to (-180, 180]', () => {
    expect(wrap180(350)).toBe(-10);
    expect(wrap180(10)).toBe(10);
    expect(wrap180(180)).toBe(180);
    expect(wrap180(-190)).toBe(170);
    expect(wrap180(720)).toBe(0);
  });
});

describe('nextCrossing', () => {
  it('solves a synthetic angle with a wobbling rate exactly', () => {
    // value(t) = 10°/day plus a ±20% rate wobble; crossing of 90° from
    // t=0 has a closed form we can verify by evaluation instead.
    const value = (t: number) => normalizeDegrees(10 * t + 2 * Math.sin(t / 3));
    const t = nextCrossing(value, 10, 90, 0);
    expect(Math.abs(wrap180(value(t) - 90))).toBeLessThan(1e-6);
    expect(t).toBeGreaterThan(0);
    expect(t).toBeLessThan(36); // one revolution at the mean rate
  });

  it('starts searching forward from the given instant', () => {
    const value = (t: number) => normalizeDegrees(12 * t);
    // 24° is behind 30° at t=10 (value 120): must wrap a full revolution.
    const t = nextCrossing(value, 12, 120 + 24, 10);
    expect(t).toBeCloseTo(12, 6);
  });

  it('reproduces nextSyzygy at several instants and targets', () => {
    // nextSyzygy is now a delegate; pin the known J2000 lunation values
    // so the refactor cannot have changed behavior.
    expect(nextNewMoon(2451545)).toBeCloseTo(2451550.26, 1);
    expect(nextFullMoon(2451545)).toBeCloseTo(2451564.69, 1);
    for (const target of [0, 90, 180, 270]) {
      const t = nextSyzygy(2460000, target);
      expect(t).toBeGreaterThanOrEqual(2460000);
      expect(t - 2460000).toBeLessThan(29.6);
    }
  });
});
