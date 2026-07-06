# @grahan/core

The secular astronomy core of the [grahan](https://github.com/svarbhanu/grahan)
sky engine. Zero dependencies; Node ≥ 18, browsers, edge runtimes.

Julian day & calendar conversions, ΔT, IANA timezone helpers, apparent
Sun/Moon/planet positions (Mercury–Saturn with speed and retrograde flags),
mean lunar node, nutation, sidereal time, ascendant & midheaven,
sunrise/sunset with explicit polar states, moon phase, new/full moon
finders, and eclipses: `nextLunarEclipse()`, `nextSolarEclipse()` (global)
and `nextSolarEclipseAt()` (local circumstances for any lat/lon).

```ts
import { sunriseSunset, moonPhase, julianDayFromDate } from '@grahan/core';

const events = sunriseSunset({
  year: 2026,
  month: 7,
  day: 2,
  latitude: 27.7172,
  longitude: 85.324,
  timezone: 'Asia/Kathmandu',
});
// { sunrise: { kind: 'rises', date: 2026-07-01T23:26:36Z }, sunset: … }

moonPhase(julianDayFromDate(new Date())).phaseName; // e.g. 'waning-gibbous'
```

Accuracy is measured against Swiss Ephemeris reference fixtures: Sun max
4.6″, Moon max 65″, planets max 7.8″, ascendant max 3.1″, sunrise/sunset
max 4.6 s; eclipse detection & type exact on all 909 events 1900–2100
with instants typically within ~20 s (details in the
[repository README](https://github.com/svarbhanu/grahan#accuracy--measured-not-hoped)).

MIT © Svarbhanu Neel
