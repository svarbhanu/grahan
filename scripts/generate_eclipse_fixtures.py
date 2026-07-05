"""Generate grahan's eclipse fixtures from Swiss Ephemeris (offline only).

Same discipline as generate_fixtures.py: deterministic output (fixed search
ranges, rounded values, sorted keys, no clock reads), and a self-check that
aborts before writing anything if the ephemeris disagrees with the golden
anchors or with the independent NASA/Espenak reference rows below.

Independent cross-check source: Fred Espenak, "Five Millennium Canon of
Solar/Lunar Eclipses" catalog pages at eclipse.gsfc.nasa.gov
(SEcat5/SE1901-2000.html, SEcat5/SE2001-2100.html, LEcat5/LE1901-2000.html,
LEcat5/LE2001-2100.html; retrieved 2026-07-06). Rows are copied by hand:
TD of greatest eclipse + the catalog's own ΔT column give expected UT.
"""

from __future__ import annotations

import json
import math
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import swisseph as swe

ROOT = Path(__file__).resolve().parent.parent
CORE_FIXTURES = ROOT / "packages" / "core" / "fixtures"

FLAGS = swe.FLG_MOSEPH
SOURCE = "swisseph-2.10.03 (pyswisseph 2.10.3.2), moshier"
UNIX_EPOCH_JD = 2440587.5

RANGE_START = swe.julday(1900, 1, 1, 0.0)
RANGE_END = swe.julday(2100, 1, 1, 0.0)
LOCAL_START = swe.julday(1980, 1, 1, 0.0)
LOCAL_END = swe.julday(2060, 1, 1, 0.0)

SITES = [
    {"name": "kathmandu", "lat": 27.7172, "lon": 85.324, "alt": 1300.0},
    {"name": "birgunj", "lat": 27.0104, "lon": 84.8821, "alt": 80.0},
    {"name": "singapore", "lat": 1.3521, "lon": 103.8198, "alt": 0.0},
    {"name": "helsinki", "lat": 60.1699, "lon": 24.9384, "alt": 0.0},
    {"name": "utqiagvik", "lat": 71.2906, "lon": -156.7886, "alt": 0.0},
]

# (calendar date, TD of greatest, ΔT s, type, magnitude) from the Espenak
# catalog pages named in the module docstring. Solar magnitude is the
# catalog's Mag. column; lunar rows carry (penumbral mag, umbral mag).
ESPENAK_SOLAR = [
    ((1919, 5, 29), "13:08:55", 21, "total", 1.0719),
    ((1955, 6, 20), "04:10:42", 31, "total", 1.0776),
    ((1991, 7, 11), "19:07:01", 58, "total", 1.0800),
    ((1995, 10, 24), "04:33:30", 61, "total", 1.0213),
    ((2013, 11, 3), "12:47:36", 68, "hybrid", 1.0159),
    ((2027, 8, 2), "10:07:50", 76, "total", 1.0790),
    ((2045, 8, 12), "17:42:39", 89, "total", 1.0774),
]
ESPENAK_LUNAR = [
    ((1901, 5, 3), "18:30:38", -1, "penumbral", (1.0431, -0.0334)),
    ((1953, 7, 26), "12:21:10", 30, "total", (2.8265, 1.8628)),
    ((2000, 7, 16), "13:56:39", 64, "total", (2.8375, 1.7684)),
    ((2016, 3, 23), "11:48:21", 70, "penumbral", (0.7747, -0.3118)),
    ((2018, 7, 27), "20:22:54", 71, "total", (2.6792, 1.6087)),
    ((2026, 8, 28), "04:14:04", 75, "partial", (1.9645, 0.9299)),
    ((2028, 12, 31), "16:53:15", 77, "total", (2.2742, 1.2463)),
]


def utc_iso(jd_ut: float) -> str:
    dt = datetime(1970, 1, 1, tzinfo=timezone.utc) + timedelta(days=jd_ut - UNIX_EPOCH_JD)
    dt = (dt + timedelta(microseconds=500000)).replace(microsecond=0)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def opt_time(jd: float) -> dict | None:
    """A tret slot: swisseph leaves unused slots at 0."""
    if jd < 1e6:
        return None
    return {"jdUt": round(jd, 8), "utc": utc_iso(jd)}


