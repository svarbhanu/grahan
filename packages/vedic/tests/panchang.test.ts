import { describe, expect, it } from 'vitest';
import { zonedTimeFromDate } from '@grahan/core';
import { panchang } from '../src/index.js';

function nptClock(date: Date): string {
  const z = zonedTimeFromDate(date, 'Asia/Kathmandu');
  return `${String(z.hour).padStart(2, '0')}:${String(z.minute).padStart(2, '0')}`;
}

describe('panchang() acceptance — CLAUDE.md golden fixture 1 (founder chart)', () => {
  const p = panchang({
    date: new Date('1993-08-18T05:15:00Z'), // 11:00 NPT, Birgunj
    latitude: 27.0104,
    longitude: 84.8821,
    timezone: 'Asia/Kathmandu',
  });

  it('Wednesday · Shukla Pratipada · Magha-3 · Parigha · Kimstughna', () => {
    expect(p.vaar.name).toBe('Wednesday');
    expect(p.tithi).toEqual({ index: 0, paksha: 'shukla', name: 'Pratipada' });
    expect(p.nakshatra).toEqual({ index: 9, name: 'Magha', pada: 3 });
    expect(p.yoga.name).toBe('Parigha');
    expect(p.karana.name).toBe('Kimstughna');
  });

  it('has a normal daylight cycle and a new moon', () => {
    expect(p.daylight).toBe('normal');
    expect(p.sunrise).not.toBeNull();
    expect(p.sunset).not.toBeNull();
    expect(p.moonPhase.phaseName).toBe('new');
    expect(p.rahuKaal).not.toBeNull();
  });
});

describe('panchang() acceptance — CLAUDE.md golden fixture 2 (Rahu Kaal)', () => {
  const p = panchang({
    date: new Date('2026-07-02T06:00:00Z'), // midday NPT, Kathmandu, Thursday
    latitude: 27.7172,
    longitude: 85.324,
    timezone: 'Asia/Kathmandu',
  });

  it('sunrise 05:12, sunset 19:03–19:04 NPT (±1 min per target)', () => {
    if (p.sunrise === null || p.sunset === null)
      throw new Error('expected events');
    expect(nptClock(p.sunrise)).toBe('05:11'); // 05:11:37 — "05:12" within ±1 min
    expect(['19:03', '19:04']).toContain(nptClock(p.sunset));
  });

  it('Rahu Kaal 13:51–15:35 NPT (Thursday, 6th eighth)', () => {
    if (p.rahuKaal === null) throw new Error('expected a rahu kaal window');
    expect(p.vaar.name).toBe('Thursday');
    expect(nptClock(p.rahuKaal.start)).toBe('13:51');
    expect(nptClock(p.rahuKaal.end)).toBe('15:35');
  });
});

describe('panchang() polar behaviour', () => {
  it('midnight sun at Utqiagvik: explicit state, no fabricated times', () => {
    const p = panchang({
      date: new Date('2026-06-15T22:00:00Z'),
      latitude: 71.2906,
      longitude: -156.7886,
      timezone: 'America/Anchorage',
    });
    expect(p.daylight).toBe('always-up');
    expect(p.sunrise).toBeNull();
    expect(p.sunset).toBeNull();
    expect(p.rahuKaal).toBeNull();
    expect(p.vaar.name).toBeTruthy(); // civil fallback still names the day
    expect(p.tithi.index).toBeGreaterThanOrEqual(0); // elements independent of daylight
  });
});
