import { describe, expect, it } from 'vitest';
import {
  dateFromZonedTime,
  utcOffsetMinutes,
  zonedTimeFromDate,
} from '../src/index.js';

describe('utcOffsetMinutes', () => {
  it('Kathmandu is UTC+5:45', () => {
    expect(
      utcOffsetMinutes('Asia/Kathmandu', new Date(Date.UTC(2026, 6, 2))),
    ).toBe(345);
  });

  it('Kathmandu was UTC+5:30 before 1986', () => {
    expect(
      utcOffsetMinutes('Asia/Kathmandu', new Date(Date.UTC(1980, 0, 1))),
    ).toBe(330);
  });

  it('New York: EST in winter, EDT in summer', () => {
    expect(
      utcOffsetMinutes('America/New_York', new Date(Date.UTC(2026, 0, 15))),
    ).toBe(-300);
    expect(
      utcOffsetMinutes('America/New_York', new Date(Date.UTC(2026, 6, 15))),
    ).toBe(-240);
  });

  it('rejects an unknown zone', () => {
    expect(() => utcOffsetMinutes('Asia/Notaplace', new Date())).toThrow(
      RangeError,
    );
  });
});

describe('dateFromZonedTime', () => {
  it('founder-chart instant: 1993-08-18 11:00 NPT → 05:15 UTC', () => {
    const d = dateFromZonedTime(
      { year: 1993, month: 8, day: 18, hour: 11, minute: 0, second: 0 },
      'Asia/Kathmandu',
    );
    expect(d.toISOString()).toBe('1993-08-18T05:15:00.000Z');
  });

  it('maps a nonexistent spring-forward time to a real nearby instant', () => {
    // 02:30 on 2026-03-08 never happens in New York (clocks jump 02:00→03:00).
    const d = dateFromZonedTime(
      { year: 2026, month: 3, day: 8, hour: 2, minute: 30, second: 0 },
      'America/New_York',
    );
    const wall = zonedTimeFromDate(d, 'America/New_York');
    expect([1, 3]).toContain(wall.hour);
    expect(wall.minute).toBe(30);
  });

  it('rejects years before 100 CE (Date.UTC two-digit-year pitfall)', () => {
    expect(() =>
      dateFromZonedTime(
        { year: 99, month: 1, day: 1, hour: 0, minute: 0, second: 0 },
        'Asia/Kathmandu',
      ),
    ).toThrow(RangeError);
  });
});

describe('round trips', () => {
  const zones = [
    'Asia/Kathmandu',
    'America/New_York',
    'Pacific/Kiritimati',
    'UTC',
  ];
  const instants = [
    Date.UTC(2026, 6, 2, 13, 51, 0),
    Date.UTC(1993, 7, 18, 5, 15, 0),
    Date.UTC(2026, 10, 1, 5, 30, 0), // inside the US fall-back window
    Date.UTC(1970, 0, 1, 0, 0, 0),
  ];

  it.each(zones)('UTC → %s wall clock → UTC is identity', (zone) => {
    for (const ms of instants) {
      const date = new Date(ms);
      const wall = zonedTimeFromDate(date, zone);
      expect(dateFromZonedTime(wall, zone).getTime()).toBe(ms);
    }
  });
});
