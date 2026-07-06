import { describe, expect, it } from 'vitest';
import {
  ascendant,
  assertCivilDate,
  assertFinite,
  assertLatitude,
  assertLongitude,
  assertValidDate,
  julianDayFromDate,
  nextCrossing,
  nextLunarEclipse,
  nextSolarEclipse,
  nextSolarEclipseAt,
  sunriseSunset,
} from '../src/index.js';

const KTM = { latitude: 27.7172, longitude: 85.324 };

describe('validators', () => {
  it('assertFinite names the parameter and value', () => {
    expect(() => assertFinite(NaN, 'jdUt')).toThrow(/jdUt.*NaN/);
    expect(() => assertFinite(Infinity, 'x')).toThrow(RangeError);
    expect(() => assertFinite(0, 'x')).not.toThrow();
  });

  it('latitude/longitude accept the poles and date line, reject beyond', () => {
    expect(() => assertLatitude(90)).not.toThrow();
    expect(() => assertLatitude(-90)).not.toThrow();
    expect(() => assertLatitude(90.001)).toThrow(/latitude.*90.001/);
    expect(() => assertLongitude(180)).not.toThrow();
    expect(() => assertLongitude(-180)).not.toThrow();
    expect(() => assertLongitude(200)).toThrow(/longitude.*200/);
  });

  it('assertValidDate rejects Invalid Date and non-Dates', () => {
    expect(() => assertValidDate(new Date(NaN))).toThrow(RangeError);
    expect(() => assertValidDate('2026-07-02' as unknown as Date)).toThrow(
      RangeError,
    );
    expect(() => assertValidDate(new Date())).not.toThrow();
  });

  it('assertCivilDate wants integer y/m/d in range', () => {
    expect(() => assertCivilDate(2026, 7, 2)).not.toThrow();
    expect(() => assertCivilDate(2026, 0, 2)).toThrow(/month.*0/);
    expect(() => assertCivilDate(2026, 13, 2)).toThrow(/month.*13/);
    expect(() => assertCivilDate(2026, 7, 32)).toThrow(/day.*32/);
    expect(() => assertCivilDate(2026.5, 7, 2)).toThrow(/year.*2026.5/);
  });
});

describe('public boundaries reject garbage with RangeError', () => {
  it('julianDayFromDate refuses Invalid Date instead of returning NaN', () => {
    expect(() => julianDayFromDate(new Date(NaN))).toThrow(RangeError);
  });

  it('sunriseSunset rejects bad coordinates, dates, and timezones', () => {
    const good = { year: 2026, month: 7, day: 2, timezone: 'Asia/Kathmandu' };
    expect(() =>
      sunriseSunset({ ...good, latitude: 95, longitude: 85 }),
    ).toThrow(/latitude.*95/);
    expect(() =>
      sunriseSunset({ ...good, month: 13, ...KTM } as never),
    ).toThrow(/month/);
    // Intl's own RangeError already names the zone.
    expect(() =>
      sunriseSunset({ ...good, ...KTM, timezone: 'Asia/NoSuchPlace' }),
    ).toThrow(/NoSuchPlace/);
  });

  it('ascendant and eclipse searches reject non-finite instants', () => {
    expect(() => ascendant(NaN, 27, 85)).toThrow(/jdUt/);
    expect(() => nextLunarEclipse(NaN)).toThrow(/jdUt/);
    expect(() => nextSolarEclipse(Infinity)).toThrow(/jdUt/);
    expect(() => nextSolarEclipseAt(NaN, KTM)).toThrow(/jdUt/);
    expect(() =>
      nextSolarEclipseAt(2451545, { latitude: -91, longitude: 0 }),
    ).toThrow(/latitude/);
  });

  it('nextCrossing rejects non-finite arguments', () => {
    const value = (t: number) => t;
    expect(() => nextCrossing(value, NaN, 90, 0)).toThrow(/meanRatePerDay/);
    expect(() => nextCrossing(value, 10, NaN, 0)).toThrow(/targetDegrees/);
    expect(() => nextCrossing(value, 10, 90, NaN)).toThrow(/jdUtStart/);
  });
});
