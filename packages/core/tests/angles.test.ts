import { describe, expect, it } from 'vitest';
import {
  degToRad,
  degreesToDms,
  dmsToDegrees,
  formatDms,
  normalizeDegrees,
  radToDeg,
} from '../src/index.js';

describe('normalizeDegrees', () => {
  it.each([
    [0, 0],
    [360, 0],
    [361, 1],
    [-45, 315],
    [720.5, 0.5],
    [-360, 0],
    [359.999, 359.999],
  ])('%f → %f', (input, expected) => {
    expect(normalizeDegrees(input)).toBeCloseTo(expected, 9);
  });
});

describe('degToRad / radToDeg', () => {
  it('180° is π', () => {
    expect(degToRad(180)).toBeCloseTo(Math.PI, 12);
    expect(radToDeg(Math.PI)).toBeCloseTo(180, 12);
  });

  it('round-trips', () => {
    expect(radToDeg(degToRad(23.7681))).toBeCloseTo(23.7681, 12);
  });
});

describe('degreesToDms / dmsToDegrees', () => {
  it('splits the 1993 Lahiri ayanamsa 23.7681°', () => {
    const dms = degreesToDms(23.7681);
    expect(dms.negative).toBe(false);
    expect(dms.degrees).toBe(23);
    expect(dms.minutes).toBe(46);
    expect(dms.seconds).toBeCloseTo(5.16, 6);
  });

  it('handles negative angles', () => {
    const dms = degreesToDms(-0.5);
    expect(dms.negative).toBe(true);
    expect(dms.degrees).toBe(0);
    expect(dms.minutes).toBe(30);
    expect(dms.seconds).toBeCloseTo(0, 9);
  });

  it('recombines: 23°26′44″ ≈ 23.445556°', () => {
    expect(dmsToDegrees(23, 26, 44)).toBeCloseTo(23.4455556, 6);
    expect(dmsToDegrees(0, 30, 0, true)).toBeCloseTo(-0.5, 12);
  });

  it('round-trips', () => {
    const dms = degreesToDms(123.456789);
    expect(
      dmsToDegrees(dms.degrees, dms.minutes, dms.seconds, dms.negative),
    ).toBeCloseTo(123.456789, 9);
  });
});

describe('formatDms', () => {
  it('formats with default whole seconds', () => {
    expect(formatDms(23.7681)).toBe('23°46′05″');
  });

  it('formats with fractional seconds', () => {
    expect(formatDms(23.7681, 1)).toBe('23°46′05.2″');
  });

  it('carries when seconds round up to 60', () => {
    expect(formatDms(29.99999)).toBe('30°00′00″');
  });

  it('formats negative angles', () => {
    expect(formatDms(-11.7833333, 0)).toBe('-11°47′00″');
  });
});
