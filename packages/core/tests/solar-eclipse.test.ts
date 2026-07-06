import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  julianDayFromCalendar,
  julianDayFromDate,
  nextSolarEclipse,
  type SolarEclipse,
} from '../src/index.js';

interface FixtureInstant {
  jdUt: number;
  utc: string;
}

interface SolarEclipseFixture {
  parameters: { count: number };
  data: {
    type: 'partial' | 'annular' | 'total' | 'hybrid';
    central: boolean;
    maximum: FixtureInstant;
    magnitude: number;
    greatest: { lat: number; lon: number };
    globalBegin: FixtureInstant | null;
    centralBegin: FixtureInstant | null;
    centralEnd: FixtureInstant | null;
    globalEnd: FixtureInstant | null;
  }[];
}

const fixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/solar-eclipses.json', import.meta.url),
    'utf8',
  ),
) as SolarEclipseFixture;

const RANGE_START = julianDayFromCalendar({ year: 1900, month: 1, day: 1 });
const RANGE_END = julianDayFromCalendar({ year: 2100, month: 1, day: 1 });

const toSeconds = (days: number) => days * 86400;

let computed: SolarEclipse[];

beforeAll(() => {
  computed = [];
  let jd = RANGE_START;
  for (;;) {
    const eclipse = nextSolarEclipse(jd);
    if (eclipse.maximum >= RANGE_END) break;
    computed.push(eclipse);
    jd = eclipse.maximum + 5;
  }
});

describe('nextSolarEclipse over the full 1900–2100 catalog', () => {
  it('finds every eclipse exactly once (452 events, none missed, none invented)', () => {
    expect(computed.length).toBe(fixture.parameters.count);
    for (const [i, event] of fixture.data.entries()) {
      const got = computed[i];
      expect(got).toBeDefined();
      if (!got) continue;
      // Budget 240 s: the worst cases (151 s) are sub-0.01-magnitude
      // grazing partials, where "greatest eclipse" sits in an almost
      // flat minimum of the axis distance.
      expect(
        Math.abs(toSeconds(got.maximum - event.maximum.jdUt)),
        `event ${i} (${event.maximum.utc})`,
      ).toBeLessThan(240);
    }
  });

  // Two knife-edge events where swisseph's hybrid flag disagrees with
  // NASA/Espenak's canon: 1927-01-03 (annularity 3 s) and 1948-05-09
  // (the century's shortest annular, 0 s). NASA types both "A", and our
  // geometry agrees with NASA, so the fixture rows are exempted.
  const SWISSEPH_HYBRID_MISLABELS = new Set([
    '1927-01-03T20:22:30Z',
    '1948-05-09T02:25:34Z',
  ]);

  it('classifies type and centrality like the fixtures', () => {
    const mismatches: string[] = [];
    for (const [i, event] of fixture.data.entries()) {
      const got = computed[i];
      if (!got) continue;
      if (SWISSEPH_HYBRID_MISLABELS.has(event.maximum.utc)) {
        expect(got.type).toBe('annular'); // the NASA classification
        continue;
      }
      if (got.type !== event.type || got.central !== event.central) {
        mismatches.push(
          `${event.maximum.utc}: ${got.type}/${got.central}` +
            ` vs ${event.type}/${event.central} (mag ${got.magnitude.toFixed(4)}/${event.magnitude})`,
        );
      }
    }
    expect(mismatches, mismatches.join('; ')).toEqual([]);
  });

  it('greatest-eclipse magnitude matches within budget', () => {
    let maxPartial = 0;
    let maxCentral = 0;
    for (const [i, event] of fixture.data.entries()) {
      const got = computed[i];
      if (!got) continue;
      const diff = Math.abs(got.magnitude - event.magnitude);
      if (event.type === 'partial') maxPartial = Math.max(maxPartial, diff);
      else maxCentral = Math.max(maxCentral, diff);
    }
    console.log(
      `[accuracy] solar eclipse magnitude: n=${fixture.data.length}` +
        ` partial max=${maxPartial.toFixed(4)} central max=${maxCentral.toFixed(4)}`,
    );
    expect(maxPartial).toBeLessThan(0.01);
    expect(maxCentral).toBeLessThan(0.01);
  });

  it('greatest-eclipse location matches within budget', () => {
    let maxKm = 0;
    for (const [i, event] of fixture.data.entries()) {
      const got = computed[i];
      if (!got) continue;
      // Rough surface distance; the greatest point is well-conditioned
      // only for central eclipses (for partials it sits on the limb).
      if (!event.central) continue;
      const dLat = got.greatest.latitude - event.greatest.lat;
      const dLon =
        (((got.greatest.longitude - event.greatest.lon + 540) % 360) - 180) *
        Math.cos((event.greatest.lat * Math.PI) / 180);
      const km = Math.hypot(dLat, dLon) * 111.2;
      maxKm = Math.max(maxKm, km);
    }
    console.log(
      `[accuracy] solar eclipse greatest point (central events): max=${maxKm.toFixed(0)} km`,
    );
    expect(maxKm).toBeLessThan(150);
  });

  it('global and central contact times match within budget', () => {
    const globalDiffs: number[] = [];
    const centralDiffs: number[] = [];
    const grazeDiffs: number[] = [];
    let absent = 0;
    for (const [i, event] of fixture.data.entries()) {
      const got = computed[i];
      if (!got) continue;
      // 1935-01-05 (partial, magnitude 0.0015 — the most marginal graze
      // of the two centuries) is degenerate in swisseph itself: it emits
      // no global contacts and copies the maximum into the totality
      // slots. Our P1/P4 for it are real; skip the comparison.
      if (event.maximum.utc === '1935-01-05T05:35:15Z') continue;
      // Sub-0.02-magnitude grazes: the penumbra meets the Earth almost
      // tangentially, so contact instants move by minutes for
      // arcsecond-level ephemeris differences. Budgeted separately.
      const graze = event.type === 'partial' && event.magnitude < 0.02;
      const pairs: [number | null, FixtureInstant | null, number[]][] = [
        [got.globalBegin, event.globalBegin, graze ? grazeDiffs : globalDiffs],
        [got.centralBegin, event.centralBegin, centralDiffs],
        [got.centralEnd, event.centralEnd, centralDiffs],
        [got.globalEnd, event.globalEnd, graze ? grazeDiffs : globalDiffs],
      ];
      for (const [gotJd, want, bucket] of pairs) {
        if (gotJd === null || want === null) {
          if ((gotJd === null) !== (want === null)) absent++;
          continue;
        }
        bucket.push(Math.abs(toSeconds(gotJd - want.jdUt)));
      }
    }
    const stats = (diffs: number[]) => ({
      max: Math.max(...diffs),
      mean: diffs.reduce((s, d) => s + d, 0) / diffs.length,
    });
    const g = stats(globalDiffs);
    const c = stats(centralDiffs);
    const z = stats(grazeDiffs);
    console.log(
      `[accuracy] solar eclipse contacts: global n=${globalDiffs.length}` +
        ` max=${g.max.toFixed(1)}s mean=${g.mean.toFixed(1)}s |` +
        ` central n=${centralDiffs.length} max=${c.max.toFixed(1)}s` +
        ` mean=${c.mean.toFixed(1)}s | grazes n=${grazeDiffs.length}` +
        ` max=${z.max.toFixed(1)}s (presence mismatches: ${absent})`,
    );
    expect(absent).toBe(0);
    expect(g.max).toBeLessThan(180);
    expect(c.max).toBeLessThan(300);
    expect(z.max).toBeLessThan(600);
  });

  it('maximum-instant accuracy stats', () => {
    const diffs = fixture.data.map((event, i) => {
      const got = computed[i];
      return got ? Math.abs(toSeconds(got.maximum - event.maximum.jdUt)) : NaN;
    });
    const max = Math.max(...diffs);
    const mean = diffs.reduce((s, d) => s + d, 0) / diffs.length;
    console.log(
      `[accuracy] solar eclipse maximum: n=${diffs.length}` +
        ` max=${max.toFixed(1)}s mean=${mean.toFixed(1)}s`,
    );
  });
});

