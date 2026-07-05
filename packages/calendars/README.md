# @grahan/calendars

World calendars for the [grahan](https://github.com/svarbhanu/grahan) sky
engine — Bikram Sambat (the Nepali civil calendar) first; Hijri, Hebrew, and
Chinese lunisolar planned. Zero dependencies beyond `@grahan/core`.

```bash
npm install @grahan/calendars
```

```ts
import { bsFromDate, dateFromBs, todayBs } from '@grahan/calendars';

todayBs({ timezone: 'Asia/Kathmandu' });
// { year: 2083, month: 3, day: 21,
//   monthName: { roman: 'Asar', nepali: 'असार' },
//   weekday: { index: 0, name: 'Sunday', roman: 'Aaitabar', nepali: 'आइतबार' },
//   projected: false }

bsFromDate({ year: 1993, month: 8, day: 18 });
// { year: 2050, month: 5, day: 2, monthName: { roman: 'Bhadra', … }, … }

dateFromBs({ year: 2050, month: 5, day: 2 });
// { year: 1993, month: 8, day: 18, weekday: { … name: 'Wednesday' … } }
```

Conversion works on plain calendar dates (`{ year, month, day }`) — a BS↔AD
mapping is date arithmetic, so no timezone is involved anywhere except
`todayBs`, which needs one to know what "today" means.

## Where the data comes from

Bikram Sambat months are solar — each begins at a sankranti, the sun's
ingress into the next sidereal sign — but the official calendar is fixed
annually by Nepal's calendar authority, so tables beat formulas:

- **BS 1975–2083 (verified):** month lengths cross-validated between two
  independently maintained datasets, with anchor dates (including the
  ambiguous 2062 Baisakh) verified against the published hamropatro.com
  calendar and documented historical events. See
  `fixtures/bs-anchors.json`.
- **BS 2084–2200 (projected):** sankranti instants computed from the
  textbook Surya Siddhanta sun — the classical model the committee
  follows — mapped to Kathmandu civil days by a boundary rule fitted on
  the 109 verified years (99.77% of month starts exact; the fitted
  cutoffs sit near sunrise, the traditional Hindu day boundary, with the
  solstice sankrantis following their own punya-kala conventions).
  Dates there carry `projected: true`: a month boundary may be ±1 day
  off the calendar the authority eventually publishes.

Range: 1918-04-13 through 2144-04-12 AD. Out-of-range and impossible
dates throw `RangeError`.

## API

| Function                     | Purpose                                        |
| ---------------------------- | ---------------------------------------------- |
| `bsFromDate(adDate)`         | Gregorian → BS, with names, weekday, flag      |
| `dateFromBs(bsDate)`         | BS → Gregorian, validated against real lengths |
| `todayBs({ timezone })`      | today's BS date in an IANA timezone            |
| `BS_MONTH_NAMES`             | Baisakh…Chaitra in roman + Devanagari          |
| `BS_WEEKDAY_NAMES`           | Sunday-first weekday names, roman + Devanagari |
| `BS_MIN_YEAR`, `BS_MAX_YEAR` | table coverage (1975, 2200)                    |
| `BS_VERIFIED_THROUGH`        | last authority-published year (2083)           |

MIT © Svarbhanu Neel