def solar_type(retflag: int) -> str:
    if retflag & swe.ECL_ANNULAR_TOTAL:
        return "hybrid"
    if retflag & swe.ECL_TOTAL:
        return "total"
    if retflag & swe.ECL_ANNULAR:
        return "annular"
    return "partial"


def lunar_type(retflag: int) -> str:
    if retflag & swe.ECL_TOTAL:
        return "total"
    if retflag & swe.ECL_PARTIAL:
        return "partial"
    return "penumbral"


def write_json(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(obj, sort_keys=True, indent=2, ensure_ascii=False) + "\n"
    path.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {path.relative_to(ROOT)}")


def espenak_jd_ut(date: tuple[int, int, int], td: str, delta_t: int) -> float:
    h, m, s = (int(x) for x in td.split(":"))
    jd_td = swe.julday(date[0], date[1], date[2], h + m / 60 + s / 3600)
    return jd_td - delta_t / 86400.0


# ---------------------------------------------------------------- checks

def self_check() -> None:
    problems: list[str] = []
    worst_dt = 0.0

    for date, td, delta_t, etype, mag in ESPENAK_SOLAR:
        expected = espenak_jd_ut(date, td, delta_t)
        rf, tret = swe.sol_eclipse_when_glob(expected - 5, FLAGS, 0)
        dt_s = abs(tret[0] - expected) * 86400
        worst_dt = max(worst_dt, dt_s)
        _, _, attr = swe.sol_eclipse_where(tret[0], FLAGS)
        if solar_type(rf) != etype:
            problems.append(f"solar {date}: type {solar_type(rf)} != {etype}")
        if dt_s > 180:
            problems.append(f"solar {date}: max off Espenak by {dt_s:.0f}s")
        if abs(attr[8] - mag) > 0.02:
            problems.append(f"solar {date}: mag {attr[8]:.4f} != {mag}")
        print(f"  espenak solar {date}: dt={dt_s:5.1f}s  mag diff={attr[8] - mag:+.4f}")

    for date, td, delta_t, etype, (pmag, umag) in ESPENAK_LUNAR:
        expected = espenak_jd_ut(date, td, delta_t)
        rf, tret = swe.lun_eclipse_when(expected - 5, FLAGS, 0)
        dt_s = abs(tret[0] - expected) * 86400
        worst_dt = max(worst_dt, dt_s)
        _, attr = swe.lun_eclipse_how(tret[0], (0.0, 0.0, 0.0), FLAGS)
        if lunar_type(rf) != etype:
            problems.append(f"lunar {date}: type {lunar_type(rf)} != {etype}")
        if dt_s > 180:
            problems.append(f"lunar {date}: max off Espenak by {dt_s:.0f}s")
        # Penumbral events: swisseph reports umbral magnitude as 0, compare
        # the penumbral column instead. NASA uses Danjon shadow enlargement,
        # swisseph its own model — allow a small model difference.
        got = attr[1] if etype == "penumbral" else attr[0]
        want = pmag if etype == "penumbral" else umag
        if abs(got - want) > 0.03:
            problems.append(f"lunar {date}: mag {got:.4f} != {want}")
        print(f"  espenak lunar {date}: dt={dt_s:5.1f}s  mag diff={got - want:+.4f}")

    # Golden anchors (CLAUDE.md/PLAN.md M14): 1995-10-24 over Nepal,
    # 2027-08-02 upcoming solar, 2028-12-31 total lunar high over Kathmandu.
    ktm = next(s for s in SITES if s["name"] == "kathmandu")
    geo_ktm = (ktm["lon"], ktm["lat"], ktm["alt"])
    rf, tret, attr = swe.sol_eclipse_when_loc(swe.julday(1995, 10, 1, 0), geo_ktm, FLAGS)
    if not rf & swe.ECL_PARTIAL or abs(attr[8] - 0.894) > 0.005:
        problems.append(f"KTM 1995: expected partial mag 0.894, got {attr[8]:.4f}")
    rf, tret, attr = swe.sol_eclipse_when_loc(swe.julday(2027, 7, 1, 0), geo_ktm, FLAGS)
    if utc_iso(tret[0])[:10] != "2027-08-02":
        problems.append(f"KTM next solar: expected 2027-08-02, got {utc_iso(tret[0])}")
    rf, tret, attr = swe.lun_eclipse_when_loc(swe.julday(2028, 12, 1, 0), geo_ktm, FLAGS)
    if not rf & swe.ECL_TOTAL or utc_iso(tret[0])[:10] != "2028-12-31" or attr[6] < 60:
        problems.append("KTM 2028-12-31 lunar: expected total, moon high in sky")

    if problems:
        print("ECLIPSE SELF-CHECK FAILED — nothing was written:", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        sys.exit(1)
    print(f"eclipse self-checks passed (worst Espenak dt {worst_dt:.1f}s)")


# ---------------------------------------------------------------- sets

def gen_lunar() -> None:
    data = []
    jd = RANGE_START
    while True:
        rf, tret = swe.lun_eclipse_when(jd, FLAGS, 0)
        if tret[0] >= RANGE_END:
            break
        _, attr = swe.lun_eclipse_how(tret[0], (0.0, 0.0, 0.0), FLAGS)
        data.append({
            "type": lunar_type(rf),
            "maximum": opt_time(tret[0]),
            "magnitudeUmbral": round(attr[0], 5),
            "magnitudePenumbral": round(attr[1], 5),
            "penumbralBegin": opt_time(tret[6]),
            "partialBegin": opt_time(tret[2]),
            "totalBegin": opt_time(tret[4]),
            "totalEnd": opt_time(tret[5]),
            "partialEnd": opt_time(tret[3]),
            "penumbralEnd": opt_time(tret[7]),
        })
        jd = tret[0] + 5
    write_json(CORE_FIXTURES / "lunar-eclipses.json", {
        "source": SOURCE,
        "parameters": {
            "count": len(data),
            "range": "all lunar eclipses 1900-01-01 .. 2100-01-01 UT",
            "conventions": "geocentric; magnitudes from swe_lun_eclipse_how at maximum; times UT",
        },
        "data": data,
    })


def gen_solar() -> None:
    data = []
    jd = RANGE_START
    while True:
        rf, tret = swe.sol_eclipse_when_glob(jd, FLAGS, 0)
        if tret[0] >= RANGE_END:
            break
        _, geopos, attr = swe.sol_eclipse_where(tret[0], FLAGS)
        data.append({
            "type": solar_type(rf),
            "central": bool(rf & swe.ECL_CENTRAL),
            "maximum": opt_time(tret[0]),
            "magnitude": round(attr[8], 5),
            "greatest": {"lat": round(geopos[1], 4), "lon": round(geopos[0], 4)},
            "globalBegin": opt_time(tret[2]),
            "centralBegin": opt_time(tret[4]),
            "centralEnd": opt_time(tret[5]),
            "globalEnd": opt_time(tret[3]),
        })
        jd = tret[0] + 5
    write_json(CORE_FIXTURES / "solar-eclipses.json", {
        "source": SOURCE,
        "parameters": {
            "count": len(data),
            "range": "all solar eclipses 1900-01-01 .. 2100-01-01 UT",
            "conventions": "type/central from retflag; magnitude = swe_sol_eclipse_where attr[8] (NASA convention) at maximum; times UT",
        },
        "data": data,
    })


def gen_solar_local() -> None:
    data = []
    for site in SITES:
        geopos = (site["lon"], site["lat"], site["alt"])
        jd = LOCAL_START
        while True:
            rf, tret, attr = swe.sol_eclipse_when_loc(jd, geopos, FLAGS)
            if tret[0] >= LOCAL_END:
                break
            data.append({
                "site": site["name"],
                "lat": site["lat"],
                "lon": site["lon"],
                "altM": site["alt"],
                "type": solar_type(rf),
                "maximum": opt_time(tret[0]),
                "magnitude": round(attr[8], 5),
                "obscuration": round(attr[2], 5),
                "moonSunRatio": round(attr[1], 5),
                "firstContact": opt_time(tret[1]),
                "secondContact": opt_time(tret[2]),
                "thirdContact": opt_time(tret[3]),
                "fourthContact": opt_time(tret[4]),
            })
            jd = tret[0] + 5
    write_json(CORE_FIXTURES / "solar-eclipses-local.json", {
        "source": SOURCE,
        "parameters": {
            "count": len(data),
            "range": "eclipses visible per site 1980-01-01 .. 2060-01-01 UT",
            "sites": SITES,
            "conventions": "swe_sol_eclipse_when_loc; magnitude attr[8], obscuration attr[2]; contacts null when absent; times UT",
        },
        "data": data,
    })


def main() -> None:
    self_check()
    gen_lunar()
    gen_solar()
    gen_solar_local()
    print("done")


if __name__ == "__main__":
    main()
