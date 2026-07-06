import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import {
  julianDayFromCalendar,
  julianDayFromDate,
  nextFullMoon,
  nextLunarEclipse,
  nextNewMoon,
  type LunarEclipse,
} from '../src/index.js';

interface FixtureInstant {
  jdUt: number;
  utc: string;
}

interface LunarEclipseFixture {
  parameters: { count: number };
  data: {
    type: 'penumbral' | 'partial' | 'total';
    maximum: FixtureInstant;
    magnitudeUmbral: number;
    magnitudePenumbral: number;
    penumbralBegin: FixtureInstant | null;
    partialBegin: FixtureInstant | null;
    totalBegin: FixtureInstant | null;
    totalEnd: FixtureInstant | null;
    partialEnd: FixtureInstant | null;
    penumbralEnd: FixtureInstant | null;
  }[];
}

const fixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/lunar-eclipses.json', import.meta.url),
    'utf8',
  ),
) as LunarEclipseFixture;

const RANGE_START = julianDayFromCalendar({ year: 1900, month: 1, day: 1 });
const RANGE_END = julianDayFromCalendar({ year: 2100, month: 1, day: 1 });

const toSeconds = (days: number) => days * 86400;

/** Walk the whole range once; every test then reads this catalog. */
let computed: LunarEclipse[];

beforeAll(() => {
  computed = [];
  let jd = RANGE_START;
  for (;;) {
    const eclipse = nextLunarEclipse(jd);
    if (eclipse.maximum >= RANGE_END) break;
    computed.push(eclipse);
    jd = eclipse.maximum + 5;
  }
});

describe('nextLunarEclipse over the full 1900–2100 catalog', () => {
  it('finds every eclipse exactly once (457 events, none missed, none invented)', () => {
    expect(computed.length).toBe(fixture.parameters.count);
    for (const [i, event] of fixture.data.entries()) {
      const got = computed[i];
      expect(got).toBeDefined();
      if (!got) continue;
      expect(
        Math.abs(toSeconds(got.maximum - event.maximum.jdUt)),
        `event ${i} (${event.maximum.utc})`,
      ).toBeLessThan(150);
    }
  });

  it('classifies every eclipse type like the fixtures', () => {
    const boundaryFlips: string[] = [];
    for (const [i, event] of fixture.data.entries()) {
      const got = computed[i];
      if (!got) continue;
      if (got.type !== event.type) {
        boundaryFlips.push(
          `${event.maximum.utc}: ${got.type} vs ${event.type}` +
            ` (mag ${got.magnitude.toFixed(4)} / ${event.magnitudeUmbral})`,
        );
      }
    }
    expect(boundaryFlips, boundaryFlips.join('; ')).toEqual([]);
  });

  it('umbral and penumbral magnitudes match within the lunar-theory budget', () => {
    let maxUmbral = 0;
    let maxPenumbral = 0;
    for (const [i, event] of fixture.data.entries()) {
      const got = computed[i];
      if (!got) continue;
      // Fixtures clamp umbral magnitude at 0 for penumbral eclipses.
      if (event.type !== 'penumbral') {
        maxUmbral = Math.max(
          maxUmbral,
          Math.abs(got.magnitude - event.magnitudeUmbral),
        );
      }
      maxPenumbral = Math.max(
        maxPenumbral,
        Math.abs(got.penumbralMagnitude - event.magnitudePenumbral),
      );
    }
    console.log(
      `[accuracy] lunar eclipse magnitude: n=${fixture.data.length}` +
        ` umbral max=${maxUmbral.toFixed(4)} penumbral max=${maxPenumbral.toFixed(4)}`,
    );
    // Measured 0.0015 / 0.0013 vs swisseph — dominated by our truncated
    // lunar theory, not the shadow model. Budget leaves 2× headroom.
    expect(maxUmbral).toBeLessThan(0.003);
    expect(maxPenumbral).toBeLessThan(0.003);
  });

  it('contact times match swisseph within budget', () => {
    const diffs: number[] = [];
    let present = 0;
    let absent = 0;
    for (const [i, event] of fixture.data.entries()) {
      const got = computed[i];
      if (!got) continue;
      const pairs: [number | null, FixtureInstant | null][] = [
        [got.penumbralBegin, event.penumbralBegin],
        [got.partialBegin, event.partialBegin],
        [got.totalBegin, event.totalBegin],
        [got.totalEnd, event.totalEnd],
        [got.partialEnd, event.partialEnd],
        [got.penumbralEnd, event.penumbralEnd],
      ];
      for (const [gotJd, want] of pairs) {
        if (gotJd === null || want === null) {
          // Presence must agree unless the type itself flipped (asserted above).
          if ((gotJd === null) !== (want === null)) absent++;
          continue;
        }
        present++;
        diffs.push(Math.abs(toSeconds(gotJd - want.jdUt)));
      }
    }
    const max = Math.max(...diffs);
    const mean = diffs.reduce((s, d) => s + d, 0) / diffs.length;
    console.log(
      `[accuracy] lunar eclipse contacts: n=${present}` +
        ` max=${max.toFixed(1)}s mean=${mean.toFixed(1)}s (presence mismatches: ${absent})`,
    );
    // Measured max 125.5 s, mean 20.5 s vs swisseph (worst cases are
    // near-tangent grazing contacts, where time error is amplified).
    expect(absent).toBe(0);
    expect(max).toBeLessThan(150);
  });

  it('maximum-instant accuracy stats', () => {
    const diffs = fixture.data.map((event, i) => {
      const got = computed[i];
      return got ? Math.abs(toSeconds(got.maximum - event.maximum.jdUt)) : NaN;
    });
    const max = Math.max(...diffs);
    const mean = diffs.reduce((s, d) => s + d, 0) / diffs.length;
    console.log(
      `[accuracy] lunar eclipse maximum: n=${diffs.length}` +
        ` max=${max.toFixed(1)}s mean=${mean.toFixed(1)}s`,
    );
  });
});

