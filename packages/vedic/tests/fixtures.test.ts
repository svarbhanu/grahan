import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

function readFixture<T>(relativePath: string): T {
  return JSON.parse(
    readFileSync(new URL(relativePath, import.meta.url), 'utf8'),
  ) as T;
}

interface AyanamsaFixture {
  source: string;
  data: { jdUt: number; utc: string; lahiri: number }[];
}

interface ElementsFixture {
  source: string;
  data: {
    sunTropical: number;
    moonTropical: number;
    sunSidereal: number;
    moonSidereal: number;
    ayanamsa: number;
    tithiIndex: number;
    nakshatraIndex: number;
    pada: number;
    yogaIndex: number;
    karanaSlot: number;
  }[];
}

interface FounderFixture {
  data: {
    ayanamsa: number;
    lagnaSidereal: number;
    retrograde: { saturn: boolean };
    elements: {
      tithiIndex: number;
      nakshatraIndex: number;
      pada: number;
      yogaIndex: number;
    };
  };
}

interface RahuKaalFixture {
  data: {
    sunriseUtc: string;
    sunsetUtc: string;
    weekdaySegment: Record<string, number>;
  };
}

describe('ayanamsa fixture', () => {
  const fixture = readFixture<AyanamsaFixture>('../fixtures/ayanamsa.json');

  it('has 41 epochs, all plausible Lahiri values that grow with time', () => {
    expect(fixture.data).toHaveLength(41);
    for (const row of fixture.data) {
      expect(row.lahiri).toBeGreaterThan(22);
      expect(row.lahiri).toBeLessThan(26);
    }
    const grid = fixture.data.slice(0, 40);
    expect(grid[0]?.lahiri).toBeLessThan(grid[39]?.lahiri ?? 0);
  });
});

describe('panchang-elements fixture', () => {
  const fixture = readFixture<ElementsFixture>(
    '../fixtures/panchang-elements.json',
  );

  it('has 100 instants with all indices in range', () => {
    expect(fixture.data).toHaveLength(100);
    for (const row of fixture.data) {
      expect(row.tithiIndex).toBeGreaterThanOrEqual(0);
      expect(row.tithiIndex).toBeLessThan(30);
      expect(row.nakshatraIndex).toBeGreaterThanOrEqual(0);
      expect(row.nakshatraIndex).toBeLessThan(27);
      expect(row.pada).toBeGreaterThanOrEqual(1);
      expect(row.pada).toBeLessThanOrEqual(4);
      expect(row.yogaIndex).toBeGreaterThanOrEqual(0);
      expect(row.yogaIndex).toBeLessThan(27);
      expect(row.karanaSlot).toBeGreaterThanOrEqual(0);
      expect(row.karanaSlot).toBeLessThan(60);
    }
  });

  it('sidereal = tropical − ayanamsa (mod 360)', () => {
    for (const row of fixture.data) {
      const expected = (((row.moonTropical - row.ayanamsa) % 360) + 360) % 360;
      expect(Math.abs(row.moonSidereal - expected)).toBeLessThan(1e-4);
    }
  });
});

describe('founder-chart fixture (CLAUDE.md fixture 1)', () => {
  const fixture = readFixture<FounderFixture>('../fixtures/founder-chart.json');

  it('matches the golden panchang elements', () => {
    expect(fixture.data.ayanamsa).toBeCloseTo(23.7681, 3);
    expect(fixture.data.lagnaSidereal).toBeCloseTo(191.7833, 1);
    expect(fixture.data.retrograde.saturn).toBe(true);
    expect(fixture.data.elements.tithiIndex).toBe(0); // Shukla Pratipada
    expect(fixture.data.elements.nakshatraIndex).toBe(9); // Magha
    expect(fixture.data.elements.pada).toBe(3);
    expect(fixture.data.elements.yogaIndex).toBe(18); // Parigha
  });
});

describe('rahu-kaal fixture (CLAUDE.md fixture 2)', () => {
  const fixture = readFixture<RahuKaalFixture>(
    '../fixtures/rahu-kaal-ktm.json',
  );

  it('has UTC events and the weekday segment table', () => {
    expect(fixture.data.sunriseUtc).toBe('2026-07-01T23:26:37Z');
    expect(fixture.data.sunsetUtc.startsWith('2026-07-02T13:18')).toBe(true);
    expect(fixture.data.weekdaySegment['thu']).toBe(6);
  });
});
