import { describe, expect, it } from 'vitest';
import * as vedic from '../src/index.js';

/**
 * The frozen public runtime surface of @grahan/vedic (v1.0). The index
 * uses `export *`, so any new export in any module lands here silently
 * — this list makes that a conscious, reviewed decision instead.
 * Type-only exports are not runtime keys; the typechecker guards those.
 */
const VEDIC_SURFACE = [
  'DASHA_ORDER',
  'DASHA_YEARS',
  'FIXED_KARANAS',
  'FRIENDSHIP',
  'GANA_BY_NAKSHATRA',
  'GRAHA_ABBREVIATIONS',
  'GRAHA_NAMES',
  'GRAHA_ORDER',
  'LORD_BY_RASHI',
  'MOVABLE_KARANAS',
  'NADI_BY_NAKSHATRA',
  'NAKSHATRA_NAMES',
  'NAKSHATRA_WIDTH',
  'NAVAMSA_WIDTH',
  'RASHI_NAMES',
  'RASHI_NAMES_EN',
  'TITHI_NAMES',
  'VAAR_NAMES',
  'VARNA_BY_RASHI',
  'VASHYA_ORDER',
  'VASHYA_SCORES',
  'WEEKDAY_NAMES',
  'YOGA_NAMES',
  'YONI_BY_NAKSHATRA',
  'YONI_ORDER',
  'YONI_SCORES',
  'abhijitMuhurta',
  'chartHouses',
  'findMuhurta',
  'grahaSiderealPositions',
  'gunMilan',
  'karana',
  'karanaEndTime',
  'kundali',
  'kundaliSvg',
  'lahiriAyanamsa',
  'nakshatra',
  'nakshatraEndTime',
  'navamsaRashi',
  'panchang',
  'panchangAtSunrise',
  'rahuKaal',
  'siderealLongitude',
  'tithi',
  'tithiEndTime',
  'transits',
  'vaar',
  'vimshottari',
  'yoga',
  'yogaEndTime',
];

describe('@grahan/vedic public surface', () => {
  it('exports exactly the frozen v1.0 surface', () => {
    expect(Object.keys(vedic).sort()).toEqual(VEDIC_SURFACE);
  });
});
