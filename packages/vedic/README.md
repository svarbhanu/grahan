# @grahan/vedic

The Vedic layer of the [grahan](https://github.com/svarbhanu/grahan) sky
engine: `panchang()` (tithi, nakshatra, yoga, karana, vaar, Rahu Kaal),
`panchangAtSunrise()` (the day view: sunrise elements with end times,
kshaya/vriddhi-honest span lists),
`kundali()` with whole-sign bhavas and navamsa, SVG chart rendering in the
North & South Indian styles, Vimshottari dashas, transits, muhurta finding,
and 36-point gun-milan. Zero dependencies beyond `@grahan/core`.

```ts
import { panchang } from '@grahan/vedic';

const p = panchang({
  date: new Date('2026-07-02T06:00:00Z'), // 11:45 in Kathmandu
  latitude: 27.7172,
  longitude: 85.324,
  timezone: 'Asia/Kathmandu',
});

p.tithi; // { index: 17, paksha: 'krishna', name: 'Tritiya' }
p.nakshatra; // { index: 21, name: 'Shravana', pada: 1 }
p.vaar.vaar; // 'Guruvaar'
p.rahuKaal; // { start, end } — 13:51–15:35 NPT that Thursday
```

```ts
import { panchangAtSunrise } from '@grahan/vedic';

const day = panchangAtSunrise({
  year: 2026,
  month: 7,
  day: 2, // a civil date, not an instant
  latitude: 27.7172,
  longitude: 85.324,
  timezone: 'Asia/Kathmandu',
});
day.tithi[0].name; // 'Dwitiya' — the day's label
day.tithi[0].endsAt; // 'upto 09:53' NPT, then Tritiya
```

```ts
import { kundali, kundaliSvg, vimshottari } from '@grahan/vedic';

const k = kundali({ date: birthInstant, latitude, longitude });
k.lagna.rashiName; // e.g. 'Tula'
k.grahas[6]; // Saturn: rashi, nakshatra-pada, bhava, navamsa, retrograde
kundaliSvg(k, { style: 'north' }); // self-contained SVG string

vimshottari(k.grahas[1].longitude, birthInstant).mahadashas;
```

Verified against Swiss Ephemeris 2.10 golden fixtures (ayanamsa to 0.002″,
element indices exact on 100 reference instants; details in the
[repository README](https://github.com/svarbhanu/grahan#accuracy--measured-not-hoped)).

MIT © Svarbhanu Neel
