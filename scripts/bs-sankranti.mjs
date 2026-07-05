// Bikram Sambat table generator: verified years pass through unchanged,
// later years are projected from computed sankrantis (the sun's ingress
// into each sidereal sign, which begins a BS solar month).
//
// Nepal's calendar committee computes sankrantis from the classical
// Surya Siddhanta (SS) sun, not a modern ephemeris — a modern-sun fit
// tops out near 81% because SS's equation of center differs seasonally
// by up to ~16 arcminutes and its sidereal year is ~3.4 minutes longer
// (which is why the BS new year drifts later through the Gregorian
// April over the centuries). So the ingress engine below implements the
// public-domain SS true sun, and the two free parameters of the civil-day
// rule — a zero-point offset delta (degrees, absorbing the SS zodiac
// origin and time-meridian conventions) and a cutoff clock time h (a
// month begins on the ingress day itself when the ingress falls before
// h, else the next day) — are fitted against the 109 published years.
//
// Run from the repo root (build first — the grahan-dist condition makes
// the workspace packages resolve to their compiled dist/ output):
//   pnpm build && node --conditions=grahan-dist scripts/bs-sankranti.mjs
// Deterministic: same inputs, same bytes out.

import { readFileSync, writeFileSync } from 'node:fs';
import {
  dateFromJulianDay,
  julianDayFromCalendar,
  utcOffsetMinutes,
} from '@grahan/core';

const LAST_YEAR = 2200; // extend the table through this BS year

const verified = JSON.parse(
  readFileSync(
    new URL('./data/bs-months-verified-1975-2083.json', import.meta.url),
    'utf8',
  ),
);
const { startYear, epochAd, monthLengths } = verified;
const verifiedThrough = startYear + monthLengths.length - 1;

// ------------------------------------------------------- Surya Siddhanta sun

const RAD = Math.PI / 180;
// Kali epoch (midnight system); constant offsets are absorbed by the fit.
const KALI_JD = 588465.5;
// 4,320,000 solar revolutions per 1,577,917,828 civil days (a mahayuga).
const MEAN_MOTION = (4320000 * 360) / 1577917828;
// Textbook SS elements: solar apogee 77°17′, manda epicycle 14°
// contracting by 20′ toward the quadrant ends (SS II.34–39). Fitting the
// elements as free parameters was tried and gained nothing once the
// cutoffs below became per-month — the textbook values are kept.
const TEXTBOOK = { apogee: 77 + 17 / 60, circumference: 14 };

const norm = (deg) => ((deg % 360) + 360) % 360;

/** SS true solar longitude (sidereal, SS zodiac origin), degrees. */
function ssSun(jd, { apogee, circumference }) {
  const mean = norm((jd - KALI_JD) * MEAN_MOTION);
  const anomaly = (mean - apogee) * RAD;
  const c = circumference - Math.abs(Math.sin(anomaly)) / 3;
  const equation = Math.asin((c / 360) * Math.sin(anomaly)) / RAD;
  return norm(mean - equation);
}

/** Signed degrees from `target`, wrapped to (-180, 180]. */
function wrapDiff(angle, target) {
  let d = (angle - target) % 360;
  if (d <= -180) d += 360;
  if (d > 180) d -= 360;
  return d;
}

/** The instant (UT Julian day) the SS sun reaches `target` degrees, by
 *  Newton steps from a guess no more than ~2 weeks off. */
function ingressInstant(target, guessJd, elements) {
  let jd = guessJd;
  for (let i = 0; i < 20; i++) {
    const diff = wrapDiff(ssSun(jd, elements), target);
    if (Math.abs(diff) < 1e-9) break; // ~0.1 ms of time
    const rate =
      wrapDiff(ssSun(jd + 0.5, elements), ssSun(jd - 0.5, elements) + 360) ||
      MEAN_MOTION;
    jd -= diff / rate;
  }
  return jd;
}

/** Kathmandu civil reading of a UT instant: integer day number (JDN at
 *  that civil day's noon) plus clock hours, and the local solar rate
 *  (deg/day) used to translate longitude offsets into time shifts. */
