import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { panchangAtSunrise } from '../src/index.js';

interface FixtureSpan {
  index: number;
  pada?: number;
  startJdUt: number | null;
  startUtc: string | null;
  endJdUt: number;
  endUtc: string;
}

interface DayRecord {
  date: string;
  site: string;
  daylight: 'normal' | 'always_up' | 'always_down';
  vaarIndex: number;
  sunriseUtc: string | null;
  sunsetUtc: string | null;
  windowStartUtc: string;
  windowEndUtc: string;
  kshayaTithi: boolean;
  vriddhiTithi: boolean;
  tithi: FixtureSpan[];
  karana: FixtureSpan[];
  nakshatra: FixtureSpan[];
  yoga: FixtureSpan[];
}

const fixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/panchang-at-sunrise.json', import.meta.url),
    'utf8',
  ),
) as {
  source: string;
  parameters: {
    sites: Record<string, { lat: number; lon: number; tz: string }>;
  };
  data: DayRecord[];
};

const ELEMENTS = ['tithi', 'karana', 'nakshatra', 'yoga'] as const;
/** End instants measured at max 37.5 s vs swisseph; window edges add sunrise error. */
const INSTANT_TOLERANCE_S = 60;

function compute(record: DayRecord) {
  const site = fixture.parameters.sites[record.site];
  if (!site) throw new Error(`unknown site ${record.site}`);
  const [year, month, day] = record.date.split('-').map(Number);
  return panchangAtSunrise({
    year: year ?? 0,
    month: month ?? 0,
    day: day ?? 0,
    latitude: site.lat,
    longitude: site.lon,
    timezone: site.tz,
  });
}

function secondsFrom(iso: string, date: Date): number {
  return Math.abs(date.getTime() - Date.parse(iso)) / 1000;
}

