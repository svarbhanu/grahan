import { describe, expect, it } from 'vitest';
import * as core from '../src/index.js';

/**
 * The frozen public runtime surface of @grahan/core (v1.0). The index
 * uses `export *`, so any new export in any module lands here silently
 * — this list makes that a conscious, reviewed decision instead.
 * Type-only exports are not runtime keys; the typechecker guards those.
 */
const CORE_SURFACE = [
  'CORE_VERSION',
  'J2000',
  'ascendant',
  'assertCivilDate',
  'assertFinite',
  'assertLatitude',
  'assertLongitude',
  'assertValidDate',
  'calendarFromJulianDay',
  'dateFromJulianDay',
  'dateFromZonedTime',
  'degToRad',
  'degreesToDms',
  'deltaTSeconds',
  'dmsToDegrees',
  'equatorialFromEcliptic',
  'formatDms',
  'greenwichApparentSiderealTime',
  'greenwichMeanSiderealTime',
  'j2000Century',
  'julianDayFromCalendar',
  'julianDayFromDate',
  'localSiderealTime',
  'meanLunarNode',
  'meanObliquity',
  'midheaven',
  'moonPhase',
  'moonPosition',
  'nextCrossing',
  'nextFullMoon',
  'nextLunarEclipse',
  'nextNewMoon',
  'nextSolarEclipse',
  'nextSolarEclipseAt',
  'nextSyzygy',
  'normalizeDegrees',
  'nutation',
  'planetPosition',
  'radToDeg',
  'sunPosition',
  'sunriseSunset',
  'trueLunarNode',
  'trueObliquity',
  'ttFromUt',
  'utcOffsetMinutes',
  'wrap180',
  'zonedTimeFromDate',
];

describe('@grahan/core public surface', () => {
  it('exports exactly the frozen v1.0 surface', () => {
    expect(Object.keys(core).sort()).toEqual(CORE_SURFACE);
  });
});
