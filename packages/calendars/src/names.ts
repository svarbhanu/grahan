/**
 * Name tables for the Bikram Sambat calendar: the twelve months and the
 * seven weekdays, each in romanized and Devanagari (Nepali) spelling.
 * Spellings follow common Nepali calendar usage (e.g. Hamro Patro) rather
 * than formal Sanskrit forms (Asar, not Ashadha).
 */

/** A calendar name in both scripts grahan renders. */
export interface LocalizedName {
  roman: string;
  nepali: string;
}

/** BS months in order; index 0 = Baisakh (month 1). */
export const BS_MONTH_NAMES: readonly LocalizedName[] = [
  { roman: 'Baisakh', nepali: 'वैशाख' },
  { roman: 'Jestha', nepali: 'जेठ' },
  { roman: 'Asar', nepali: 'असार' },
  { roman: 'Shrawan', nepali: 'साउन' },
  { roman: 'Bhadra', nepali: 'भदौ' },
  { roman: 'Ashwin', nepali: 'असोज' },
  { roman: 'Kartik', nepali: 'कात्तिक' },
  { roman: 'Mangsir', nepali: 'मंसिर' },
  { roman: 'Poush', nepali: 'पुस' },
  { roman: 'Magh', nepali: 'माघ' },
  { roman: 'Falgun', nepali: 'फागुन' },
  { roman: 'Chaitra', nepali: 'चैत' },
];

/** A weekday name; `name` is the English form used across grahan. */
export interface WeekdayName extends LocalizedName {
  name: string;
}

/** Weekdays indexed 0–6 with 0 = Sunday (the JS `Date#getUTCDay` convention). */
export const BS_WEEKDAY_NAMES: readonly WeekdayName[] = [
  { name: 'Sunday', roman: 'Aaitabar', nepali: 'आइतबार' },
  { name: 'Monday', roman: 'Sombar', nepali: 'सोमबार' },
  { name: 'Tuesday', roman: 'Mangalbar', nepali: 'मङ्गलबार' },
  { name: 'Wednesday', roman: 'Budhabar', nepali: 'बुधबार' },
  { name: 'Thursday', roman: 'Bihibar', nepali: 'बिहीबार' },
  { name: 'Friday', roman: 'Shukrabar', nepali: 'शुक्रबार' },
  { name: 'Saturday', roman: 'Shanibar', nepali: 'शनिबार' },
];
