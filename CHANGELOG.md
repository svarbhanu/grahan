# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
