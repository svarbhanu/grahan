import { describe, expect, it } from 'vitest';
import {
  greenwichApparentSiderealTime,
  greenwichMeanSiderealTime,
  localSiderealTime,
  normalizeDegrees,
} from '../src/index.js';

describe('greenwichMeanSiderealTime', () => {
  it('matches Meeus example 12.a: 1987-04-10 0h UT', () => {
    // θ₀ = 13h 10m 46.3668s = 197.693195°
    expect(greenwichMeanSiderealTime(2446895.5)).toBeCloseTo(197.693195, 5);
  });

  it('matches Meeus example 12.b: 1987-04-10 19h21m UT', () => {
    const jd = 2446895.5 + (19 + 21 / 60) / 24;
    // θ₀ = 8h 34m 57.0896s = 128.737873°
    expect(greenwichMeanSiderealTime(jd)).toBeCloseTo(128.737873, 4);
  });
});

describe('greenwichApparentSiderealTime', () => {
  it('matches Meeus example 12.a apparent value within the abridged-nutation budget', () => {
    // Apparent θ = 13h 10m 46.1351s = 197.692563°; our Δψ is good to ±0.5″,
    // which is ±0.00013° on the equation of the equinoxes.
    const gast = greenwichApparentSiderealTime(2446895.5);
    expect(Math.abs(gast - 197.692563)).toBeLessThan(0.0005);
  });
});

describe('localSiderealTime', () => {
  it('adds east longitude to the Greenwich value', () => {
    const jd = 2451545.0;
    const expected = normalizeDegrees(
      greenwichApparentSiderealTime(jd) + 85.324,
    );
    expect(localSiderealTime(jd, 85.324)).toBeCloseTo(expected, 9);
  });

  it('stays in [0, 360)', () => {
    const lst = localSiderealTime(2460000.5, -156.7886);
    expect(lst).toBeGreaterThanOrEqual(0);
    expect(lst).toBeLessThan(360);
  });
});