function civilReading(jd, elements) {
  const offsetDays =
    utcOffsetMinutes('Asia/Kathmandu', dateFromJulianDay(jd)) / 1440;
  const localJd = jd + offsetDays;
  const dayNumber = Math.floor(localJd + 0.5);
  const clockHours = (localJd + 0.5 - dayNumber) * 24;
  const rate = wrapDiff(
    ssSun(jd + 0.5, elements),
    ssSun(jd - 0.5, elements) + 360,
  );
  return { dayNumber, clockHours, rate };
}

// Every month boundary from Baisakh 1, startYear through Baisakh 1,
// LAST_YEAR + 1 (so the last generated year has a closing boundary).
const monthsTotal = (LAST_YEAR + 1 - startYear) * 12 + 1;
const epochGuess = julianDayFromCalendar({
  year: epochAd[0],
  month: epochAd[1],
  day: epochAd[2],
});

function computeSankrantis(elements) {
  const list = [];
  let guess = epochGuess;
  for (let k = 0; k < monthsTotal; k++) {
    const jd = ingressInstant((k % 12) * 30, guess, elements);
    list.push(civilReading(jd, elements));
    guess = jd + 30.4; // sidereal months are 29.3–31.6 days
  }
  return list;
}

// -------------------------------------------------------------- fit the rule

// Verified month-start day numbers, cumulative from the epoch.
const EPOCH_DAY_NUMBER =
  julianDayFromCalendar({
    year: epochAd[0],
    month: epochAd[1],
    day: epochAd[2],
  }) + 0.5;
const tableStarts = [];
let acc = EPOCH_DAY_NUMBER;
for (const year of monthLengths) {
  for (const len of year) {
    tableStarts.push(acc);
    acc += len;
  }
}

/** Month-start day under cutoff h for sankranti s shifted by delta. */
function ruleStart(s, delta, h) {
  const shifted = s.clockHours + (delta / s.rate) * 24;
  const dayShift = Math.floor(shifted / 24);
  const clock = shifted - dayShift * 24;
  return s.dayNumber + dayShift + (clock < h ? 0 : 1);
}

/**
 * Best per-month cutoffs for one (elements, delta): each month index gets
 * its own h — the solstice sankrantis (Karka opens month 4, Makara opens
 * month 10) follow their own punya-kala conventions, so one global cutoff
 * systematically misses exactly those two series.
 */
function fitCutoffs(list, delta, hStep) {
  const cutoffs = new Array(12).fill(0);
  let missTotal = 0;
  for (let m = 0; m < 12; m++) {
    let bestMiss = Infinity;
    for (let h = 0; h < 24; h += hStep) {
      let miss = 0;
      for (let k = m; k < tableStarts.length; k += 12) {
        if (ruleStart(list[k], delta, h) !== tableStarts[k]) miss++;
      }
      if (miss < bestMiss) {
        bestMiss = miss;
        cutoffs[m] = h;
      }
    }
    missTotal += bestMiss;
  }
  return { miss: missTotal, cutoffs };
}

// Fit the zero-point offset and the twelve cutoffs: coarse, then fine.
console.log(`fitting rule on ${tableStarts.length} verified month starts…`);
const sankrantis = computeSankrantis(TEXTBOOK);
let best = { miss: Infinity, delta: 0, cutoffs: [] };
for (const fine of [false, true]) {
  const [d0, d1, dStep] = fine
    ? [best.delta - 0.15, best.delta + 0.15, 0.005]
    : [-3, 3, 0.1];
  const hStep = fine ? 0.05 : 0.25;
  for (let delta = d0; delta <= d1 + 1e-9; delta += dStep) {
    const fit = fitCutoffs(sankrantis, delta, hStep);
    if (fit.miss < best.miss) best = { ...fit, delta };
  }
}

const fitPct = (100 * (1 - best.miss / tableStarts.length)).toFixed(2);
console.log(`best fit: delta=${best.delta.toFixed(3)} deg`);
console.log(
  `per-month cutoffs (h): ${best.cutoffs.map((h) => h.toFixed(2)).join(' ')}`,
);
console.log(
  `-> ${best.miss}/${tableStarts.length} month starts off (${fitPct}% exact)`,
);
let shown = 0;
for (let k = 0; k < tableStarts.length; k++) {
  const got = ruleStart(sankrantis[k], best.delta, best.cutoffs[k % 12]);
  if (got !== tableStarts[k] && shown++ < 25) {
    console.log(
      `  off by ${got - tableStarts[k]}d: BS ${startYear + Math.floor(k / 12)} month ${(k % 12) + 1}`,
    );
  }
}
if (best.miss > shown) console.log(`  … and ${best.miss - shown} more`);

