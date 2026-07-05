# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
