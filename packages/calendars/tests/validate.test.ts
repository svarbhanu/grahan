import { describe, expect, it } from 'vitest';
import { bsFromDate, dateFromBs, todayBs } from '../src/index.js';

describe('calendars public boundaries reject garbage with RangeError', () => {
  it('bsFromDate rejects unreal AD dates and out-of-range years', () => {
    expect(() => bsFromDate({ year: 2026, month: 2, day: 30 })).toThrow(
      RangeError,
    );
    expect(() => bsFromDate({ year: 1800, month: 1, day: 1 })).toThrow(
      RangeError,
    );
  });

  it('dateFromBs rejects impossible BS dates', () => {
    expect(() => dateFromBs({ year: 2083, month: 13, day: 1 })).toThrow(
      /month/,
    );
    expect(() => dateFromBs({ year: 2083, month: 1, day: 33 })).toThrow(
      RangeError,
    );
  });

  it('todayBs surfaces Intl RangeError for unknown zones', () => {
    expect(() => todayBs({ timezone: 'Asia/NoSuchPlace' })).toThrow(
      /NoSuchPlace/,
    );
  });
});
