"""Generate grahan's golden fixtures from Swiss Ephemeris (offline only).

Deterministic by construction: fixed instant grids, no clock reads, degrees
rounded to 6 dp, times to whole seconds, sorted JSON keys, no timestamps.
Self-checks the CLAUDE.md golden values and aborts before writing anything
if the ephemeris disagrees with them.
"""

from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import swisseph as swe

ROOT = Path(__file__).resolve().parent.parent
CORE_FIXTURES = ROOT / "packages" / "core" / "fixtures"
VEDIC_FIXTURES = ROOT / "packages" / "vedic" / "fixtures"

FLAGS = swe.FLG_MOSEPH | swe.FLG_SPEED
SOURCE = "swisseph-2.10.03 (pyswisseph 2.10.3.2), moshier, Lahiri, mean node"

UNIX_EPOCH_JD = 2440587.5
FOUNDER_JD = swe.julday(1993, 8, 18, 5.25)  # 1993-08-18 11:00 NPT = 05:15 UT
J2000_JD = 2451545.0
RAHU_KAAL_JD = swe.julday(2026, 7, 2, 0.0)

SITES = [
    {"name": "birgunj", "lat": 27.0104, "lon": 84.8821, "tz": "Asia/Kathmandu"},
    {"name": "kathmandu", "lat": 27.7172, "lon": 85.324, "tz": "Asia/Kathmandu"},
    {"name": "singapore", "lat": 1.3521, "lon": 103.8198, "tz": "Asia/Singapore"},
    {"name": "helsinki", "lat": 60.1699, "lon": 24.9384, "tz": "Europe/Helsinki"},
    {"name": "utqiagvik", "lat": 71.2906, "lon": -156.7886, "tz": "America/Anchorage"},
]

SUNRISE_DATES = (
    [(2026, m, 15) for m in range(1, 13)]
    + [(2026, 3, 20), (2026, 6, 21), (2026, 9, 23), (2026, 12, 21)]
    + [(2026, 1, 1), (2026, 2, 1), (2026, 4, 1), (2026, 5, 1), (2026, 10, 1),
       (2026, 11, 15), (2026, 12, 1), (2026, 7, 2)]
    + [(1900, 6, 21), (1950, 1, 15), (1993, 8, 18), (2000, 3, 20),
       (2075, 12, 21), (2100, 6, 21)]
)
assert len(SUNRISE_DATES) == 30


def norm360(deg: float) -> float:
    d = math.fmod(deg, 360.0)
    return d + 360.0 if d < 0 else d


def utc_iso(jd_ut: float) -> str:
    """Julian day (UT) to ISO-8601 Z string, rounded to the whole second."""
    dt = datetime(1970, 1, 1, tzinfo=timezone.utc) + timedelta(days=jd_ut - UNIX_EPOCH_JD)
    dt = (dt + timedelta(microseconds=500000)).replace(microsecond=0)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def jd_from_utc(dt: datetime) -> float:
    return UNIX_EPOCH_JD + dt.astimezone(timezone.utc).timestamp() / 86400.0


def lon_of(jd_ut: float, body: int) -> float:
    xx, _ = swe.calc_ut(jd_ut, body, FLAGS)
    return norm360(xx[0])


def speed_of(jd_ut: float, body: int) -> float:
    xx, _ = swe.calc_ut(jd_ut, body, FLAGS)
    return xx[3]


def ayanamsa(jd_ut: float) -> float:
    return swe.get_ayanamsa_ut(jd_ut)