describe('panchangAtSunrise vs swisseph day records', () => {
  it('fixture is the swisseph set with kshaya and vriddhi coverage', () => {
    expect(fixture.source).toContain('swisseph');
    expect(fixture.data.length).toBeGreaterThanOrEqual(100);
    expect(
      fixture.data.filter((r) => r.kshayaTithi).length,
    ).toBeGreaterThanOrEqual(3);
    expect(
      fixture.data.filter((r) => r.vriddhiTithi).length,
    ).toBeGreaterThanOrEqual(3);
  });

  it('reproduces every day record: window, vaar, spans, instants', () => {
    const diffs: number[] = [];
    for (const record of fixture.data) {
      const p = compute(record);

      expect(p.daylight).toBe(record.daylight.replace('_', '-'));
      expect(p.vaar.index).toBe(record.vaarIndex);
      if (record.sunriseUtc === null) {
        expect(p.sunrise).toBeNull();
      } else {
        expect(
          secondsFrom(record.sunriseUtc, p.sunrise ?? new Date(0)),
        ).toBeLessThan(60);
      }
      expect(secondsFrom(record.windowStartUtc, p.window.start)).toBeLessThan(
        60,
      );
      expect(secondsFrom(record.windowEndUtc, p.window.end)).toBeLessThan(60);

      for (const name of ELEMENTS) {
        const expected = record[name];
        const actual = p[name];
        expect(
          actual.map((s) => s.index),
          `${record.site} ${record.date} ${name}`,
        ).toEqual(expected.map((s) => s.index));
        for (let i = 0; i < expected.length; i++) {
          const want = expected[i];
          const got = actual[i];
          if (!want || !got) continue;
          const diff = secondsFrom(want.endUtc, got.endsAt);
          diffs.push(diff);
          expect(diff).toBeLessThan(INSTANT_TOLERANCE_S);
          if (want.startUtc === null) {
            expect(got.startsAt).toBeNull();
          } else {
            expect(
              secondsFrom(want.startUtc, got.startsAt ?? new Date(0)),
            ).toBeLessThan(INSTANT_TOLERANCE_S);
          }
          if (want.pada !== undefined && 'pada' in got) {
            expect(got.pada).toBe(want.pada);
          }
        }
      }
    }
    const maxAbs = Math.max(...diffs);
    const mean = diffs.reduce((sum, d) => sum + d, 0) / diffs.length;
    console.log(
      `[accuracy] span-ends: n=${diffs.length} max=${maxAbs.toFixed(1)}s mean=${mean.toFixed(1)}s`,
    );
  });

  it('chains spans: each startsAt equals the previous endsAt', () => {
    for (const record of fixture.data) {
      const p = compute(record);
      for (const name of ELEMENTS) {
        const spans = p[name];
        expect(spans[0]?.startsAt).toBeNull();
        for (let i = 1; i < spans.length; i++) {
          expect(spans[i]?.startsAt?.getTime()).toBe(
            spans[i - 1]?.endsAt.getTime(),
          );
        }
        // Every span but the last ends inside the window; the last ends at
        // or past the window end (that is the honest "upto 26:15" value).
        for (let i = 0; i < spans.length - 1; i++) {
          expect(spans[i]?.endsAt.getTime()).toBeLessThan(
            p.window.end.getTime(),
          );
        }
        const last = spans[spans.length - 1];
        expect(last?.endsAt.getTime()).toBeGreaterThanOrEqual(
          p.window.end.getTime() - INSTANT_TOLERANCE_S * 1000,
        );
      }
    }
  });

  it('kshaya day holds three tithi spans, vriddhi day one', () => {
    const kshaya = fixture.data.find((r) => r.kshayaTithi);
    const vriddhi = fixture.data.find((r) => r.vriddhiTithi);
    expect(kshaya).toBeDefined();
    expect(vriddhi).toBeDefined();
    if (!kshaya || !vriddhi) return;
    const pk = compute(kshaya);
    expect(pk.tithi).toHaveLength(3);
    // The skipped middle tithi never touches a sunrise.
    expect(pk.tithi[1]?.startsAt?.getTime()).toBeGreaterThan(
      pk.window.start.getTime(),
    );
    expect(pk.tithi[1]?.endsAt.getTime()).toBeLessThan(pk.window.end.getTime());
    const pv = compute(vriddhi);
    expect(pv.tithi).toHaveLength(1);
    expect(pv.tithi[0]?.endsAt.getTime()).toBeGreaterThan(
      pv.window.end.getTime(),
    );
  });

  it('golden: founder date 1993-08-18 Birgunj is a Wednesday of Shukla Pratipada', () => {
    const p = panchangAtSunrise({
      year: 1993,
      month: 8,
      day: 18,
      latitude: 27.0104,
      longitude: 84.8821,
      timezone: 'Asia/Kathmandu',
    });
    expect(p.vaar.name).toBe('Wednesday');
    expect(p.tithi[0]?.name).toBe('Pratipada');
    expect(p.tithi[0]?.paksha).toBe('shukla');
    expect(p.nakshatra[0]?.name).toBe('Magha');
    expect(p.yoga[0]?.name).toBe('Parigha');
    expect(p.karana[0]?.name).toBe('Kimstughna');
    // Pratipada runs out at 16:00:35 UT = 21:45 NPT.
    expect(p.tithi[0]?.endsAt.toISOString().slice(0, 16)).toBe(
      '1993-08-18T16:00',
    );
  });

  it('golden: 2026-07-02 Kathmandu keeps its Rahu Kaal 13:51–15:35 NPT', () => {
    const p = panchangAtSunrise({
      year: 2026,
      month: 7,
      day: 2,
      latitude: 27.7172,
      longitude: 85.324,
      timezone: 'Asia/Kathmandu',
    });
    expect(p.vaar.name).toBe('Thursday');
    const npt = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Kathmandu',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    expect(p.rahuKaal).not.toBeNull();
    if (!p.rahuKaal) return;
    expect(npt.format(p.rahuKaal.start)).toBe('13:51');
    expect(npt.format(p.rahuKaal.end)).toBe('15:35');
    // Krishna Dwitiya at sunrise, Tritiya after 09:53 NPT.
    expect(p.tithi[0]?.index).toBe(16);
    expect(p.tithi[1]?.index).toBe(17);
  });

  it('polar: Utqiagvik June is always-up with a midnight window', () => {
    const p = panchangAtSunrise({
      year: 2026,
      month: 6,
      day: 15,
      latitude: 71.2906,
      longitude: -156.7886,
      timezone: 'America/Anchorage',
    });
    expect(p.daylight).toBe('always-up');
    expect(p.sunrise).toBeNull();
    expect(p.rahuKaal).toBeNull();
    // Local midnight AKDT = 08:00 UTC.
    expect(p.window.start.toISOString()).toBe('2026-06-15T08:00:00.000Z');
    expect(p.window.end.toISOString()).toBe('2026-06-16T08:00:00.000Z');
    expect(p.tithi.length).toBeGreaterThanOrEqual(1);
  });
});
