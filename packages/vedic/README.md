# @grahan/vedic

The Vedic layer of the [grahan](https://github.com/svarbhanu/grahan) sky
engine: `panchang()` (tithi, nakshatra, yoga, karana, vaar, Rahu Kaal),
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