def write_json(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(obj, sort_keys=True, indent=2, ensure_ascii=False) + "\n"
    path.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {path.relative_to(ROOT)}")


# ---------------------------------------------------------------- elements

def panchang_elements(jd_ut: float) -> dict:
    sun_t = lon_of(jd_ut, swe.SUN)
    moon_t = lon_of(jd_ut, swe.MOON)
    aya = ayanamsa(jd_ut)
    sun_s = norm360(sun_t - aya)
    moon_s = norm360(moon_t - aya)
    elong = norm360(moon_t - sun_t)
    return {
        "jdUt": round(jd_ut, 8),
        "utc": utc_iso(jd_ut),
        "sunTropical": round(sun_t, 6),
        "moonTropical": round(moon_t, 6),
        "ayanamsa": round(aya, 6),
        "sunSidereal": round(sun_s, 6),
        "moonSidereal": round(moon_s, 6),
        "tithiIndex": int(elong // 12),          # 0..29
        "karanaSlot": int(elong // 6),           # 0..59 (raw half-tithi slot)
        "nakshatraIndex": int(moon_s // (360 / 27)),  # 0..26
        "pada": int(moon_s // (360 / 108)) % 4 + 1,   # 1..4
        "yogaIndex": int(norm360(sun_s + moon_s) // (360 / 27)),  # 0..26
    }


# ---------------------------------------------------------------- sunrise

def rise_or_set(jd_start_ut: float, rsmi: int, site: dict) -> tuple[int, float]:
    geopos = (site["lon"], site["lat"], 0.0)
    return swe.rise_trans(jd_start_ut, swe.SUN, rsmi, geopos, 0.0, 0.0, swe.FLG_MOSEPH)


def sun_altitude(jd_ut: float, site: dict) -> float:
    xx, _ = swe.calc_ut(jd_ut, swe.SUN, FLAGS)
    geopos = (site["lon"], site["lat"], 0.0)
    _, _, app_alt = swe.azalt(jd_ut, swe.ECL2HOR, geopos, 0.0, 0.0, (xx[0], xx[1], xx[2]))
    return app_alt


def day_events(site: dict, y: int, m: int, d: int) -> dict:
    """Sunrise/sunset for one LOCAL calendar date at a site."""
    local_midnight = datetime(y, m, d, tzinfo=ZoneInfo(site["tz"]))
    jd0 = jd_from_utc(local_midnight)
    jd1 = jd_from_utc(local_midnight + timedelta(days=1))
    record: dict = {"date": f"{y:04d}-{m:02d}-{d:02d}", "site": site["name"]}
    for key, rsmi in (("sunrise", swe.CALC_RISE), ("sunset", swe.CALC_SET)):
        res, tret = rise_or_set(jd0, rsmi, site)
        if res == 0 and tret[0] < jd1:
            record[key] = utc_iso(tret[0])
        else:
            noon_alt = sun_altitude((jd0 + jd1) / 2, site)
            record[key] = "always_up" if noon_alt > 0 else "always_down"
    return record


# ---------------------------------------------------------------- checks

def dms(sign_index: int, deg: int, minute: int) -> float:
    return sign_index * 30 + deg + minute / 60


def self_check() -> None:
    """Executable form of the CLAUDE.md golden tables. Abort on any mismatch."""
    problems: list[str] = []

    def expect(label: str, actual: float, expected: float, tol: float) -> None:
        if abs(actual - expected) > tol:
            problems.append(f"{label}: got {actual:.4f}, expected {expected:.4f} ±{tol}")

    expect("ayanamsa 1993", ayanamsa(FOUNDER_JD), 23.7681, 0.005)

    aya = ayanamsa(FOUNDER_JD)
    bodies = {
        "sun": (swe.SUN, dms(4, 1, 30)),        # Leo 1°30′
        "moon": (swe.MOON, dms(4, 7, 12)),      # Leo 7°12′
        "mars": (swe.MARS, dms(5, 10, 8)),      # Virgo 10°08′
        "mercury": (swe.MERCURY, dms(3, 20, 10)),
        "jupiter": (swe.JUPITER, dms(5, 18, 49)),
        "venus": (swe.VENUS, dms(2, 25, 5)),
        "saturn": (swe.SATURN, dms(10, 3, 19)),
        "rahu": (swe.MEAN_NODE, dms(7, 14, 31)),
    }
    for name, (body, expected) in bodies.items():
        expect(f"founder {name}", norm360(lon_of(FOUNDER_JD, body) - aya), expected, 0.05)
    if speed_of(FOUNDER_JD, swe.SATURN) >= 0:
        problems.append("founder saturn: expected retrograde (negative speed)")

    swe.set_sid_mode(swe.SIDM_LAHIRI, 0, 0)
    _, ascmc = swe.houses_ex(FOUNDER_JD, 27.0104, 84.8821, b"W", swe.FLG_SIDEREAL)
    expect("founder lagna", ascmc[0], dms(6, 11, 47), 0.06)  # Libra 11°47′

    el = panchang_elements(FOUNDER_JD)
    for label, actual, expected in (
        ("tithi (Shukla Pratipada)", el["tithiIndex"], 0),
        ("nakshatra (Magha)", el["nakshatraIndex"], 9),
        ("pada", el["pada"], 3),
        ("yoga (Parigha)", el["yogaIndex"], 18),
        ("karana slot (Kimstughna)", el["karanaSlot"], 0),
    ):
        if actual != expected:
            problems.append(f"founder {label}: got {actual}, expected {expected}")

    ktm = next(s for s in SITES if s["name"] == "kathmandu")
    events = day_events(ktm, 2026, 7, 2)
    for key, expected_iso in (("sunrise", "2026-07-01T23:27"), ("sunset", "2026-07-02T13:18")):
        value = events[key]
        got = datetime.strptime(value, "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        want = datetime.strptime(expected_iso, "%Y-%m-%dT%H:%M").replace(tzinfo=timezone.utc)
        if abs((got - want).total_seconds()) > 60:
            problems.append(f"KTM 2026-07-02 {key}: got {value}, expected ≈{expected_iso}Z ±60s")

    if problems:
        print("GOLDEN SELF-CHECK FAILED — nothing was written:", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        sys.exit(1)
    print("golden self-checks passed")


# ---------------------------------------------------------------- sets

def gen_sun_moon() -> None:
    start = swe.julday(1900, 1, 1, 0.0)
    jds = [start + i * 624.37 for i in range(117)] + [J2000_JD, FOUNDER_JD, RAHU_KAAL_JD]
    data = [
        {
            "jdUt": round(jd, 8),
            "utc": utc_iso(jd),
            "sun": round(lon_of(jd, swe.SUN), 6),
            "moon": round(lon_of(jd, swe.MOON), 6),
            "meanNode": round(lon_of(jd, swe.MEAN_NODE), 6),
        }
        for jd in jds
    ]
    write_json(CORE_FIXTURES / "sun-moon-longitudes.json", {
        "source": SOURCE,
        "parameters": {
            "count": len(data),
            "frame": "geocentric apparent ecliptic-of-date, tropical, degrees",
        },
        "data": data,
    })


def gen_sunrise() -> None:
    data = [day_events(site, y, m, d) for site in SITES for (y, m, d) in SUNRISE_DATES]
    write_json(CORE_FIXTURES / "sunrise-sunset.json", {
        "source": SOURCE,
        "parameters": {
            "convention": "upper limb, standard refraction (h0 ≈ -0.8333°)",
            "dates": "per-site LOCAL calendar dates; times in UTC",
            "sites": SITES,
        },
        "data": data,
    })


def gen_ayanamsa() -> None:
    jds = [swe.julday(year, 1, 1, 0.0) for year in range(1900, 2100, 5)] + [FOUNDER_JD]
    data = [
        {"jdUt": round(jd, 8), "utc": utc_iso(jd), "lahiri": round(ayanamsa(jd), 6)}
        for jd in jds
    ]
    write_json(VEDIC_FIXTURES / "ayanamsa.json", {
        "source": SOURCE,
        "parameters": {"count": len(data), "sidMode": "SIDM_LAHIRI"},
        "data": data,
    })


def gen_panchang_elements() -> None:
    start = swe.julday(1990, 1, 1, 0.0)
    jds = [start + i * 167.31 for i in range(100)]
    write_json(VEDIC_FIXTURES / "panchang-elements.json", {
        "source": SOURCE,
        "parameters": {"count": len(jds), "indexing": "tithi 0-29, nakshatra 0-26, pada 1-4, yoga 0-26, karanaSlot 0-59"},
        "data": [panchang_elements(jd) for jd in jds],
    })


def gen_founder_chart() -> None:
    aya = ayanamsa(FOUNDER_JD)
    swe.set_sid_mode(swe.SIDM_LAHIRI, 0, 0)
    _, ascmc = swe.houses_ex(FOUNDER_JD, 27.0104, 84.8821, b"W", swe.FLG_SIDEREAL)
    bodies = {
        "sun": swe.SUN, "moon": swe.MOON, "mars": swe.MARS, "mercury": swe.MERCURY,
        "jupiter": swe.JUPITER, "venus": swe.VENUS, "saturn": swe.SATURN,
        "rahu": swe.MEAN_NODE,
    }
    write_json(VEDIC_FIXTURES / "founder-chart.json", {
        "source": SOURCE,
        "parameters": {
            "place": {"lat": 27.0104, "lon": 84.8821, "name": "Birgunj, Nepal"},
            "utc": utc_iso(FOUNDER_JD),
            "jdUt": round(FOUNDER_JD, 8),
        },
        "data": {
            "ayanamsa": round(aya, 6),
            "lagnaSidereal": round(ascmc[0], 6),
            "bodiesSidereal": {
                name: round(norm360(lon_of(FOUNDER_JD, body) - aya), 6)
                for name, body in bodies.items()
            },
            "retrograde": {
                name: speed_of(FOUNDER_JD, body) < 0
                for name, body in bodies.items() if name not in ("sun", "moon", "rahu")
            },
            "elements": panchang_elements(FOUNDER_JD),
        },
    })


def gen_rahu_kaal() -> None:
    ktm = next(s for s in SITES if s["name"] == "kathmandu")
    events = day_events(ktm, 2026, 7, 2)
    write_json(VEDIC_FIXTURES / "rahu-kaal-ktm.json", {
        "source": SOURCE,
        "parameters": {
            "date": "2026-07-02 (Thursday) local Asia/Kathmandu",
            "site": ktm,
        },
        "data": {
            "sunriseUtc": events["sunrise"],
            "sunsetUtc": events["sunset"],
            "expected": {"startNpt": "13:51", "endNpt": "15:35", "segment": 6},
            "weekdaySegment": {"sun": 8, "mon": 2, "tue": 7, "wed": 5, "thu": 6, "fri": 4, "sat": 3},
        },
    })


def main() -> None:
    swe.set_sid_mode(swe.SIDM_LAHIRI, 0, 0)
    self_check()
    gen_sun_moon()
    gen_sunrise()
    gen_ayanamsa()
    gen_panchang_elements()
    gen_founder_chart()
    gen_rahu_kaal()
    print("done")


if __name__ == "__main__":
    main()
