import { describe, expect, it } from 'vitest';
import {
  J2000,
  calendarFromJulianDay,
  dateFromJulianDay,
  j2000Century,
  julianDayFromCalendar,
  julianDayFromDate,
} from '../src/index.js';

// Worked examples from Meeus, Astronomical Algorithms (2nd ed.), ch. 7.
// [year, month, fractional day, expected JD]. Dates before 1582-10-15 are
// in the Julian calendar, as in the book.
const meeusExamples: [number, number, number, number][] = [
  [2000, 1, 1.5, 2451545.0],
  [1999, 1, 1.0, 2451179.5],
  [1987, 1, 27.0, 2446822.5],
  [1987, 6, 19.5, 2446966.0],
  [1988, 1, 27.0, 2447187.5],
  [1988, 6, 19.5, 2447332.0],
  [1957, 10, 4.81, 2436116.31],
  [1900, 1, 1.0, 2415020.5],
  [1600, 1, 1.0, 2305447.5],
  [1600, 12, 31.0, 2305812.5],
  [837, 4, 10.3, 2026871.8],
  [-1000, 7, 12.5, 1356001.0],
  [-1000, 2, 29.0, 1355866.5],
  [-1001, 8, 17.9, 1355671.4],
  [-4712, 1, 1.5, 0.0],
];

describe('julianDayFromCalendar', () => {
  it.each(meeusExamples)('%i-%i-%f → JD %f', (year, month, day, jd) => {
    expect(julianDayFromCalendar({ year, month, day })).toBeCloseTo(jd, 6);
  });
});

describe('calendarFromJulianDay', () => {
  // Inverse worked examples, Meeus ch. 7 (example 7.c and exercises).
  it('JD 2436116.31 → 1957 October 4.81', () => {
    const c = calendarFromJulianDay(2436116.31);
    expect(c.year).toBe(1957);
    expect(c.month).toBe(10);
    expect(c.day).toBeCloseTo(4.81, 6);
  });

  it('JD 1842713.0 → 333 January 27.5 (Julian calendar)', () => {
    const c = calendarFromJulianDay(1842713.0);
    expect(c.year).toBe(333);
    expect(c.month).toBe(1);
    expect(c.day).toBeCloseTo(27.5, 6);
  });

  it('JD 1507900.13 → -584 May 28.63 (Julian calendar)', () => {
    const c = calendarFromJulianDay(1507900.13);
    expect(c.year).toBe(-584);
    expect(c.month).toBe(5);
    expect(c.day).toBeCloseTo(28.63, 6);
  });

  it.each(meeusExamples)('round-trips %i-%i-%f', (year, month, day) => {
    const c = calendarFromJulianDay(
      julianDayFromCalendar({ year, month, day }),
    );
    expect(c.year).toBe(year);
    expect(c.month).toBe(month);
    expect(c.day).toBeCloseTo(day, 6);
  });
});

describe('julianDayFromDate / dateFromJulianDay', () => {
  it('J2000.0: 2000-01-01T12:00Z → JD 2451545.0', () => {
    expect(julianDayFromDate(new Date(Date.UTC(2000, 0, 1, 12)))).toBe(J2000);
  });

  it('Unix epoch → JD 2440587.5', () => {
    expect(julianDayFromDate(new Date(0))).toBe(2440587.5);
  });

  it('round-trips to the millisecond', () => {
    const d = new Date(Date.UTC(1993, 7, 18, 5, 15, 0));
    expect(dateFromJulianDay(julianDayFromDate(d)).getTime()).toBe(d.getTime());
  });
});

describe('j2000Century', () => {
  it('is 0 at J2000.0', () => {
    expect(j2000Century(J2000)).toBe(0);
  });

  it('matches Meeus example 12.a: 1987 April 10.0 TD', () => {
    // Meeus gives T = -0.127296372348 for JD 2446895.5.
    expect(j2000Century(2446895.5)).toBeCloseTo(-0.127296372348, 12);
  });
});