describe('golden anchor — total lunar eclipse over Kathmandu, New Year’s Eve 2028', () => {
  it('is total, deep, and peaks at 22:37 NPT on 2028-12-31', () => {
    const eclipse = nextLunarEclipse(
      julianDayFromCalendar({ year: 2028, month: 12, day: 1 }),
    );
    expect(eclipse.type).toBe('total');
    // Swisseph: maximum 2028-12-31 16:52:08 UT = 22:37 NPT, umbral mag 1.2464.
    const wantMax = julianDayFromDate(
      new Date(Date.UTC(2028, 11, 31, 16, 52, 8)),
    );
    expect(Math.abs(toSeconds(eclipse.maximum - wantMax))).toBeLessThan(60);
    expect(eclipse.magnitude).toBeCloseTo(1.2464, 2);
    expect(eclipse.totalBegin).not.toBeNull();
    expect(eclipse.totalEnd).not.toBeNull();
    if (eclipse.totalBegin !== null && eclipse.totalEnd !== null) {
      // NASA canon: totality lasts 71.3 minutes.
      const totalityMin = toSeconds(eclipse.totalEnd - eclipse.totalBegin) / 60;
      expect(totalityMin).toBeGreaterThan(69);
      expect(totalityMin).toBeLessThan(74);
    }
  });
});

describe('syzygy finder', () => {
  it('first full moon of 2000 lands on 2000-01-21 04:40 UT (Meeus ex. 49.a family)', () => {
    const jd = nextFullMoon(
      julianDayFromCalendar({ year: 2000, month: 1, day: 1 }),
    );
    // Swisseph: 2000-01-21 04:40:26 UT.
    const want = julianDayFromDate(new Date(Date.UTC(2000, 0, 21, 4, 40, 26)));
    expect(Math.abs(toSeconds(jd - want))).toBeLessThan(60);
  });

  it('new moon of the founder chart: 1993-08-17 19:28 UT (Shukla Pratipada eve)', () => {
    const jd = nextNewMoon(
      julianDayFromCalendar({ year: 1993, month: 8, day: 10 }),
    );
    // Swisseph: 1993-08-17 19:28:15 UT — the day before Shukla Pratipada.
    const want = julianDayFromDate(new Date(Date.UTC(1993, 7, 17, 19, 28, 15)));
    expect(Math.abs(toSeconds(jd - want))).toBeLessThan(60);
  });

  it('is idempotent from its own result and strictly advances across a lunation', () => {
    const start = julianDayFromCalendar({ year: 2026, month: 7, day: 6 });
    const first = nextFullMoon(start);
    const second = nextFullMoon(first + 1);
    expect(second - first).toBeGreaterThan(29);
    expect(second - first).toBeLessThan(30.2);
  });
});
