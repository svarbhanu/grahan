# grahan — the open-source sky engine

> ग्रहण (grahan) — "eclipse"

Astronomy-grade sky calculations with cultural intelligence. Sun and Moon
positions, sunrise/sunset, moon phases — and cultural layers computed from
them, starting with the Vedic panchang. Zero dependencies, pure functions,
runs in Node ≥ 18, browsers, and edge runtimes.

> 📖 [How it was built](https://dev.to/svarbhanu/i-built-a-zero-dependency-sky-engine-in-typescript-verified-to-46-arcseconds-317h) —
> the verification method and the bugs the Arctic fixtures caught.

## Install

```bash
npm install @grahan/vedic      # panchang (pulls in @grahan/core)
npm install @grahan/calendars  # Bikram Sambat ↔ AD (pulls in @grahan/core)
npm install @grahan/core       # just the astronomy
```

## Example

```ts
import { panchang } from '@grahan/vedic';

const p = panchang({
  date: new Date('2026-07-02T06:00:00Z'), // a fixed instant: 2 July 2026, 11:45 in Kathmandu
  latitude: 27.7172,
  longitude: 85.324,
  timezone: 'Asia/Kathmandu',
});

console.log(p.tithi); // { index: 17, paksha: 'krishna', name: 'Tritiya' }
console.log(p.nakshatra); // { index: 21, name: 'Shravana', pada: 1 }
console.log(p.vaar.vaar); // 'Guruvaar' (Thursday)
console.log(p.moonPhase.phaseName); // 'waning-gibbous'
console.log(p.rahuKaal); // { start: 08:06:42Z, end: 09:50:43Z } — 13:51–15:35 NPT
```

Sunrise, sunset, yoga, and karana are in the same result. Polar latitudes
return explicit `'always-up'` / `'always-down'` daylight states instead of
fabricated times.

### Birth charts, dashas, and SVG rendering (v0.2)

```ts
import { kundali, kundaliSvg, vimshottari } from '@grahan/vedic';

const birth = new Date('1993-08-18T05:15:00Z'); // 11:00 NPT
const k = kundali({ date: birth, latitude: 27.0104, longitude: 84.8821 });

console.log(k.lagna.rashiName); // 'Tula' (Libra 11°47′ rising)
console.log(k.grahas[1].nakshatra); // { index: 9, name: 'Magha', pada: 3 } — Moon
console.log(k.grahas[6].retrograde); // true — Saturn ℞ in Kumbha, 5th house

const svg = kundaliSvg(k, { style: 'north' }); // or 'south'; ready to embed

const v = vimshottari(k.grahas[1].longitude, birth);
console.log(v.birthLord, v.balanceYears.toFixed(2)); // 'ketu' '3.21'
console.log(v.mahadashas[3].lord); // 'moon' — starts 2022-11-04
```

Transits (`transits()`), auspicious windows (`abhijitMuhurta()`,
`findMuhurta()`), and 36-point match-making (`gunMilan()`) ship in the same
package — see the CHANGELOG for the full v0.2 surface.

The secular core works standalone:

```ts
import { sunriseSunset, moonPhase, julianDayFromDate } from '@grahan/core';

sunriseSunset({
  year: 2026,
  month: 7,
  day: 2,
  latitude: 27.7172,
  longitude: 85.324,
  timezone: 'Asia/Kathmandu',
});
// { sunrise: { kind: 'rises', date: 2026-07-01T23:26:36Z }, sunset: … }
```

### Eclipses (v0.4) — ग्रहण finally computes ग्रहण

The project is named after the Sanskrit word for eclipse; as of v0.4 it
computes them — detection, type, magnitudes, and contact times for every
eclipse from 1900 to 2100, in the same zero-dependency core:

```ts
import {
  nextSolarEclipseAt,
  nextLunarEclipse,
  julianDayFromDate,
  dateFromJulianDay,
} from '@grahan/core';

// When does Kathmandu next see the Sun bitten? Any lat/lon works.
const jd = julianDayFromDate(new Date('2026-07-06T00:00:00Z'));
const solar = nextSolarEclipseAt(jd, { latitude: 27.7172, longitude: 85.324 });

solar.type; // 'partial' — 2027-08-02: the Egypt totality, grazing Nepal
dateFromJulianDay(solar.maximum); // 2027-08-02T11:05:02Z (16:50 NPT)
solar.magnitude; // 0.0751 — a small bite off the solar diameter
solar.obscuration; // 0.0248 — 2.5 % of the disc covered

// The New Year's Eve total lunar eclipse of 2028, high over Kathmandu:
const lunar = nextLunarEclipse(
  julianDayFromDate(new Date('2028-12-01T00:00:00Z')),
);

lunar.type; // 'total', umbral magnitude 1.25
dateFromJulianDay(lunar.totalBegin); // 2028-12-31T16:16:13Z — totality 22:01–23:12 NPT
```

`nextSolarEclipse()` gives the global picture (partial / annular / total /
hybrid, centrality, and the greatest-eclipse instant, ground point, and
magnitude), and `nextNewMoon()` / `nextFullMoon()` ship alongside. Local
circumstances report the **visible** maximum: if the geometric peak is
below the horizon, you get the sunrise/sunset moment instead, matching
NASA-style local tables.

### The day view (v0.5) — panchang the way calendars print it

`panchang()` answers "what is the sky now?"; `panchangAtSunrise()` answers
what a printed panchang answers: label a civil date by its sunrise
elements, with the instant each one ends:

```ts
import { panchangAtSunrise } from '@grahan/vedic';

const day = panchangAtSunrise({
  year: 2026,
  month: 7,
  day: 2, // the civil date — no instant needed
  latitude: 27.7172,
  longitude: 85.324,
  timezone: 'Asia/Kathmandu',
});

day.vaar.name; // 'Thursday'
day.tithi[0].name; // 'Dwitiya' (krishna) — the day's label
day.tithi[0].endsAt; // 2026-07-02T04:08:19Z — "upto 09:53" NPT
day.tithi[1].name; // 'Tritiya' — what the next day will be labelled
day.nakshatra[0]; // Uttara Ashadha pada 4, upto 09:42 NPT
day.karana.map((k) => k.name); // ['Gara', 'Vanija', 'Vishti']
```

Each element is an **ordered list of spans touching the vedic day**
(sunrise to next sunrise) — never a single squashed value. On a kshaya
day the skipped tithi appears as a middle span that begins and ends
between the two sunrises; on a vriddhi day one span runs past the next
sunrise. Polar dates without a sunrise fall back to a local
midnight-to-midnight window with the `daylight` flag set. The raw end-time
solvers (`tithiEndTime`, `nakshatraEndTime`, `yogaEndTime`,
`karanaEndTime`) are exported too.

Rahu/Ketu can now follow the **true (osculating) node** instead of the
mean node — `kundali({ ..., node: 'true' })` — and its retrograde flag is
computed, not assumed (the true node briefly runs direct).

## Packages

| Package             | What it does                                                                                                                                                                        |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@grahan/core`      | Secular astronomy: julian day, ΔT, apparent Sun/Moon/planets, mean & true lunar node, sidereal time, ascendant, sunrise/sunset, moon phase, lunar & solar eclipses (global + local) |
| `@grahan/vedic`     | Vedic layer on core: `panchang()`, `panchangAtSunrise()` with element end times, `kundali()` with navamsa + SVG charts, Vimshottari dashas, transits, muhurta, gun-milan            |
| `@grahan/calendars` | World calendars, Bikram Sambat first: BS ↔ AD conversion (1975–2200 BS, verified tables + Surya Siddhanta projection), `todayBs()`                                                  |

More layers (Hijri, Hebrew, prayer times, tropical charts) are planned on
the same core.

## Accuracy — measured, not hoped

Implemented from public-domain algorithms (Meeus _Astronomical Algorithms_,
truncated VSOP87 and ELP-2000/82 series) and verified against Swiss
Ephemeris 2.10 reference fixtures committed in this repo (Swiss Ephemeris
itself is never used at runtime — it is AGPL; grahan is MIT).

| Quantity           | Promise | Measured vs Swiss Ephemeris (1900–2100)                                                            |
| ------------------ | ------- | -------------------------------------------------------------------------------------------------- |
| Sun longitude      | ±36″    | max 4.6″, mean 0.9″ (120 instants)                                                                 |
| Moon longitude     | ±180″   | max 65″, mean 10.5″ (120 instants)                                                                 |
| Planets (Me–Sa)    | ±72″    | max 7.8″ (Mercury) down to 1.1″ (Saturn)                                                           |
| Ascendant          | ±36″    | max 3.1″ (168 cases, 1°N–60°N)                                                                     |
| Sunrise/sunset     | ±60 s   | max 4.6 s, mean 0.9 s (272 events, 5 sites incl. 71°N)                                             |
| Lahiri ayanamsa    | —       | max 0.002″ (41 epochs)                                                                             |
| Eclipse times      | ±2½ min | detection & type exact on all 909 events; instants mean ~20 s, max 151 s (a 0.005-magnitude graze) |
| Eclipse magnitudes | —       | ≤ 0.002 (lunar ≤ 0.0015); fixtures cross-checked against NASA/Espenak's canon                      |
| Panchang end times | ±1 min  | max 37.5 s, mean 9.7 s (122 boundaries, 1990–2060); spot-checked against drikpanchang.com          |
| True lunar node    | ±0.03°  | max 66″, mean 15″ (160 instants — the Moon series' own error carried into the osculating plane)    |

**Limits, stated plainly:** ΔT model is fit for 1800–2150 (degrades outside);
ayanamsa is verified for 1900–2100; timezone conversion supports years
100–9999 CE at whole-second precision; `panchang()` reports elements at the
queried instant while `panchangAtSunrise()` carries the transition times;
the ascendant is valid for |latitude| ≲ 66°; gun-milan follows the most
widely published classical tables — regional scoring variants exist and are
documented in the module; sub-0.02-magnitude grazing eclipses have
inherently soft timings, and a sunrise-clamped local eclipse maximum at
polar latitudes can differ from other sources by minutes (refraction
models differ there).

## License

MIT © Svarbhanu Neel
