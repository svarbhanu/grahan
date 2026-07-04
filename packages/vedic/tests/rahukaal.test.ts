import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sunriseSunset, zonedTimeFromDate } from '@grahan/core';
import { rahuKaal } from '../src/index.js';

interface RahuKaalFixture {
  data: { sunriseUtc: string; sunsetUtc: string };
}

const fixture = JSON.parse(
  readFileSync(
    new URL('../fixtures/rahu-kaal-ktm.json', import.meta.url),
    'utf8',
  ),
) as RahuKaalFixture;

const THURSDAY = 4;

function nptClock(date: Date): string {
  const z = zonedTimeFromDate(date, 'Asia/Kathmandu');
  return `${String(z.hour).padStart(2, '0')}:${String(z.minute).padStart(2, '0')}`;
}

describe('rahuKaal (CLAUDE.md fixture 2: Kathmandu 2026-07-02, Thursday)', () => {
  it('is 13:51–15:35 NPT from the fixture sunrise/sunset', () => {
    const window = rahuKaal({
      sunrise: new Date(fixture.data.sunriseUtc),
      sunset: new Date(fixture.data.sunsetUtc),
      weekday: THURSDAY,
    });
    expect(nptClock(window.start)).toBe('13:51');
    expect(nptClock(window.end)).toBe('15:35');
  });

  it('agrees end-to-end with our own sunrise engine (±1 min)', () => {
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
    const window = rahuKaal({
      sunrise: events.sunrise.date,
      sunset: events.sunset.date,
      weekday: THURSDAY,
    });
    const startTarget = Date.parse('2026-07-02T08:06:43Z'); // 13:51:43 NPT
    expect(Math.abs(window.start.getTime() - startTarget)).toBeLessThan(60_000);
  });

  it('every weekday yields an eighth-of-daylight window inside the day', () => {
    const sunrise = new Date('2026-07-01T23:26:37Z');
    const sunset = new Date('2026-07-02T13:18:46Z');
    const eighth = (sunset.getTime() - sunrise.getTime()) / 8;
    for (let weekday = 0; weekday < 7; weekday += 1) {
      const window = rahuKaal({ sunrise, sunset, weekday });
      expect(window.start.getTime()).toBeGreaterThanOrEqual(sunrise.getTime());
      expect(window.end.getTime()).toBeLessThanOrEqual(sunset.getTime());
      expect(window.end.getTime() - window.start.getTime()).toBeCloseTo(
        eighth,
        -1,
      );
    }
  });

  it('rejects a fractional weekday', () => {
    expect(() =>
      rahuKaal({
        sunrise: new Date(0),
        sunset: new Date(3600000),
        weekday: 2.5,
      }),
    ).toThrow(RangeError);
  });
});
