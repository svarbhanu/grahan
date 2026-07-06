import { describe, expect, it } from 'vitest';
import {
  kundali,
  panchang,
  panchangAtSunrise,
  tithiEndTime,
} from '../src/index.js';

const KTM = { latitude: 27.7172, longitude: 85.324 };
const DATE = new Date('2026-07-02T06:00:00Z');

describe('vedic public boundaries reject garbage with RangeError', () => {
  it('panchang rejects bad coordinates, dates, and timezones', () => {
    const good = { date: DATE, timezone: 'Asia/Kathmandu' };
    expect(() => panchang({ ...good, latitude: 95, longitude: 85 })).toThrow(
      /latitude.*95/,
    );
    expect(() => panchang({ ...good, latitude: 27, longitude: -200 })).toThrow(
      /longitude.*-200/,
    );
    expect(() => panchang({ ...good, ...KTM, date: new Date(NaN) })).toThrow(
      /date/,
    );
    expect(() =>
      panchang({ ...good, ...KTM, timezone: 'Mars/Olympus' }),
    ).toThrow(/Olympus/);
  });

  it('panchangAtSunrise rejects impossible civil dates and coordinates', () => {
    const good = { ...KTM, timezone: 'Asia/Kathmandu' };
    expect(() =>
      panchangAtSunrise({ year: 2026, month: 13, day: 2, ...good }),
    ).toThrow(/month.*13/);
    expect(() =>
      panchangAtSunrise({ year: 2026, month: 7, day: 0, ...good }),
    ).toThrow(/day.*0/);
    expect(() =>
      panchangAtSunrise({
        year: 2026,
        month: 7,
        day: 2,
        latitude: NaN,
        longitude: 85,
        timezone: 'Asia/Kathmandu',
      }),
    ).toThrow(/latitude/);
  });

  it('kundali rejects bad coordinates and invalid birth instants', () => {
    expect(() => kundali({ date: DATE, latitude: 91, longitude: 85 })).toThrow(
      /latitude.*91/,
    );
    expect(() => kundali({ date: new Date(NaN), ...KTM })).toThrow(/date/);
  });

  it('end-time solvers reject non-finite instants', () => {
    expect(() => tithiEndTime(NaN)).toThrow(/jdUt/);
  });
});
