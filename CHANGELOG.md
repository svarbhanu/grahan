# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.0] — 2026-07-06

The stability release. No calculation changed; everything around the
calculations became production-grade.

### Added

- **Input validation at every public API boundary.** Bad inputs
  (latitude 95, `new Date(NaN)`, month 13, an unknown IANA zone) throw
  a `RangeError` naming the offending value instead of propagating NaN.
  The validators (`assertFinite`, `assertLatitude`, `assertLongitude`,
  `assertValidDate`, `assertCivilDate`) are exported from
  `@grahan/core`.
- **`transits({ node: 'true' })`** — the true-node option kundali()
  gained in 0.5.0 now reaches transits too.
- **API reference** at <https://svarbhanu.github.io/grahan/>, built
  from the JSDoc on every public function.
- SECURITY.md and CONTRIBUTING.md.

### Changed

- **The public API surface is frozen** and pinned by tests (47 exports
  in core, 50 in vedic, 10 in calendars). From 1.0.0, breaking changes
  only ship with a major version.
- **Releases are published tokenlessly from CI** via npm trusted
  publishing (OIDC) with provenance attestations, after an in-workflow
  tarball inspection (dist-only contents, rewritten exports, version
  matches the tag).
- CI now proves the browser claim: the shipped tarballs bundle for the
  browser with zero Node builtins, and tree-shaking holds (a
  panchang-only bundle is 9.7 KB gzipped vs 92 KB for everything).

## [0.5.0] — 2026-07-06

The day-view release: panchang the way calendars print it.

### Added

- **`@grahan/vedic`**
  - `panchangAtSunrise()` — label a civil date by its sunrise panchang,
    with the transition instant of every element ("Tritiya upto 14:37,
    then Chaturthi"). Each of tithi/nakshatra/yoga/karana returns the
    **ordered list of spans touching the vedic day** (sunrise to next
    sunrise): kshaya days honestly show three tithis, vriddhi days one
    span running past the next sunrise. Polar dates without a sunrise
    use a documented local midnight-to-midnight window.
  - `tithiEndTime()`, `karanaEndTime()`, `nakshatraEndTime()`,
    `yogaEndTime()` — the underlying boundary solvers; sidereal
    boundaries are solved on the sidereal value so they move with the
    ayanamsa. Measured vs Swiss Ephemeris: max 37.5 s, mean 9.7 s over
    122 boundaries 1990–2060; span identities verified on 118 day
    records at four sites including 60°N and a polar one, and
    spot-checked against drikpanchang.com's published end times.
  - `kundali({ node: 'true' })` — Rahu/Ketu from the true (osculating)
    node; its retrograde flag is computed, not assumed (the true node
    briefly runs direct).
- **`@grahan/core`**
  - `trueLunarNode()` — osculating node from the Moon's instantaneous
    orbit plane (r × v), the same construction Swiss Ephemeris uses:
    max 66″, mean 15″ vs `swe.TRUE_NODE` over 160 instants.
  - `nextCrossing()` — the generalized mean-rate boundary solver behind
    the syzygy finder and the vedic end times; `wrap180()` joins the
    angle utilities.

## [0.4.0] — 2026-07-06

The namesake release: ग्रहण (grahan) means eclipse — now it computes them.

### Added

- **`@grahan/core`** — eclipses, verified against every event 1900–2100
  (457 lunar + 452 solar):
  - `nextLunarEclipse()` — penumbral/partial/total, umbral & penumbral
    magnitudes, and all contact times (P1–P4, U1–U4), from Meeus shadow
    geometry with the NASA/Danjon shadow enlargement.
  - `nextSolarEclipse()` — global circumstances: partial/annular/total/
    hybrid, centrality, greatest-eclipse instant, ground point, and
    magnitude, computed from the true 3-D shadow axis against the
    flattened Earth (no Besselian elements).
  - `nextSolarEclipseAt()` — local circumstances for any lat/lon:
    visibility, local type, magnitude, obscuration, and the four
    contacts. The reported maximum is the _visible_ one — clamped to
    sunrise/sunset when the geometric peak is below the horizon,
    matching NASA-style local tables.
  - `nextNewMoon()`, `nextFullMoon()`, `nextSyzygy()` — precise phase
    instants.
  - Measured vs Swiss Ephemeris: detection and type exact across both
    centuries; event instants mean ~20 s, max 151 s (a 0.005-magnitude
    graze); magnitudes within 0.002. Reference fixtures are additionally
    cross-checked against NASA/Espenak's Five Millennium Canon — which
    settled two knife-edge 1927/1948 eclipses in NASA's favour where
    Swiss Ephemeris alone calls them hybrid.

## [0.3.0] — 2026-07-06

The calendar release: Bikram Sambat, verified and projected.

### Added

- **`@grahan/calendars`** — new package, world calendars on the grahan
  core, starting with Bikram Sambat: `bsFromDate()` / `dateFromBs()`
  (plain calendar-date conversion with month names in roman + Devanagari,
  weekdays, and validation against real month lengths) and
  `todayBs({ timezone })`. Month tables cover BS 1975–2200: 1975–2083
  verified against published calendars and documented historical events;
  2084–2200 projected from textbook Surya Siddhanta sankrantis with a
  boundary rule fitted on the 109 verified years (99.77% of month starts
  exact) — projected dates carry `projected: true`.

## [0.2.0] — 2026-07-05

The chart release: from panchang to full jyotish.

### Added

- **`@grahan/core`** — apparent positions of the five classical planets
  (truncated VSOP87D with an error-budget truncation; measured max 7.8″
  Mercury down to 1.1″ Saturn vs Swiss Ephemeris, 1900–2100), daily
  motion + retrograde flags, and the tropical `ascendant()`/`midheaven()`
  (max 3.1″ vs `swe.houses`, valid |lat| ≲ 66°).
- **`@grahan/vedic`** — `kundali()`: nine grahas (Ketu = mean node +180°)
  with rashi, nakshatra-pada, retrograde, whole-sign bhavas, lagna, and
  navamsa (D9); `kundaliSvg()`: North & South Indian chart SVG renderers
  (D1/D9, zero dependencies); `vimshottari()`: mahadasha + antardasha
  timeline from the Moon's nakshatra (365.25-day years); `transits()`
  (gochar with houses from lagna and Moon); `abhijitMuhurta()` and
  `findMuhurta()` (rule-driven auspicious-window scan); `gunMilan()`
  (full 36-point ashtakoota with documented classical tables).

## [0.1.0] — 2026-07-04

First release: one perfect function.

### Added

- **`@grahan/core`** — zero-dependency astronomy: julian day and calendar
  conversions (Julian & Gregorian), ΔT (Espenak–Meeus, 1800–2150), IANA
  timezone conversion built on `Intl`, apparent Sun (truncated VSOP87D,
  max 4.6″ vs Swiss Ephemeris over 1900–2100), apparent Moon (truncated
  ELP-2000/82, max 65″), mean lunar node (0.35″), nutation and obliquity,
  sidereal time, sunrise/sunset (max 4.6 s over 272 reference events,
  explicit polar `always-up`/`always-down` states), moon phase.
- **`@grahan/vedic`** — the Vedic layer: Lahiri ayanamsa (matches Swiss
  Ephemeris `SIDM_LAHIRI` to 0.002″ over 1900–2100), tithi, nakshatra with
  pada, yoga, karana, vaar (sunrise-to-sunrise day), Rahu Kaal, and the
  assembled `panchang()`.
- Golden-fixture verification suite: every published number is tested
  against committed Swiss Ephemeris 2.10 reference data (128 tests).
