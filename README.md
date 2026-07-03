# grahan — the open-source sky engine

> ग्रहण (grahan) — "eclipse"

Astronomy-grade sky calculations with cultural intelligence. Planetary
positions, sunrise/sunset, moon phases — and cultural layers computed from
them, starting with the Vedic panchang. One zero-dependency TypeScript API
that runs in Node (≥18), browsers, and edge runtimes.

**Status: under construction.** v0.1 (the `panchang()` release) is in
progress — nothing is published to npm yet.

## What it will look like

```ts
import { panchang } from '@grahan/vedic';

const p = panchang({
  date: new Date(),
  latitude: 27.7172,
  longitude: 85.324,
  timezone: 'Asia/Kathmandu',
});
// → { vaar, tithi, nakshatra: { name, pada }, yoga, karana,
//     sunrise, sunset, rahuKaal: { start, end }, moonPhase }
```

## Packages

| Package         | What it does                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------- |
| `@grahan/core`  | Secular astronomy: Julian day, ΔT, sun/moon positions, sunrise/sunset, sidereal time, moon phases |
| `@grahan/vedic` | Vedic layer on core: ayanamsa, tithi, nakshatra, yoga, karana, Rahu Kaal                          |

More layers (world calendars, prayer times, tropical charts) are planned on
the same core.

## Accuracy targets

| Quantity       | Tolerance |
| -------------- | --------- |
| Sun longitude  | ±0.01°    |
| Moon longitude | ±0.05°    |
| Sunrise/sunset | ±1 min    |

Implemented from public-domain algorithms (Meeus, VSOP87, ELP-style series);
verified against Swiss Ephemeris–generated fixtures. Swiss Ephemeris code is
never used at runtime.

## License

MIT © Svarbhanu Neel
