import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  dateFromJulianDay,
  julianDayFromDate,
  normalizeDegrees,
  trueLunarNode,
  wrap180,
} from '@grahan/core';
import {
  kundali,
  siderealLongitude,
  GRAHA_ORDER,
  type Graha,
} from '../src/index.js';
import { angleDiff, errorStats, reportStats } from './helpers/stats.js';

interface ChartRow {
  jdUt: number;
  lat: number;
  lon: number;
  ayanamsa: number;
  lagnaSidereal: number;
  bodiesSidereal: Record<string, number>;
  retrograde: Record<string, boolean>;
}

const grid = JSON.parse(
  readFileSync(
    new URL('../fixtures/kundali-grid.json', import.meta.url),
    'utf8',
  ),
) as { data: ChartRow[] };

// Half of each body's published tolerance: the Moon promises ±0.05°
// (its Meeus ch. 47 series is intrinsically good to ~65″); everything
// else promises ±0.02°.
const BUDGET_DEG = 0.01;
const MOON_BUDGET_DEG = 0.025;

function computeChart(row: ChartRow) {
  return kundali({
    date: dateFromJulianDay(row.jdUt),
    latitude: row.lat,
    longitude: row.lon,
  });
}

describe('kundali vs swisseph grid (39 charts, 1902–2100, 1°N–60°N)', () => {
  it('all nine grahas within half their published tolerances', () => {
    const moonErrors: number[] = [];
    const otherErrors: number[] = [];
    for (const row of grid.data) {
      const chart = computeChart(row);
      for (const graha of chart.grahas) {
        const reference = row.bodiesSidereal[graha.graha];
        expect(reference, `${graha.graha} missing in fixture`).toBeDefined();
        const error = angleDiff(graha.longitude, reference ?? Number.NaN);
        (graha.graha === 'moon' ? moonErrors : otherErrors).push(error);
      }
    }
    const moonStats = errorStats(moonErrors);
    const otherStats = errorStats(otherErrors);
    reportStats('kundali moon longitude', moonStats);
    reportStats('kundali other graha longitudes', otherStats);
    expect(moonStats.maxAbsDeg).toBeLessThan(MOON_BUDGET_DEG);
    expect(otherStats.maxAbsDeg).toBeLessThan(BUDGET_DEG);
  });

  it(`lagna within ±${BUDGET_DEG}° sidereal`, () => {
    const errors = grid.data.map((row) =>
      angleDiff(computeChart(row).lagna.longitude, row.lagnaSidereal),
    );
    const stats = errorStats(errors);
    reportStats('kundali lagna', stats);
    expect(stats.maxAbsDeg).toBeLessThan(BUDGET_DEG);
  });

  it('retrograde flags match swisseph for every chart', () => {
    for (const row of grid.data) {
      const chart = computeChart(row);
      for (const graha of chart.grahas) {
        // Mean-node speed never approaches zero, and planet stations are
        // not sampled by this coarse grid, so exact matches are expected.
        expect(graha.retrograde, `${graha.graha} @ jd ${row.jdUt}`).toBe(
          row.retrograde[graha.graha],
        );
      }
    }
  });

  it('whole-sign bhavas are self-consistent', () => {
    for (const row of grid.data) {
      const chart = computeChart(row);
      expect(chart.bhavas).toHaveLength(12);
      expect(chart.bhavas[0]?.rashi).toBe(chart.lagna.rashi);
      for (const graha of chart.grahas) {
        const house = chart.bhavas[graha.bhava - 1];
        expect(house?.rashi).toBe(graha.rashi);
        expect(house?.grahas).toContain(graha.graha);
      }
      const placed = chart.bhavas.flatMap((bhava) => bhava.grahas);
      expect(placed.sort()).toEqual([...GRAHA_ORDER].sort());
    }
  });
});

describe('kundali founder acceptance (1993-08-18 11:00 NPT, Birgunj)', () => {
  const chart = kundali({
    date: new Date('1993-08-18T05:15:00Z'),
    latitude: 27.0104,
    longitude: 84.8821,
  });
  const byGraha = new Map(chart.grahas.map((g) => [g.graha, g]));
  const graha = (id: Graha) => {
    const value = byGraha.get(id);
    if (value === undefined) throw new Error(`missing ${id}`);
    return value;
  };

  it('matches the CLAUDE.md sign table', () => {
    expect(chart.lagna.rashiName).toBe('Tula');
    expect(chart.lagna.degreeInRashi).toBeCloseTo(11 + 47 / 60, 1);
    expect(graha('sun').rashiName).toBe('Simha');
    expect(graha('moon').rashiName).toBe('Simha');
    expect(graha('mars').rashiName).toBe('Kanya');
    expect(graha('mercury').rashiName).toBe('Karka');
    expect(graha('jupiter').rashiName).toBe('Kanya');
    expect(graha('venus').rashiName).toBe('Mithuna');
    expect(graha('saturn').rashiName).toBe('Kumbha');
    expect(graha('rahu').rashiName).toBe('Vrishchika');
    expect(graha('ketu').rashiName).toBe('Vrishabha');
  });

  it('Moon is in Magha pada 3; Saturn is retrograde', () => {
    expect(graha('moon').nakshatra.name).toBe('Magha');
    expect(graha('moon').nakshatra.pada).toBe(3);
    expect(graha('saturn').retrograde).toBe(true);
    expect(graha('jupiter').retrograde).toBe(false);
  });

  it('whole-sign houses count correctly from the Tula lagna', () => {
    expect(graha('sun').bhava).toBe(11); // Simha is 11th from Tula
    expect(graha('venus').bhava).toBe(9); // Mithuna is 9th
    expect(graha('saturn').bhava).toBe(5); // Kumbha is 5th
    expect(graha('rahu').bhava).toBe(2); // Vrishchika is 2nd
  });

  it("node: 'true' swaps in the osculating Rahu/Ketu, default stays mean", () => {
    const jdUt = julianDayFromDate(new Date('1993-08-18T05:15:00Z'));
    const trueChart = kundali({
      date: new Date('1993-08-18T05:15:00Z'),
      latitude: 27.0104,
      longitude: 84.8821,
      node: 'true',
    });
    const trueRahu = trueChart.grahas.find((g) => g.graha === 'rahu');
    const trueKetu = trueChart.grahas.find((g) => g.graha === 'ketu');
    const expected = siderealLongitude(trueLunarNode(jdUt), jdUt);
    expect(trueRahu?.longitude).toBeCloseTo(expected, 9);
    expect(trueKetu?.longitude).toBeCloseTo(
      normalizeDegrees(expected + 180),
      9,
    );
    // The two nodes differ, but never by more than the ±1.9° wobble.
    const meanRahu = graha('rahu').longitude;
    const gap = Math.abs(wrap180((trueRahu?.longitude ?? 0) - meanRahu));
    expect(gap).toBeGreaterThan(0.001);
    expect(gap).toBeLessThan(2);
    // Everything that is not a node is untouched by the option.
    expect(trueChart.grahas.find((g) => g.graha === 'moon')?.longitude).toBe(
      graha('moon').longitude,
    );
    expect(trueChart.lagna.longitude).toBe(chart.lagna.longitude);
  });
});
