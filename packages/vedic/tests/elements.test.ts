import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { moonPosition, sunPosition } from '@grahan/core';
import {
  karana,
  nakshatra,
  siderealLongitude,
  tithi,
  yoga,
} from '../src/index.js';

interface ElementsFixture {
  data: {
    jdUt: number;
    sunTropical: number;
    moonTropical: number;
    sunSidereal: number;
    moonSidereal: number;
    tithiIndex: number;
    nakshatraIndex: number;
    pada: number;
    yogaIndex: number;
    karanaSlot: number;
  }[];
}

const fixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/panchang-elements.json', import.meta.url),
    'utf8',
  ),
) as ElementsFixture;

describe('element indexing on swisseph inputs (pure math, 100 instants)', () => {
  it('reproduces every index exactly', () => {
    for (const row of fixture.data) {
      expect(tithi(row.sunTropical, row.moonTropical).index).toBe(
        row.tithiIndex,
      );
      expect(karana(row.sunTropical, row.moonTropical).index).toBe(
        row.karanaSlot,
      );
      const n = nakshatra(row.moonSidereal);
      expect(n.index).toBe(row.nakshatraIndex);
      expect(n.pada).toBe(row.pada);
      expect(yoga(row.sunSidereal, row.moonSidereal).index).toBe(row.yogaIndex);
    }
  });
});

/** Distance from a value to the nearest segment boundary of a given width. */
function boundaryDistance(value: number, width: number): number {
  const within = ((value % width) + width) % width;
  return Math.min(within, width - within);
}

describe('element indexing end-to-end (our engine, 100 instants)', () => {
  it('matches swisseph indices except within ±0.03° of a boundary', () => {
    for (const row of fixture.data) {
      const sun = sunPosition(row.jdUt).apparentLongitude;
      const moon = moonPosition(row.jdUt).apparentLongitude;
      const sidMoon = siderealLongitude(moon, row.jdUt);
      const sidSun = siderealLongitude(sun, row.jdUt);

      const elongation = (((moon - sun) % 360) + 360) % 360;
      if (tithi(sun, moon).index !== row.tithiIndex) {
        expect(boundaryDistance(elongation, 12)).toBeLessThan(0.03);
      }
      if (nakshatra(sidMoon).index !== row.nakshatraIndex) {
        expect(boundaryDistance(sidMoon, 360 / 27)).toBeLessThan(0.03);
      }
      if (yoga(sidSun, sidMoon).index !== row.yogaIndex) {
        expect(
          boundaryDistance((((sidSun + sidMoon) % 360) + 360) % 360, 360 / 27),
        ).toBeLessThan(0.03);
      }
    }
  });
});