describe('golden anchor — the 1995-10-24 total eclipse over Nepal', () => {
  it('greatest eclipse at 04:32:29 UT, magnitude 1.022, path through southeast Asia', () => {
    const eclipse = nextSolarEclipse(
      julianDayFromCalendar({ year: 1995, month: 10, day: 1 }),
    );
    expect(eclipse.type).toBe('total');
    expect(eclipse.central).toBe(true);
    // Swisseph: 1995-10-24 04:32:29 UT; NASA canon: 04:33:30 TD − ΔT 61 s.
    const want = julianDayFromDate(new Date(Date.UTC(1995, 9, 24, 4, 32, 29)));
    expect(Math.abs(toSeconds(eclipse.maximum - want))).toBeLessThan(60);
    expect(eclipse.magnitude).toBeCloseTo(1.0222, 2);
    // Greatest eclipse near 8.4° N, 113.2° E (South China Sea).
    expect(eclipse.greatest.latitude).toBeGreaterThan(7);
    expect(eclipse.greatest.latitude).toBeLessThan(10);
    expect(eclipse.greatest.longitude).toBeGreaterThan(111);
    expect(eclipse.greatest.longitude).toBeLessThan(115);
  });
});

describe('golden anchor — the 2027-08-02 total eclipse (next visible from Kathmandu)', () => {
  it('is the long total eclipse over Egypt, greatest 10:06:34 UT, magnitude 1.079', () => {
    const eclipse = nextSolarEclipse(
      julianDayFromCalendar({ year: 2027, month: 7, day: 20 }),
    );
    expect(eclipse.type).toBe('total');
    // NASA canon: 10:07:50 TD − ΔT 76 s = 10:06:34 UT.
    const want = julianDayFromDate(new Date(Date.UTC(2027, 7, 2, 10, 6, 34)));
    expect(Math.abs(toSeconds(eclipse.maximum - want))).toBeLessThan(60);
    expect(eclipse.magnitude).toBeCloseTo(1.079, 2);
  });
});
