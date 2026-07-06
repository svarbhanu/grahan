import { describe, expect, it } from 'vitest';
import * as calendars from '../src/index.js';

/**
 * The frozen public runtime surface of @grahan/calendars (v1.0).
 * Adding an export must mean consciously editing this list.
 */
const CALENDARS_SURFACE = [
  'BS_EPOCH_AD',
  'BS_MAX_YEAR',
  'BS_MIN_YEAR',
  'BS_MONTH_LENGTHS',
  'BS_MONTH_NAMES',
  'BS_VERIFIED_THROUGH',
  'BS_WEEKDAY_NAMES',
  'bsFromDate',
  'dateFromBs',
  'todayBs',
];

describe('@grahan/calendars public surface', () => {
  it('exports exactly the frozen v1.0 surface', () => {
    expect(Object.keys(calendars).sort()).toEqual(CALENDARS_SURFACE);
  });
});
