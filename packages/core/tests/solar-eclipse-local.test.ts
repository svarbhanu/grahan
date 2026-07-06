import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  julianDayFromCalendar,
  julianDayFromDate,
  nextSolarEclipseAt,
  type LocalSolarEclipse,
  type Observer,
} from '../src/index.js';

interface FixtureInstant {
  jdUt: number;
  utc: string;
}

interface LocalFixture {
  parameters: { count: number };
  data: {
    site: string;
    lat: number;
    lon: number;
    altM: number;
    type: 'partial' | 'annular' | 'total';
    maximum: FixtureInstant;
    magnitude: number;
    obscuration: number;
    firstContact: FixtureInstant | null;
    secondContact: FixtureInstant | null;
    thirdContact: FixtureInstant | null;
    fourthContact: FixtureInstant | null;
  }[];
}

const fixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/solar-eclipses-local.json', import.meta.url),
    'utf8',
  ),
) as LocalFixture;

const RANGE_START = julianDayFromCalendar({ year: 1980, month: 1, day: 1 });
const RANGE_END = julianDayFromCalendar({ year: 2060, month: 1, day: 1 });

const toSeconds = (days: number) => days * 86400;

const sites = new Map<string, Observer>();
for (const row of fixture.data) {
  sites.set(row.site, {
    latitude: row.lat,
    longitude: row.lon,
    altitudeM: row.altM,
  });
}

/** site → events, chained across the whole range once. */
let computed: Map<string, LocalSolarEclipse[]>;

beforeAll(() => {
  computed = new Map();
  for (const [name, observer] of sites) {
    const events: LocalSolarEclipse[] = [];
    let jd = RANGE_START;
    for (;;) {
      const eclipse = nextSolarEclipseAt(jd, observer);
      if (eclipse.maximum >= RANGE_END) break;
      events.push(eclipse);
      jd = eclipse.maximum + 5;
    }
    computed.set(name, events);
  }
});

describe('nextSolarEclipseAt over five sites, 1980–2060', () => {
  it('sees exactly the eclipses swisseph sees at each site', () => {
    for (const name of sites.keys()) {
      const want = fixture.data.filter((e) => e.site === name);
      const got = computed.get(name) ?? [];
      const wantDates = want.map((e) => e.maximum.utc.slice(0, 10));
      const gotDates = got.map((e) =>
        new Date((e.maximum - 2440587.5) * 86400000).toISOString().slice(0, 10),
      );
      expect(gotDates, `site ${name}`).toEqual(wantDates);
    }
  });

  it('matches local type at every event', () => {
    const mismatches: string[] = [];
    for (const name of sites.keys()) {
      const want = fixture.data.filter((e) => e.site === name);
      const got = computed.get(name) ?? [];
      for (const [i, event] of want.entries()) {
        const g = got[i];
        if (g && g.type !== event.type) {
          mismatches.push(
            `${name} ${event.maximum.utc}: ${g.type} vs ${event.type}`,
          );
        }
      }
    }
    expect(mismatches, mismatches.join('; ')).toEqual([]);
  });

  it('local maximum, magnitude and obscuration match within budget', () => {
    const timeDiffs: number[] = [];
    let maxMag = 0;
    let maxObs = 0;
    for (const name of sites.keys()) {
      const want = fixture.data.filter((e) => e.site === name);
      const got = computed.get(name) ?? [];
      for (const [i, event] of want.entries()) {
        const g = got[i];
        if (!g) continue;
        timeDiffs.push(Math.abs(toSeconds(g.maximum - event.maximum.jdUt)));
        maxMag = Math.max(maxMag, Math.abs(g.magnitude - event.magnitude));
        maxObs = Math.max(maxObs, Math.abs(g.obscuration - event.obscuration));
      }
    }
    const max = Math.max(...timeDiffs);
    const mean = timeDiffs.reduce((s, d) => s + d, 0) / timeDiffs.length;
    const clamped = timeDiffs.filter((d) => d > 120).length;
    console.log(
      `[accuracy] local solar maximum: n=${timeDiffs.length}` +
        ` max=${max.toFixed(1)}s mean=${mean.toFixed(1)}s over120s=${clamped} |` +
        ` magnitude max=${maxMag.toFixed(4)} obscuration max=${maxObs.toFixed(4)}`,
    );
    // Sunrise/sunset-clamped maxima ("visible maximum" convention)
    // inherit the refraction-model difference with swisseph; at polar
    // sites the sun skims the horizon, so a ~0.05° altitude difference
    // is minutes of clock time. Everything unclamped sits under 120 s.
    expect(mean).toBeLessThan(30);
    expect(clamped).toBeLessThanOrEqual(5);
    expect(max).toBeLessThan(900);
    // Magnitude/obscuration outliers are those same clamped instants,
    // where the eclipse is still evolving while the sun rises.
    expect(maxMag).toBeLessThan(0.15);
    expect(maxObs).toBeLessThan(0.16);
  });

  it('contact times match within budget', () => {
    const diffs: number[] = [];
    let absent = 0;
    for (const name of sites.keys()) {
      const want = fixture.data.filter((e) => e.site === name);
      const got = computed.get(name) ?? [];
      for (const [i, event] of want.entries()) {
        const g = got[i];
        if (!g) continue;
        const pairs: [number | null, FixtureInstant | null][] = [
          [g.firstContact, event.firstContact],
          [g.secondContact, event.secondContact],
          [g.thirdContact, event.thirdContact],
          [g.fourthContact, event.fourthContact],
        ];
        for (const [gotJd, wantInstant] of pairs) {
          if (gotJd === null || wantInstant === null) {
            if ((gotJd === null) !== (wantInstant === null)) absent++;
            continue;
          }
          diffs.push(Math.abs(toSeconds(gotJd - wantInstant.jdUt)));
        }
      }
    }
    const max = Math.max(...diffs);
    const mean = diffs.reduce((s, d) => s + d, 0) / diffs.length;
    console.log(
      `[accuracy] local solar contacts: n=${diffs.length}` +
        ` max=${max.toFixed(1)}s mean=${mean.toFixed(1)}s (presence mismatches: ${absent})`,
    );
    expect(absent).toBe(0);
    expect(max).toBeLessThan(120);
  });
});

