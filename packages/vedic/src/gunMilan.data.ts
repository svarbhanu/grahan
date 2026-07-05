/**
 * Classical ashtakoota tables. Sources: the standard varna/vashya/yoni/
 * gana/nadi assignments and the naisargika (natural) planetary friendship
 * table as given in classical jyotish compilations. Regional variants
 * exist for a few vashya/gana scores; the values here follow the most
 * widely published modern convention.
 */

/** Varna rank by rashi index: 3 Brahmin, 2 Kshatriya, 1 Vaishya, 0 Shudra. */
export const VARNA_BY_RASHI: readonly number[] = [
  2, 1, 0, 3, 2, 1, 0, 3, 2, 1, 0, 3,
];

export type Vashya =
  'chatushpada' | 'manava' | 'jalachara' | 'vanachara' | 'keeta';

export const VASHYA_ORDER: readonly Vashya[] = [
  'chatushpada',
  'manava',
  'jalachara',
  'vanachara',
  'keeta',
];

/** Vashya score matrix, rows/columns in VASHYA_ORDER. */
export const VASHYA_SCORES: readonly (readonly number[])[] = [
  [2, 1, 1, 0, 1],
  [1, 2, 0.5, 0, 1],
  [1, 0.5, 2, 0, 1],
  [0, 0, 0, 2, 0],
  [1, 1, 1, 0, 2],
];

/** The fourteen yonis in matrix order. */
export const YONI_ORDER = [
  'horse',
  'elephant',
  'sheep',
  'serpent',
  'dog',
  'cat',
  'rat',
  'cow',
  'buffalo',
  'tiger',
  'deer',
  'monkey',
  'mongoose',
  'lion',
] as const;

export type Yoni = (typeof YONI_ORDER)[number];

/** Yoni of each nakshatra 0–26 (Ashwini → Revati). */
export const YONI_BY_NAKSHATRA: readonly Yoni[] = [
  'horse', // Ashwini
  'elephant', // Bharani
  'sheep', // Krittika
  'serpent', // Rohini
  'serpent', // Mrigashira
  'dog', // Ardra
  'cat', // Punarvasu
  'sheep', // Pushya
  'cat', // Ashlesha
  'rat', // Magha
  'rat', // Purva Phalguni
  'cow', // Uttara Phalguni
  'buffalo', // Hasta
  'tiger', // Chitra
  'buffalo', // Swati
  'tiger', // Vishakha
  'deer', // Anuradha
  'deer', // Jyeshtha
  'dog', // Mula
  'monkey', // Purva Ashadha
  'mongoose', // Uttara Ashadha
  'monkey', // Shravana
  'lion', // Dhanishta
  'horse', // Shatabhisha
  'lion', // Purva Bhadrapada
  'cow', // Uttara Bhadrapada
  'elephant', // Revati
];

/**
 * Symmetric yoni compatibility matrix (0–4), rows/columns in YONI_ORDER.
 * Diagonal is 4; the seven sworn-enemy pairs (horse–buffalo, elephant–lion,
 * sheep–monkey, serpent–mongoose, dog–deer, cat–rat, cow–tiger) are 0.
 */
export const YONI_SCORES: readonly (readonly number[])[] = [
  [4, 2, 2, 3, 2, 2, 2, 1, 0, 1, 3, 3, 2, 1],
  [2, 4, 3, 3, 2, 2, 2, 2, 3, 1, 2, 3, 2, 0],
  [2, 3, 4, 2, 1, 2, 1, 3, 3, 1, 2, 0, 3, 1],
  [3, 3, 2, 4, 2, 1, 1, 1, 1, 2, 2, 2, 0, 2],
  [2, 2, 1, 2, 4, 2, 1, 2, 2, 1, 0, 2, 1, 1],
  [2, 2, 2, 1, 2, 4, 0, 2, 2, 1, 3, 3, 2, 1],
  [2, 2, 1, 1, 1, 0, 4, 2, 2, 2, 2, 2, 1, 2],
  [1, 2, 3, 1, 2, 2, 2, 4, 3, 0, 3, 2, 2, 1],
  [0, 3, 3, 1, 2, 2, 2, 3, 4, 1, 2, 2, 2, 1],
  [1, 1, 1, 2, 1, 1, 2, 0, 1, 4, 1, 1, 2, 1],
  [3, 2, 2, 2, 0, 3, 2, 3, 2, 1, 4, 2, 2, 1],
  [3, 3, 0, 2, 2, 3, 2, 2, 2, 1, 2, 4, 3, 2],
  [2, 2, 3, 0, 1, 2, 1, 2, 2, 2, 2, 3, 4, 2],
  [1, 0, 1, 2, 1, 1, 2, 1, 1, 1, 1, 2, 2, 4],
];

