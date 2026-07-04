import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sunriseSunset, type SunEvent } from '../src/index.js';

interface SunriseFixture {
  parameters: {
    sites: { name: string; lat: number; lon: number; tz: string }[];
  };
  data: { site: string; date: string; sunrise: string; sunset: string }[];
}

const fixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/sunrise-sunset.json', import.meta.url),
    'utf8',
  ),
) as SunriseFixture;

const sites = new Map(fixture.parameters.sites.map((s) => [s.name, s]));

/** Fixture status strings use snake_case; the API uses kebab-case kinds. */
function expectMatches(
  actual: SunEvent,
  expected: string,
  label: string,
): number | null {
  if (expected === 'always_up' || expected === 'always_down') {
    expect(actual.kind, label).toBe(expected.replace('_', '-'));
    return null;
  }
  if (actual.kind !== 'rises') {
    throw new Error(
      `${label}: expected an event at ${expected}, got ${actual.kind}`,
    );
  }
  return (actual.date.getTime() - Date.parse(expected)) / 1000;
}

describe('sunriseSunset vs swisseph (150 site-days, 5 sites incl. 71°N)', () => {
  it('every event within ±60 s, every polar state exact', () => {
    const diffs: number[] = [];
    let polarRows = 0;
    for (const row of fixture.data) {
      const site = sites.get(row.site);
      if (!site) throw new Error(`unknown site ${row.site}`);
      const [year, month, day] = row.date.split('-').map(Number) as [
        number,
        number,
        number,
      ];
      const events = sunriseSunset({
        year,
        month,
        day,
        latitude: site.lat,
        longitude: site.lon,
        timezone: site.tz,
      });
      const label = `${row.site} ${row.date}`;
      const riseDiff = expectMatches(
        events.sunrise,
        row.sunrise,
        `${label} sunrise`,
      );
      const setDiff = expectMatches(
        events.sunset,
        row.sunset,
        `${label} sunset`,
      );
      for (const diff of [riseDiff, setDiff]) {
        if (diff === null) polarRows += 1;
        else diffs.push(diff);
      }
    }
    const maxAbs = Math.max(...diffs.map(Math.abs));
    const meanAbs = diffs.reduce((s, d) => s + Math.abs(d), 0) / diffs.length;
    console.log(
      `[accuracy] sunrise/sunset: n=${diffs.length} max=${maxAbs.toFixed(1)}s` +
        ` mean=${meanAbs.toFixed(1)}s polar-states=${polarRows}`,
    );
    expect(polarRows).toBeGreaterThan(0); // Utqiagvik must exercise the edge
    expect(maxAbs).toBeLessThan(60);
  });

  it('reproduces the Rahu Kaal golden inputs (Kathmandu 2026-07-02)', () => {
    const events = sunriseSunset({
      year: 2026,
      month: 7,
      day: 2,
      latitude: 27.7172,
      longitude: 85.324,
      timezone: 'Asia/Kathmandu',
    });
    if (events.sunrise.kind !== 'rises' || events.sunset.kind !== 'rises') {
      throw new Error('Kathmandu must have both events');
    }
    const riseDiff = Math.abs(
      events.sunrise.date.getTime() - Date.parse('2026-07-01T23:26:37Z'),
    );
    const setDiff = Math.abs(
      events.sunset.date.getTime() - Date.parse('2026-07-02T13:18:46Z'),
    );
    expect(riseDiff).toBeLessThan(60_000);
    expect(setDiff).toBeLessThan(60_000);
  });
});