describe('golden anchor — 1995-10-24 as Nepal saw it', () => {
  it('Birgunj: deep 0.92-magnitude partial peaking 08:58 NPT', () => {
    const eclipse = nextSolarEclipseAt(
      julianDayFromCalendar({ year: 1995, month: 10, day: 1 }),
      { latitude: 27.0104, longitude: 84.8821, altitudeM: 80 },
    );
    expect(eclipse.type).toBe('partial');
    expect(eclipse.magnitude).toBeCloseTo(0.9193, 2);
    // Swisseph: maximum 03:13:13 UT = 08:58 NPT.
    const want = julianDayFromDate(new Date(Date.UTC(1995, 9, 24, 3, 13, 13)));
    expect(Math.abs(toSeconds(eclipse.maximum - want))).toBeLessThan(60);
  });

  it('Kathmandu: 0.89-magnitude partial, 87% of the Sun covered', () => {
    const eclipse = nextSolarEclipseAt(
      julianDayFromCalendar({ year: 1995, month: 10, day: 1 }),
      { latitude: 27.7172, longitude: 85.324, altitudeM: 1300 },
    );
    expect(eclipse.type).toBe('partial');
    expect(eclipse.magnitude).toBeCloseTo(0.894, 2);
    expect(eclipse.obscuration).toBeCloseTo(0.8695, 2);
  });
});

describe('golden anchor — Kathmandu’s next solar eclipse', () => {
  it('is the 2027-08-02 eclipse, a shallow partial from Kathmandu', () => {
    const eclipse = nextSolarEclipseAt(
      julianDayFromCalendar({ year: 2026, month: 7, day: 6 }),
      { latitude: 27.7172, longitude: 85.324, altitudeM: 1300 },
    );
    // Swisseph: maximum 2027-08-02 11:05:13 UT, magnitude 0.0746.
    const want = julianDayFromDate(new Date(Date.UTC(2027, 7, 2, 11, 5, 13)));
    expect(Math.abs(toSeconds(eclipse.maximum - want))).toBeLessThan(60);
    expect(eclipse.type).toBe('partial');
    expect(eclipse.magnitude).toBeCloseTo(0.0746, 2);
  });
});
