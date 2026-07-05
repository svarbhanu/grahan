import { describe, expect, it } from 'vitest';
import { abhijitMuhurta, findMuhurta } from '../src/index.js';

const KATHMANDU = {
  latitude: 27.7172,
  longitude: 85.324,
  timezone: 'Asia/Kathmandu',
};

// 2026-07-02 (Thursday) in Kathmandu: sunrise 05:12, sunset 19:03 NPT,
// Rahu Kaal 13:51–15:35 (the golden fixture-2 day).
const LOCAL_MIDNIGHT = new Date('2026-07-01T18:15:00Z');
const NEXT_MIDNIGHT = new Date('2026-07-02T18:15:00Z');
const NPT_OFFSET_MS = 5.75 * 3_600_000;

function npt(date: Date): string {
  return new Date(date.getTime() + NPT_OFFSET_MS)
    .toISOString()
    .slice(11, 16);
}

describe('abhijitMuhurta (Kathmandu, 2026-07-02)', () => {
  it('spans the middle 1/15 of daylight around solar noon', () => {
    const window = abhijitMuhurta(new Date('2026-07-02T06:00:00Z'), KATHMANDU);
    expect(window).not.toBeNull();
    if (window === null) return;
    const minutes = (window.end.getTime() - window.start.getTime()) / 60_000;
    // Daylight is 13 h 51 m → one fifteenth ≈ 55.4 minutes.
    expect(minutes).toBeGreaterThan(54);
    expect(minutes).toBeLessThan(57);
    expect(npt(window.start) >= '11:35' && npt(window.start) <= '11:45').toBe(
      true,
    );
    expect(npt(window.end) >= '12:30' && npt(window.end) <= '12:40').toBe(true);
  });
});

describe('findMuhurta (Kathmandu, 2026-07-02, default rules)', () => {
  const windows = findMuhurta({
    from: LOCAL_MIDNIGHT,
    to: NEXT_MIDNIGHT,
    ...KATHMANDU,
  });

  it('returns the two daylight windows around Rahu Kaal', () => {
    expect(windows).toHaveLength(2);
    const [morning, afternoon] = windows;
    // Sunrise 05:12 → first passing 5-min step; window closes at Rahu Kaal.
    expect(npt(morning?.start ?? new Date(0)) <= '05:20').toBe(true);
    expect(npt(morning?.end ?? new Date(0))).toMatch(/^13:5[0-5]$/);
    // Rahu Kaal ends 15:35:26; edges snap to the next 5-min step → 15:40.
    expect(npt(afternoon?.start ?? new Date(0))).toMatch(/^15:(3[5-9]|40)$/);
    expect(npt(afternoon?.end ?? new Date(0)) >= '18:55').toBe(true);
  });

  it('honors a vaar allowlist (Thursday passes, Sunday empties the day)', () => {
    const thursdayOnly = findMuhurta({
      from: LOCAL_MIDNIGHT,
      to: NEXT_MIDNIGHT,
      ...KATHMANDU,
      rules: { allowedVaars: [4] },
    });
    expect(thursdayOnly).toHaveLength(2);
    const sundayOnly = findMuhurta({
      from: LOCAL_MIDNIGHT,
      to: NEXT_MIDNIGHT,
      ...KATHMANDU,
      rules: { allowedVaars: [0] },
    });
    expect(sundayOnly).toHaveLength(0);
  });

  it('element allowlists filter: all tithis pass, no tithis blocks all', () => {
    const all = Array.from({ length: 30 }, (_, i) => i);
    const withAll = findMuhurta({
      from: LOCAL_MIDNIGHT,
      to: NEXT_MIDNIGHT,
      ...KATHMANDU,
      rules: { allowedTithis: all },
      stepMinutes: 15,
    });
    expect(withAll.length).toBeGreaterThan(0);
    const withNone = findMuhurta({
      from: LOCAL_MIDNIGHT,
      to: NEXT_MIDNIGHT,
      ...KATHMANDU,
      rules: { allowedTithis: [] },
      stepMinutes: 15,
    });
    expect(withNone).toHaveLength(0);
  });

  it('daylightOnly=false opens the night, avoidRahuKaal still bites', () => {
    const windows = findMuhurta({
      from: LOCAL_MIDNIGHT,
      to: NEXT_MIDNIGHT,
      ...KATHMANDU,
      rules: { daylightOnly: false },
      stepMinutes: 15,
    });
    expect(windows).toHaveLength(2);
    expect(windows[0]?.start.getTime()).toBe(LOCAL_MIDNIGHT.getTime());
    expect(windows[1]?.end.getTime()).toBe(NEXT_MIDNIGHT.getTime());
  });
});
