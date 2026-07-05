import { afterEach, describe, expect, it, vi } from 'vitest';
import { todayBs } from '../src/index.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('todayBs', () => {
  it('reads "today" off the requested timezone, not the machine clock', () => {
    // 23:00 UTC on 2026-07-05: Kathmandu (UTC+5:45) is already on July 6,
    // New York (UTC-4) still on July 5 — one instant, two BS dates.
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-05T23:00:00Z'));
    const kathmandu = todayBs({ timezone: 'Asia/Kathmandu' });
    expect([kathmandu.year, kathmandu.month, kathmandu.day]).toEqual([
      2083, 3, 22,
    ]);
    expect(kathmandu.weekday.name).toBe('Monday');
    const newYork = todayBs({ timezone: 'America/New_York' });
    expect([newYork.year, newYork.month, newYork.day]).toEqual([2083, 3, 21]);
    expect(newYork.weekday.name).toBe('Sunday');
  });

  it('rejects invalid timezone names', () => {
    expect(() => todayBs({ timezone: 'Asia/Katmandoo' })).toThrow(RangeError);
  });
});
