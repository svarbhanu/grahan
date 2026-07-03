import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Sanity checks over the committed swisseph-generated fixtures, so CI
// catches a corrupt or hand-edited fixture without ever running Python.

function readFixture<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(new URL(relativePath, import.meta.url), 'utf8'),
  ) as T;
}

interface SunMoonFixture {
  source: string;
  data: {
    jdUt: number;
    utc: string;
    sun: number;
    moon: number;
    meanNode: number;
  }[];
}

interface SunriseFixture {
  source: string;
  data: { site: string; date: string; sunrise: string; sunset: string }[];
}

const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/;
const POLAR = ['always_up', 'always_down'];

describe('sun-moon-longitudes fixture', () => {
  const fixture = readFixture<SunMoonFixture>(
    '../fixtures/sun-moon-longitudes.json',
  );

  it('has a source and 120 instants', () => {
    expect(fixture.source).toContain('swisseph');
    expect(fixture.data).toHaveLength(120);
  });

  it('keeps all longitudes in [0, 360) with valid timestamps', () => {
    for (const row of fixture.data) {
      expect(row.utc).toMatch(ISO_UTC);
      for (const value of [row.sun, row.moon, row.meanNode]) {
        expect(value).toBeGreaterThanOrEqual(0);
        expect(value).toBeLessThan(360);
      }
    }
  });
});

describe('sunrise-sunset fixture', () => {
  const fixture = readFixture<SunriseFixture>(
    '../fixtures/sunrise-sunset.json',
  );

  it('has 5 sites × 30 dates', () => {
    expect(fixture.data).toHaveLength(150);
  });

  it('every event is an ISO time or an explicit polar state', () => {
    for (const row of fixture.data) {
      for (const event of [row.sunrise, row.sunset]) {
        expect(ISO_UTC.test(event) || POLAR.includes(event)).toBe(true);
      }
      // Ordering holds away from the poles; at Utqiagvik a local day near
      // the midnight-sun transition can legitimately set before it rises.
      if (row.site !== 'utqiagvik') {
        expect(row.sunrise < row.sunset).toBe(true);
      }
    }
  });

  it('contains polar-state rows (Utqiagvik must exercise the edge)', () => {
    expect(fixture.data.some((row) => POLAR.includes(row.sunrise))).toBe(true);
  });
});
