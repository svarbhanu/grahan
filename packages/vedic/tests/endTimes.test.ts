import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  julianDayFromDate,
  moonPosition,
  sunPosition,
  normalizeDegrees,
} from '@grahan/core';
import {
  karana,
  karanaEndTime,
  nakshatra,
  nakshatraEndTime,
  siderealLongitude,
  tithi,
  tithiEndTime,
  yoga,
  yogaEndTime,
} from '../src/index.js';

interface Boundary {
  index: number;
  endJdUt: number;
  endUtc: string;
}

interface BoundaryRow {
  jdUt: number;
  utc: string;
  tithi: Boundary;
  karana: Boundary;
  nakshatra: Boundary;
  yoga: Boundary;
}

const fixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/element-boundaries.json', import.meta.url),
    'utf8',
  ),
) as { source: string; data: BoundaryRow[] };

const FOUNDER_JD = 2449217.71875; // 1993-08-18 05:15 UT

function longitudes(jdUt: number) {
  const sun = sunPosition(jdUt).apparentLongitude;
  const moon = moonPosition(jdUt).apparentLongitude;
  return {
    sun,
    moon,
    siderealSun: siderealLongitude(sun, jdUt),
    siderealMoon: siderealLongitude(moon, jdUt),
  };
}

describe('element end times vs swisseph boundaries', () => {
  it('fixture is the swisseph set', () => {
    expect(fixture.source).toContain('swisseph');
    expect(fixture.data.length).toBeGreaterThanOrEqual(120);
  });

  it('identifies the same current element on every row', () => {
    for (const row of fixture.data) {
      const lon = longitudes(row.jdUt);
      expect(tithi(lon.sun, lon.moon).index).toBe(row.tithi.index);
      expect(karana(lon.sun, lon.moon).index).toBe(row.karana.index);
      expect(nakshatra(lon.siderealMoon).index).toBe(row.nakshatra.index);
      expect(yoga(lon.siderealSun, lon.siderealMoon).index).toBe(
        row.yoga.index,
      );
    }
  });

  const cases = [
    ['tithi', tithiEndTime],
    ['karana', karanaEndTime],
    ['nakshatra', nakshatraEndTime],
    ['yoga', yogaEndTime],
  ] as const;

  for (const [name, endTime] of cases) {
    it(`${name} end instants stay within budget`, () => {
      const diffs = fixture.data.map(
        (row) => (endTime(row.jdUt) - row[name].endJdUt) * 86400,
      );
      const maxAbs = Math.max(...diffs.map(Math.abs));
      const mean =
        diffs.reduce((sum, d) => sum + Math.abs(d), 0) / diffs.length;
      console.log(
        `[accuracy] ${name}-end: n=${diffs.length} max=${maxAbs.toFixed(1)}s mean=${mean.toFixed(1)}s`,
      );
      // Measured 2026-07-06: max ≈ 37.5 s, mean ≈ 9.7 s on all four.
      expect(maxAbs).toBeLessThan(60);
    });
  }

  it('boundaries land exactly on the element grid', () => {
    // Our own consistency: at each solved end the driving angle must sit
    // on a multiple of the element width (within iteration tolerance).
    for (const row of fixture.data.filter((_, i) => i % 10 === 0)) {
      const endJd = tithiEndTime(row.jdUt);
      const lon = longitudes(endJd);
      const elongation = normalizeDegrees(lon.moon - lon.sun);
      expect(
        Math.abs(elongation / 12 - Math.round(elongation / 12)),
      ).toBeLessThan(1e-5);
    }
  });

  it('founder instant: Pratipada ends 16:00:35 UT, after Parigha and Magha', () => {
    const tithiEnd = tithiEndTime(FOUNDER_JD);
    const yogaEnd = yogaEndTime(FOUNDER_JD);
    const nakshatraEnd = nakshatraEndTime(FOUNDER_JD);
    const karanaEnd = karanaEndTime(FOUNDER_JD);
    // Kimstughna is the first half of Pratipada: its end comes first,
    // then Parigha, then Magha, then the tithi itself.
    expect(karanaEnd).toBeLessThan(yogaEnd);
    expect(yogaEnd).toBeLessThan(nakshatraEnd);
    expect(nakshatraEnd).toBeLessThan(tithiEnd);
    const date = new Date((tithiEnd - 2440587.5) * 86400000);
    expect(date.toISOString().slice(0, 16)).toBe('1993-08-18T16:00');
  });

  it('end times are usable through Dates', () => {
    const jd = julianDayFromDate(new Date('2026-07-02T00:00:00Z'));
    const end = tithiEndTime(jd);
    expect(end).toBeGreaterThan(jd);
    expect(end - jd).toBeLessThan(1.2); // a tithi lasts under ~27 hours
  });
});
