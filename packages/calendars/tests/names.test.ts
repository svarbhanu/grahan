import { describe, expect, it } from 'vitest';
import { BS_MONTH_NAMES, BS_WEEKDAY_NAMES } from '../src/index.js';

describe('BS month names', () => {
  it('lists the twelve months Baisakh through Chaitra', () => {
    expect(BS_MONTH_NAMES).toHaveLength(12);
    expect(BS_MONTH_NAMES[0]).toEqual({ roman: 'Baisakh', nepali: 'वैशाख' });
    expect(BS_MONTH_NAMES[11]).toEqual({ roman: 'Chaitra', nepali: 'चैत' });
  });

  it('has unique, non-empty names in both scripts', () => {
    for (const key of ['roman', 'nepali'] as const) {
      const values = BS_MONTH_NAMES.map((m) => m[key]);
      expect(new Set(values).size).toBe(12);
      for (const v of values) expect(v.length).toBeGreaterThan(0);
    }
  });
});

describe('BS weekday names', () => {
  it('runs Sunday to Saturday matching the JS getUTCDay convention', () => {
    expect(BS_WEEKDAY_NAMES).toHaveLength(7);
    expect(BS_WEEKDAY_NAMES[0]?.name).toBe('Sunday');
    expect(BS_WEEKDAY_NAMES[0]?.nepali).toBe('आइतबार');
    expect(BS_WEEKDAY_NAMES[6]?.name).toBe('Saturday');
    // 2026-07-05 is a Sunday: the founder anchor date for todayBs tests.
    expect(new Date('2026-07-05T00:00:00Z').getUTCDay()).toBe(0);
  });

  it('has unique names in every script', () => {
    for (const key of ['name', 'roman', 'nepali'] as const) {
      const values = BS_WEEKDAY_NAMES.map((w) => w[key]);
      expect(new Set(values).size).toBe(7);
    }
  });
});
