/**
 * World calendars on the grahan sky engine, Bikram Sambat (the Nepali
 * civil calendar) first. BS is data-driven: month lengths come from
 * committed tables (BS 1975–2100) verified against published calendars,
 * and conversion is exact day-count arithmetic.
 *
 * @module @grahan/calendars
 */

export * from './bs.js';
export * from './bs.data.js';
export * from './names.js';
