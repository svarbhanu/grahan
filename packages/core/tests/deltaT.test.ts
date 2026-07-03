import { describe, expect, it } from 'vitest';
import { deltaTSeconds, ttFromUt } from '../src/index.js';

// Observed ΔT in seconds at the start of each year, from the table published
// with the Espenak–Meeus polynomial expressions (NASA eclipse site) and the
// IERS record. The polynomials are fits, so we allow ±1.0 s.
const observed: [number, number][] = [
  [1850, 7.1],
  [1900, -2.8],
  [1910, 10.4],
  [1920, 21.2],
  [1930, 24.0],
  [1940, 24.3],
  [1950, 29.1],
  [1960, 33.1],
  [1970, 40.2],
  [1980, 50.5],
  [1990, 56.9],
  [2000, 63.8],
  [2010, 66.1],
];

describe('deltaTSeconds', () => {
  it.each(observed)('year %i → ≈%f s', (year, dt) => {
    expect(Math.abs(deltaTSeconds(year) - dt)).toBeLessThan(1.0);
  });

  it('is continuous enough across segment boundaries (< 1 s jump)', () => {
    for (const boundary of [1860, 1900, 1920, 1941, 1961, 1986, 2005, 2050]) {
      const jump = Math.abs(
        deltaTSeconds(boundary - 0.001) - deltaTSeconds(boundary + 0.001),
      );
      expect(jump).toBeLessThan(1);
    }
  });

  it('falls back to the long-term parabola outside 1800–2150', () => {
    const u = (1500 - 1820) / 100;
    expect(deltaTSeconds(1500)).toBeCloseTo(-20 + 32 * u * u, 6);
  });
});

describe('ttFromUt', () => {
  it('advances a UT julian day by ΔT', () => {
    const utJd = 2451544.5; // 2000-01-01T00:00 UT
    const dtSeconds = (ttFromUt(utJd) - utJd) * 86400;
    expect(dtSeconds).toBeGreaterThan(62);
    expect(dtSeconds).toBeLessThan(66);
  });
});
