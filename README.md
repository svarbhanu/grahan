# grahan — the open-source sky engine

> ग्रहण (grahan) — "eclipse"

Astronomy-grade sky calculations with cultural intelligence. Sun and Moon
positions, sunrise/sunset, moon phases — and cultural layers computed from
them, starting with the Vedic panchang. Zero dependencies, pure functions,
runs in Node ≥ 18, browsers, and edge runtimes.

## Install

```bash
npm install @grahan/vedic   # panchang (pulls in @grahan/core)
npm install @grahan/core    # just the astronomy
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

## Packages

| Package         | What it does                                                                                                     |
| --------------- | ---------------------------------------------------------------------------------------------------------------- |
| `@grahan/core`  | Secular astronomy: julian day, ΔT, apparent Sun/Moon, mean lunar node, sidereal time, sunrise/sunset, moon phase |
| `@grahan/vedic` | Vedic layer on core: Lahiri ayanamsa, tithi, nakshatra, yoga, karana, vaar, Rahu Kaal, `panchang()`              |

More layers (world calendars, prayer times, tropical charts) are planned on
the same core.

## Accuracy — measured, not hoped

Implemented from public-domain algorithms (Meeus _Astronomical Algorithms_,
truncated VSOP87 and ELP-2000/82 series) and verified against Swiss
Ephemeris 2.10 reference fixtures committed in this repo (Swiss Ephemeris
itself is never used at runtime — it is AGPL; grahan is MIT).

| Quantity        | Promise | Measured vs Swiss Ephemeris (1900–2100)                |
| --------------- | ------- | ------------------------------------------------------ |
| Sun longitude   | ±36″    | max 4.6″, mean 0.9″ (120 instants)                     |
| Moon longitude  | ±180″   | max 65″, mean 10.5″ (120 instants)                     |
| Sunrise/sunset  | ±60 s   | max 4.6 s, mean 0.9 s (272 events, 5 sites incl. 71°N) |
| Lahiri ayanamsa | —       | max 0.002″ (41 epochs)                                 |

**Limits, stated plainly:** ΔT model is fit for 1800–2150 (degrades outside);
ayanamsa is verified for 1900–2100; timezone conversion supports years
100–9999 CE at whole-second precision; panchang elements are reported for
the queried instant (boundary-crossing timestamps are planned post-v0.1).

## License

MIT © Svarbhanu Neel
