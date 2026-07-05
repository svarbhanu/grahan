/** Canonical name tables for the panchang elements (IAST-less spellings). */

/** Tithi names within a paksha (1st–14th); Purnima/Amavasya are special. */
export const TITHI_NAMES: readonly string[] = [
  'Pratipada',
  'Dwitiya',
  'Tritiya',
  'Chaturthi',
  'Panchami',
  'Shashthi',
  'Saptami',
  'Ashtami',
  'Navami',
  'Dashami',
  'Ekadashi',
  'Dwadashi',
  'Trayodashi',
  'Chaturdashi',
];

export const NAKSHATRA_NAMES: readonly string[] = [
  'Ashwini',
  'Bharani',
  'Krittika',
  'Rohini',
  'Mrigashira',
  'Ardra',
  'Punarvasu',
  'Pushya',
  'Ashlesha',
  'Magha',
  'Purva Phalguni',
  'Uttara Phalguni',
  'Hasta',
  'Chitra',
  'Swati',
  'Vishakha',
  'Anuradha',
  'Jyeshtha',
  'Mula',
  'Purva Ashadha',
  'Uttara Ashadha',
  'Shravana',
  'Dhanishta',
  'Shatabhisha',
  'Purva Bhadrapada',
  'Uttara Bhadrapada',
  'Revati',
];

export const YOGA_NAMES: readonly string[] = [
  'Vishkambha',
  'Priti',
  'Ayushman',
  'Saubhagya',
  'Shobhana',
  'Atiganda',
  'Sukarma',
  'Dhriti',
  'Shula',
  'Ganda',
  'Vriddhi',
  'Dhruva',
  'Vyaghata',
  'Harshana',
  'Vajra',
  'Siddhi',
  'Vyatipata',
  'Variyan',
  'Parigha',
  'Shiva',
  'Siddha',
  'Sadhya',
  'Shubha',
  'Shukla',
  'Brahma',
  'Indra',
  'Vaidhriti',
];

/** The seven movable karanas, cycling through slots 1–56. */
export const MOVABLE_KARANAS: readonly string[] = [
  'Bava',
  'Balava',
  'Kaulava',
  'Taitila',
  'Gara',
  'Vanija',
  'Vishti',
];

/** The fixed karanas: slot 0, then slots 57–59. */
export const FIXED_KARANAS: readonly string[] = [
  'Shakuni',
  'Chatushpada',
  'Naga',
];

/** The twelve rashis (sidereal signs), 0 = Mesha. */
export const RASHI_NAMES: readonly string[] = [
  'Mesha',
  'Vrishabha',
  'Mithuna',
  'Karka',
  'Simha',
  'Kanya',
  'Tula',
  'Vrishchika',
  'Dhanu',
  'Makara',
  'Kumbha',
  'Meena',
];

/** Western names for the same twelve signs, 0 = Aries. */
export const RASHI_NAMES_EN: readonly string[] = [
  'Aries',
  'Taurus',
  'Gemini',
  'Cancer',
  'Leo',
  'Virgo',
  'Libra',
  'Scorpio',
  'Sagittarius',
  'Capricorn',
  'Aquarius',
  'Pisces',
];

/** The nine grahas in their conventional order. */
export const GRAHA_ORDER = [
  'sun',
  'moon',
  'mars',
  'mercury',
  'jupiter',
  'venus',
  'saturn',
  'rahu',
  'ketu',
] as const;

export type Graha = (typeof GRAHA_ORDER)[number];

/** Sanskrit graha names, keyed by graha id. */
export const GRAHA_NAMES: Readonly<Record<Graha, string>> = {
  sun: 'Surya',
  moon: 'Chandra',
  mars: 'Mangal',
  mercury: 'Budha',
  jupiter: 'Guru',
  venus: 'Shukra',
  saturn: 'Shani',
  rahu: 'Rahu',
  ketu: 'Ketu',
};

/** Two-letter chart abbreviations, keyed by graha id. */
export const GRAHA_ABBREVIATIONS: Readonly<Record<Graha, string>> = {
  sun: 'Su',
  moon: 'Mo',
  mars: 'Ma',
  mercury: 'Me',
  jupiter: 'Ju',
  venus: 'Ve',
  saturn: 'Sa',
  rahu: 'Ra',
  ketu: 'Ke',
};

export const WEEKDAY_NAMES: readonly string[] = [
  'Sunday',
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
];

export const VAAR_NAMES: readonly string[] = [
  'Ravivaar',
  'Somvaar',
  'Mangalvaar',
  'Budhavaar',
  'Guruvaar',
  'Shukravaar',
  'Shanivaar',
];
