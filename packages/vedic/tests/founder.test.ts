import { describe, expect, it } from 'vitest';
import { moonPosition, sunPosition, sunriseSunset } from '@grahan/core';
import {
  karana,
  lahiriAyanamsa,
  nakshatra,
  siderealLongitude,
  tithi,
  vaar,
  yoga,
} from '../src/index.js';

// CLAUDE.md fixture 1: 1993-08-18 11:00 NPT, Birgunj (27.0104 N, 84.8821 E).
const JD = 2449217.71875;
const INSTANT = new Date('1993-08-18T05:15:00Z');

describe('founder chart (end-to-end through core + vedic)', () => {
  const sunSid = siderealLongitude(sunPosition(JD).apparentLongitude, JD);
  const moonSid = siderealLongitude(moonPosition(JD).apparentLongitude, JD);

  it('sidereal Sun in Leo 1°30′, Moon in Leo 7°12′ (±0.05°)', () => {
    expect(Math.abs(sunSid - 121.5)).toBeLessThan(0.05);
    expect(Math.abs(moonSid - 127.2)).toBeLessThan(0.05);
  });

  it('ayanamsa 23.7681°', () => {
    expect(lahiriAyanamsa(JD)).toBeCloseTo(23.7681, 3);
  });

  it('Shukla Pratipada · Magha pada 3 · Parigha · Kimstughna', () => {
    const sun = sunPosition(JD).apparentLongitude;
    const moon = moonPosition(JD).apparentLongitude;
    expect(tithi(sun, moon)).toEqual({
      index: 0,
      paksha: 'shukla',
      name: 'Pratipada',
    });
    expect(nakshatra(moonSid)).toEqual({ index: 9, name: 'Magha', pada: 3 });
    expect(yoga(sunSid, moonSid)).toEqual({ index: 18, name: 'Parigha' });
    expect(karana(sun, moon)).toEqual({ index: 0, name: 'Kimstughna' });
  });

  it('vaar is Wednesday (birth after sunrise)', () => {
    const events = sunriseSunset({
      year: 1993,
      month: 8,
      day: 18,
      latitude: 27.0104,
      longitude: 84.8821,
      timezone: 'Asia/Kathmandu',
    });
    if (events.sunrise.kind !== 'rises')
      throw new Error('Birgunj must have a sunrise');
    const result = vaar(INSTANT, 'Asia/Kathmandu', events.sunrise.date);
    expect(result.name).toBe('Wednesday');
    expect(result.index).toBe(3);
  });

  it('an instant before sunrise belongs to the previous vaar', () => {
    const sunrise = new Date('1993-08-18T00:00:00Z'); // pretend 05:45 NPT sunrise
    const beforeSunrise = new Date('1993-08-17T23:00:00Z'); // 04:45 NPT on the 18th
    expect(vaar(beforeSunrise, 'Asia/Kathmandu', sunrise).name).toBe('Tuesday');
  });
});