/** Rashi lords by rashi index (sun/moon/mars/mercury/jupiter/venus/saturn). */
export const LORD_BY_RASHI: readonly string[] = [
  'mars', // Mesha
  'venus', // Vrishabha
  'mercury', // Mithuna
  'moon', // Karka
  'sun', // Simha
  'mercury', // Kanya
  'venus', // Tula
  'mars', // Vrishchika
  'jupiter', // Dhanu
  'saturn', // Makara
  'saturn', // Kumbha
  'jupiter', // Meena
];

/** Naisargika maitri: how the row lord regards the column lord. */
export const FRIENDSHIP: Readonly<
  Record<string, { friends: readonly string[]; enemies: readonly string[] }>
> = {
  sun: { friends: ['moon', 'mars', 'jupiter'], enemies: ['venus', 'saturn'] },
  moon: { friends: ['sun', 'mercury'], enemies: [] },
  mars: { friends: ['sun', 'moon', 'jupiter'], enemies: ['mercury'] },
  mercury: { friends: ['sun', 'venus'], enemies: ['moon'] },
  jupiter: { friends: ['sun', 'moon', 'mars'], enemies: ['mercury', 'venus'] },
  venus: { friends: ['mercury', 'saturn'], enemies: ['sun', 'moon'] },
  saturn: { friends: ['mercury', 'venus'], enemies: ['sun', 'moon', 'mars'] },
};

export type Gana = 'deva' | 'manushya' | 'rakshasa';

/** Gana of each nakshatra 0–26. */
export const GANA_BY_NAKSHATRA: readonly Gana[] = [
  'deva', // Ashwini
  'manushya', // Bharani
  'rakshasa', // Krittika
  'manushya', // Rohini
  'deva', // Mrigashira
  'manushya', // Ardra
  'deva', // Punarvasu
  'deva', // Pushya
  'rakshasa', // Ashlesha
  'rakshasa', // Magha
  'manushya', // Purva Phalguni
  'manushya', // Uttara Phalguni
  'deva', // Hasta
  'rakshasa', // Chitra
  'deva', // Swati
  'rakshasa', // Vishakha
  'deva', // Anuradha
  'rakshasa', // Jyeshtha
  'rakshasa', // Mula
  'manushya', // Purva Ashadha
  'manushya', // Uttara Ashadha
  'deva', // Shravana
  'rakshasa', // Dhanishta
  'rakshasa', // Shatabhisha
  'manushya', // Purva Bhadrapada
  'manushya', // Uttara Bhadrapada
  'deva', // Revati
];

export type Nadi = 'adi' | 'madhya' | 'antya';

/** Nadi of each nakshatra 0–26 (the classical zig-zag cycle). */
export const NADI_BY_NAKSHATRA: readonly Nadi[] = [
  'adi', // Ashwini
  'madhya', // Bharani
  'antya', // Krittika
  'antya', // Rohini
  'madhya', // Mrigashira
  'adi', // Ardra
  'adi', // Punarvasu
  'madhya', // Pushya
  'antya', // Ashlesha
  'antya', // Magha
  'madhya', // Purva Phalguni
  'adi', // Uttara Phalguni
  'adi', // Hasta
  'madhya', // Chitra
  'antya', // Swati
  'antya', // Vishakha
  'madhya', // Anuradha
  'adi', // Jyeshtha
  'adi', // Mula
  'madhya', // Purva Ashadha
  'antya', // Uttara Ashadha
  'antya', // Shravana
  'madhya', // Dhanishta
  'adi', // Shatabhisha
  'adi', // Purva Bhadrapada
  'madhya', // Uttara Bhadrapada
  'antya', // Revati
];
