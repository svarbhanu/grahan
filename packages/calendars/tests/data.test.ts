import { describe, expect, it } from 'vitest';
import { julianDayFromCalendar } from '@grahan/core';
import {
  BS_EPOCH_AD,
  BS_MAX_YEAR,
  BS_MIN_YEAR,
  BS_MONTH_LENGTHS,
  BS_VERIFIED_THROUGH,
} from '../src/index.js';

describe('BS month-length table', () => {
  it('covers exactly BS_MIN_YEAR..BS_MAX_YEAR', () => {
    expect(BS_MONTH_LENGTHS).toHaveLength(BS_MAX_YEAR - BS_MIN_YEAR + 1);
    expect(BS_VERIFIED_THROUGH).toBeGreaterThanOrEqual(2083);
    expect(BS_VERIFIED_THROUGH).toBeLessThanOrEqual(BS_MAX_YEAR);
  });

  it('has 12 months of 29–32 days in every year', () => {
    for (const months of BS_MONTH_LENGTHS) {
      expect(months).toHaveLength(12);
      for (const length of months) {
        expect(length).toBeGreaterThanOrEqual(29);
        expect(length).toBeLessThanOrEqual(32);
      }
    }
  });

  it('has only 365- or 366-day years in the verified zone', () => {
    for (let year = BS_MIN_YEAR; year <= BS_VERIFIED_THROUGH; year++) {
      const months = BS_MONTH_LENGTHS[year - BS_MIN_YEAR];
      const sum = (months ?? []).reduce((a, b) => a + b, 0);
      expect([365, 366], `BS ${year} has ${sum} days`).toContain(sum);
    }
  });

  it('spans exactly the day count between the two independent epochs', () => {
    // 1975-01-01 BS = 1918-04-13 AD and 2000-01-01 BS = 1943-04-14 AD are
    // reference dates of two unrelated datasets; the 25 years between them
    // must sum to the AD day gap.
    let span = 0;
    for (let year = 1975; year < 2000; year++) {
      const months = BS_MONTH_LENGTHS[year - BS_MIN_YEAR];
      span += (months ?? []).reduce((a, b) => a + b, 0);
    }
    const gap =
      julianDayFromCalendar({ year: 1943, month: 4, day: 14 }) -
      julianDayFromCalendar(BS_EPOCH_AD);
    expect(span).toBe(gap);
  });
});
