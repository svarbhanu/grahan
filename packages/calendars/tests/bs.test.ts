import { describe, expect, it } from 'vitest';
import {
  BS_MAX_YEAR,
  BS_MIN_YEAR,
  BS_MONTH_LENGTHS,
  BS_VERIFIED_THROUGH,
  bsFromDate,
  dateFromBs,
} from '../src/index.js';

describe('bsFromDate ↔ dateFromBs roundtrip sweep', () => {
  it('agrees for every day of every BS year in the table', () => {
    // Walk the whole table day by day: BS advances through the month
    // lengths, AD advances via a JS Date acting as a day counter.
    const cursor = new Date(Date.UTC(1918, 3, 13));
    for (let year = BS_MIN_YEAR; year <= BS_MAX_YEAR; year++) {
      const months = BS_MONTH_LENGTHS[year - BS_MIN_YEAR] ?? [];
      for (let month = 1; month <= 12; month++) {
        for (let day = 1; day <= (months[month - 1] ?? 0); day++) {
          const ad = {
            year: cursor.getUTCFullYear(),
            month: cursor.getUTCMonth() + 1,
            day: cursor.getUTCDate(),
          };
          const bs = bsFromDate(ad);
          if (bs.year !== year || bs.month !== month || bs.day !== day) {
            expect.fail(
              `bsFromDate(${ad.year}-${ad.month}-${ad.day}) = ` +
                `${bs.year}-${bs.month}-${bs.day}, expected ${year}-${month}-${day}`,
            );
          }
          const back = dateFromBs({ year, month, day });
          if (
            back.year !== ad.year ||
            back.month !== ad.month ||
            back.day !== ad.day
          ) {
            expect.fail(
              `dateFromBs(${year}-${month}-${day}) = ` +
                `${back.year}-${back.month}-${back.day}, expected ${ad.year}-${ad.month}-${ad.day}`,
            );
          }
          if (back.weekday.index !== cursor.getUTCDay()) {
            expect.fail(
              `weekday of ${year}-${month}-${day}: ${back.weekday.index}, ` +
                `expected ${cursor.getUTCDay()}`,
            );
          }
          cursor.setUTCDate(cursor.getUTCDate() + 1);
        }
      }
    }
  });
});

describe('bsFromDate', () => {
  it('decorates with month name, weekday, and projection flag', () => {
    const bs = bsFromDate({ year: 2026, month: 7, day: 5 });
    expect(bs.monthName).toEqual({ roman: 'Asar', nepali: 'असार' });
    expect(bs.weekday).toEqual({
      index: 0,
      name: 'Sunday',
      roman: 'Aaitabar',
      nepali: 'आइतबार',
    });
    expect(bs.projected).toBe(bs.year > BS_VERIFIED_THROUGH);
  });

  it('flags projected dates past the verified zone', () => {
    const lastVerified = dateFromBs({
      year: BS_VERIFIED_THROUGH,
      month: 12,
      day: BS_MONTH_LENGTHS[BS_VERIFIED_THROUGH - BS_MIN_YEAR]?.[11] ?? 0,
    });
    expect(
      bsFromDate({
        year: lastVerified.year,
        month: lastVerified.month,
        day: lastVerified.day,
      }).projected,
    ).toBe(false);
    const dayAfter = new Date(
      Date.UTC(lastVerified.year, lastVerified.month - 1, lastVerified.day + 1),
    );
    const firstProjected = bsFromDate({
      year: dayAfter.getUTCFullYear(),
      month: dayAfter.getUTCMonth() + 1,
      day: dayAfter.getUTCDate(),
    });
    expect([
      firstProjected.year,
      firstProjected.month,
      firstProjected.day,
    ]).toEqual([BS_VERIFIED_THROUGH + 1, 1, 1]);
    expect(firstProjected.projected).toBe(true);
  });

  it('rejects dates outside the table', () => {
    expect(() => bsFromDate({ year: 1918, month: 4, day: 12 })).toThrow(
      RangeError,
    );
    const lastAd = dateFromBs({
      year: BS_MAX_YEAR,
      month: 12,
      day: BS_MONTH_LENGTHS[BS_MAX_YEAR - BS_MIN_YEAR]?.[11] ?? 0,
    });
    const dayAfter = new Date(
      Date.UTC(lastAd.year, lastAd.month - 1, lastAd.day + 1),
    );
    expect(() =>
      bsFromDate({
        year: dayAfter.getUTCFullYear(),
        month: dayAfter.getUTCMonth() + 1,
        day: dayAfter.getUTCDate(),
      }),
    ).toThrow(RangeError);
  });

  it('rejects impossible and non-integer AD dates', () => {
    expect(() => bsFromDate({ year: 2026, month: 2, day: 30 })).toThrow(
      /not a real AD date/,
    );
    expect(() => bsFromDate({ year: 2026, month: 13, day: 1 })).toThrow(
      RangeError,
    );
    expect(() => bsFromDate({ year: 2026, month: 7, day: 5.5 })).toThrow(
      /integers/,
    );
  });
});

describe('dateFromBs', () => {
  it('validates BS month and day against the real month lengths', () => {
    expect(() => dateFromBs({ year: 2062, month: 1, day: 31 })).not.toThrow();
    expect(() => dateFromBs({ year: 2062, month: 1, day: 32 })).toThrow(
      /Baisakh 2062 has 31 days/,
    );
    expect(() => dateFromBs({ year: 2050, month: 0, day: 1 })).toThrow(
      /month must be 1–12/,
    );
    expect(() => dateFromBs({ year: 2050, month: 13, day: 1 })).toThrow(
      /month must be 1–12/,
    );
    expect(() => dateFromBs({ year: 1974, month: 12, day: 30 })).toThrow(
      /outside the table/,
    );
    expect(() =>
      dateFromBs({ year: BS_MAX_YEAR + 1, month: 1, day: 1 }),
    ).toThrow(/outside the table/);
    expect(() => dateFromBs({ year: 2050, month: 5, day: 2.5 })).toThrow(
      /integers/,
    );
  });
});