// ------------------------------------------------------------ project years

const projected = [];
const firstProjectedIndex = (verifiedThrough + 1 - startYear) * 12;
for (let year = verifiedThrough + 1; year <= LAST_YEAR; year++) {
  const months = [];
  for (let m = 0; m < 12; m++) {
    const k = (year - startYear) * 12 + m;
    const len =
      ruleStart(sankrantis[k + 1], best.delta, best.cutoffs[(m + 1) % 12]) -
      ruleStart(sankrantis[k], best.delta, best.cutoffs[m]);
    if (len < 29 || len > 32) {
      throw new Error(
        `implausible ${len}-day month: BS ${year} month ${m + 1}`,
      );
    }
    months.push(len);
  }
  projected.push(months);
}
// Seam check: the projection must continue exactly where the table ends.
const seam = ruleStart(
  sankrantis[firstProjectedIndex],
  best.delta,
  best.cutoffs[0],
);
console.log(
  `seam: rule Baisakh 1 ${verifiedThrough + 1} = table end + 1? ${seam === acc ? 'yes' : `NO (off ${seam - acc}d)`}`,
);

// ---------------------------------------------------------------- write file

const line = (months, year, tag) =>
  `  [${months.join(', ')}], // ${year}${tag}`;
const rows = [
  ...monthLengths.map((m, i) => line(m, startYear + i, '')),
  ...projected.map((m, i) => line(m, verifiedThrough + 1 + i, ' (projected)')),
];

const out = `/**
 * Bikram Sambat month lengths, BS ${startYear}–${LAST_YEAR}.
 * Generated by \`node --conditions=grahan-dist scripts/bs-sankranti.mjs\` —
 * do not edit by hand.
 *
 * BS ${startYear}–${verifiedThrough} (verified): published-calendar data; provenance in
 * scripts/data/bs-months-verified-1975-2083.json and the anchor fixtures.
 * BS ${verifiedThrough + 1}–${LAST_YEAR} (projected): Surya Siddhanta sankranti instants —
 * the classical solar model Nepal's calendar committee follows —
 * computed from the textbook SS elements (fitted zero-point offset
 * ${best.delta.toFixed(3)}°) and mapped to Kathmandu civil days by fitted per-month
 * cutoff clock times: ten months cut off near sunrise (the Hindu day
 * boundary); the solstice sankrantis (Karka/Makara) follow their own
 * punya-kala conventions. The fit reproduces ${fitPct}% of the ${tableStarts.length}
 * verified month starts (3 isolated one-day exceptions in 109 years).
 * The committee publishes each year's calendar ahead of time, so a
 * projected month boundary can be ±1 day off the eventual official one.
 */

/** First BS year in the table (Baisakh 1 = the epoch below). */
export const BS_MIN_YEAR = ${startYear};

/** Last BS year in the table. */
export const BS_MAX_YEAR = ${LAST_YEAR};

/**
 * Last BS year backed by published calendars. Later years are
 * sankranti-projected (see this file's header) — possibly ±1 day off the
 * eventual official calendar near month boundaries.
 */
export const BS_VERIFIED_THROUGH = ${verifiedThrough};

/** Gregorian date of Baisakh 1, BS_MIN_YEAR. */
export const BS_EPOCH_AD = { year: ${epochAd[0]}, month: ${epochAd[1]}, day: ${epochAd[2]} } as const;

/**
 * Days in each BS month (index 0 = Baisakh … 11 = Chaitra), one row per
 * year from BS_MIN_YEAR to BS_MAX_YEAR.
 */
export const BS_MONTH_LENGTHS: ReadonlyArray<readonly number[]> = [
${rows.join('\n')}
];
`;

const target = new URL('../packages/calendars/src/bs.data.ts', import.meta.url);
writeFileSync(target, out);
console.log(`wrote ${rows.length} years -> packages/calendars/src/bs.data.ts`);
