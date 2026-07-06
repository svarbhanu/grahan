"""Generate grahan's panchang-transition fixtures from Swiss Ephemeris.

Two sets for M15 (element end-times + panchangAtSunrise):
  A. element-boundaries.json      — next end instant of tithi/nakshatra/yoga/
                                    karana from ~120 start instants 1990-2060.
  B. panchang-at-sunrise.json     — sunrise-labelled day records: the ordered
                                    element spans touching each vedic day
                                    (sunrise -> next sunrise), incl. kshaya/
                                    vriddhi days and polar sites.

Same discipline as generate_fixtures.py: deterministic output (fixed grids,
rounded values, sorted keys, no clock reads), self-check aborts before
writing anything if the ephemeris disagrees with the golden anchors.

Window semantics (the TS API implements exactly this):
  - normal day:   window = local sunrise -> next civil date's sunrise
  - next date has no sunrise: window = sunrise -> sunrise + 1.0 day
  - no sunrise today (polar): window = local midnight -> next local midnight
Element spans: first span is the element in effect at window start
(startUtc null); subsequent spans begin at boundary crossings; the last
span's end instant is the true crossing, which may fall past window end.
"""

from __future__ import annotations

import json
import math
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path
from zoneinfo import ZoneInfo

import swisseph as swe

ROOT = Path(__file__).resolve().parent.parent
VEDIC_FIXTURES = ROOT / "packages" / "vedic" / "fixtures"

FLAGS = swe.FLG_MOSEPH | swe.FLG_SPEED
SOURCE = "swisseph-2.10.03 (pyswisseph 2.10.3.2), moshier, Lahiri, mean node"

UNIX_EPOCH_JD = 2440587.5
FOUNDER_JD = swe.julday(1993, 8, 18, 5.25)  # 1993-08-18 11:00 NPT = 05:15 UT
RAHU_KAAL_JD = swe.julday(2026, 7, 2, 0.0)

TITHI_WIDTH = 12.0
KARANA_WIDTH = 6.0
NAKSHATRA_WIDTH = 360.0 / 27.0
YOGA_WIDTH = 360.0 / 27.0

BISECT_TOL_DAYS = 1e-7  # ~9 ms
WINDOW_EDGE_EPS = 1e-6  # crossings within ~0.09 s of window end belong to the next day

SITES = {
    "kathmandu": {"lat": 27.7172, "lon": 85.324, "tz": "Asia/Kathmandu"},
    "birgunj": {"lat": 27.0104, "lon": 84.8821, "tz": "Asia/Kathmandu"},
    "helsinki": {"lat": 60.1699, "lon": 24.9384, "tz": "Europe/Helsinki"},
    "utqiagvik": {"lat": 71.2906, "lon": -156.7886, "tz": "America/Anchorage"},
}


def norm360(deg: float) -> float:
    d = math.fmod(deg, 360.0)
    return d + 360.0 if d < 0 else d


def utc_iso(jd_ut: float) -> str:
    dt = datetime(1970, 1, 1, tzinfo=timezone.utc) + timedelta(days=jd_ut - UNIX_EPOCH_JD)
    dt = (dt + timedelta(microseconds=500000)).replace(microsecond=0)
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def jd_from_utc(dt: datetime) -> float:
    return UNIX_EPOCH_JD + dt.astimezone(timezone.utc).timestamp() / 86400.0


def lon_of(jd_ut: float, body: int) -> float:
    xx, _ = swe.calc_ut(jd_ut, body, FLAGS)
    return norm360(xx[0])


def write_json(path: Path, obj: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(obj, sort_keys=True, indent=2, ensure_ascii=False) + "\n"
    path.write_text(text, encoding="utf-8", newline="\n")
    print(f"wrote {path.relative_to(ROOT)}")


# ------------------------------------------------------------- quantities

def elongation(jd_ut: float) -> float:
    return norm360(lon_of(jd_ut, swe.MOON) - lon_of(jd_ut, swe.SUN))


def moon_sidereal(jd_ut: float) -> float:
    return norm360(lon_of(jd_ut, swe.MOON) - swe.get_ayanamsa_ut(jd_ut))


def yoga_sum(jd_ut: float) -> float:
    aya = swe.get_ayanamsa_ut(jd_ut)
    return norm360(lon_of(jd_ut, swe.SUN) + lon_of(jd_ut, swe.MOON) - 2 * aya)


# All four quantities are strictly increasing (Moon's minimum rate exceeds
# the Sun's maximum), and reach the next boundary within width/min-rate
# < 1.3 days, so mod-360 progress from the start value stays well under
# 360 deg over the whole search and is monotonic.
ELEMENTS = {
    "tithi": (elongation, TITHI_WIDTH),
    "karana": (elongation, KARANA_WIDTH),
    "nakshatra": (moon_sidereal, NAKSHATRA_WIDTH),
    "yoga": (yoga_sum, YOGA_WIDTH),
}


def next_boundary(value_fn, width: float, jd0: float) -> float:
    """First instant after jd0 when value_fn crosses the next k*width."""
    v0 = value_fn(jd0)
    gap = (math.floor(v0 / width) + 1) * width - v0  # in (0, width]

    def progress(t: float) -> float:
        return norm360(value_fn(t) - v0)

    lo, hi = jd0, jd0 + 0.25
    while progress(hi) < gap:
        lo, hi = hi, hi + 0.25
        if hi > jd0 + 3.0:
            raise RuntimeError(f"no boundary within 3 days of jd {jd0}")
    while hi - lo > BISECT_TOL_DAYS:
        mid = (lo + hi) / 2
        if progress(mid) < gap:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2


def element_spans(name: str, jd_start: float, jd_end: float) -> list[dict]:
    """Ordered spans of one element type touching [jd_start, jd_end)."""
    value_fn, width = ELEMENTS[name]
    spans: list[dict] = []
    t = jd_start
    start_jd: float | None = None
    for _ in range(10):
        v = value_fn(t)
        span: dict = {"index": int(v // width)}
        if name == "nakshatra":
            span["pada"] = int(v // (width / 4)) % 4 + 1
        end_jd = next_boundary(value_fn, width, t)
        span["startJdUt"] = round(start_jd, 8) if start_jd is not None else None
        span["startUtc"] = utc_iso(start_jd) if start_jd is not None else None
        span["endJdUt"] = round(end_jd, 8)
        span["endUtc"] = utc_iso(end_jd)
        spans.append(span)
        if end_jd >= jd_end - WINDOW_EDGE_EPS:
            return spans
        start_jd = end_jd
        t = end_jd + WINDOW_EDGE_EPS
    raise RuntimeError(f"more than 10 {name} spans in one day window")


# ---------------------------------------------------------------- sunrise

def day_events(site: dict, y: int, m: int, d: int) -> dict:
    """Sunrise/sunset (jd or polar state) for one LOCAL calendar date."""
    local_midnight = datetime(y, m, d, tzinfo=ZoneInfo(site["tz"]))
    jd0 = jd_from_utc(local_midnight)
    jd1 = jd_from_utc(local_midnight + timedelta(days=1))
    record: dict = {"midnightJd": jd0, "nextMidnightJd": jd1}
    geopos = (site["lon"], site["lat"], 0.0)
    for key, rsmi in (("sunrise", swe.CALC_RISE), ("sunset", swe.CALC_SET)):
        res, tret = swe.rise_trans(jd0, swe.SUN, rsmi, geopos, 0.0, 0.0, swe.FLG_MOSEPH)
        record[key] = tret[0] if res == 0 and tret[0] < jd1 else None
    if record["sunrise"] is None:
        xx, _ = swe.calc_ut((jd0 + jd1) / 2, swe.SUN, FLAGS)
        _, _, alt = swe.azalt((jd0 + jd1) / 2, swe.ECL2HOR, geopos, 0.0, 0.0, (xx[0], xx[1], xx[2]))
        record["polar"] = "always_up" if alt > 0 else "always_down"
    return record


def sunrise_jd(site: dict, day_: date) -> float | None:
    return day_events(site, day_.year, day_.month, day_.day)["sunrise"]


# ------------------------------------------------------------ day records

def day_record(site_name: str, day_: date) -> dict:
    site = SITES[site_name]
    events = day_events(site, day_.year, day_.month, day_.day)
    record: dict = {
        "date": day_.isoformat(),
        "site": site_name,
        "vaarIndex": (day_.weekday() + 1) % 7,  # Sun=0 .. Sat=6
        "sunriseUtc": utc_iso(events["sunrise"]) if events["sunrise"] else None,
        "sunsetUtc": utc_iso(events["sunset"]) if events["sunset"] else None,
    }
    if events["sunrise"] is not None:
        record["daylight"] = "normal"
        window_start = events["sunrise"]
        next_rise = sunrise_jd(site, day_ + timedelta(days=1))
        window_end = next_rise if next_rise is not None else window_start + 1.0
    else:
        record["daylight"] = events["polar"]
        window_start = events["midnightJd"]
        window_end = events["nextMidnightJd"]
    record["windowStartJdUt"] = round(window_start, 8)
    record["windowStartUtc"] = utc_iso(window_start)
    record["windowEndJdUt"] = round(window_end, 8)
    record["windowEndUtc"] = utc_iso(window_end)
    for name in ELEMENTS:
        record[name] = element_spans(name, window_start, window_end)
    # Kshaya: a middle tithi lives entirely inside the window (3 spans).
    # Vriddhi: one tithi covers the whole window (both sunrises, 1 span).
    record["kshayaTithi"] = len(record["tithi"]) == 3
    record["vriddhiTithi"] = len(record["tithi"]) == 1
    return record


def scan_kshaya_vriddhi(site_name: str, start: date, end: date) -> tuple[list[date], list[date]]:
    """Days whose vedic window holds 3 tithis (kshaya) or 1 (vriddhi)."""
    site = SITES[site_name]
    kshaya: list[date] = []
    vriddhi: list[date] = []
    day_ = start
    rise = sunrise_jd(site, day_)
    while day_ < end and (len(kshaya) < 3 or len(vriddhi) < 3):
        next_day = day_ + timedelta(days=1)
        next_rise = sunrise_jd(site, next_day)
        if rise is not None and next_rise is not None:
            t0 = int(elongation(rise) // TITHI_WIDTH)
            t1 = int(elongation(next_rise) // TITHI_WIDTH)
            step = (t1 - t0) % 30
            if step == 2 and len(kshaya) < 3:
                kshaya.append(day_)
            elif step == 0 and len(vriddhi) < 3:
                vriddhi.append(day_)
        day_, rise = next_day, next_rise
    return kshaya, vriddhi


# ---------------------------------------------------------------- checks

def self_check() -> None:
    """Executable golden anchors; abort before writing on any mismatch."""
    problems: list[str] = []

    aya = swe.get_ayanamsa_ut(FOUNDER_JD)
    if abs(aya - 23.7681) > 0.005:
        problems.append(f"ayanamsa 1993: got {aya:.4f}, expected 23.7681")

    founder = {
        "tithi index (Shukla Pratipada)": (int(elongation(FOUNDER_JD) // TITHI_WIDTH), 0),
        "karana slot (Kimstughna)": (int(elongation(FOUNDER_JD) // KARANA_WIDTH), 0),
        "nakshatra (Magha)": (int(moon_sidereal(FOUNDER_JD) // NAKSHATRA_WIDTH), 9),
        "pada": (int(moon_sidereal(FOUNDER_JD) // (NAKSHATRA_WIDTH / 4)) % 4 + 1, 3),
        "yoga (Parigha)": (int(yoga_sum(FOUNDER_JD) // YOGA_WIDTH), 18),
    }
    for label, (actual, expected) in founder.items():
        if actual != expected:
            problems.append(f"founder {label}: got {actual}, expected {expected}")

    # Solver consistency: each solved boundary must sit on its target angle.
    for name, (value_fn, width) in ELEMENTS.items():
        end = next_boundary(value_fn, width, FOUNDER_JD)
        target = (math.floor(value_fn(FOUNDER_JD) / width) + 1) * width % 360.0
        miss = abs(norm360(value_fn(end) - target + 180.0) - 180.0)
        if miss > 1e-4:
            problems.append(f"{name} boundary off target by {miss:.2e} deg")
        if not FOUNDER_JD < end < FOUNDER_JD + 1.5:
            problems.append(f"{name} boundary at {end}, not within 1.5 days")

    ktm = SITES["kathmandu"]
    events = day_events(ktm, 2026, 7, 2)
    for key, expected_iso in (("sunrise", "2026-07-01T23:27"), ("sunset", "2026-07-02T13:18")):
        got = datetime.strptime(utc_iso(events[key]), "%Y-%m-%dT%H:%M:%SZ").replace(tzinfo=timezone.utc)
        want = datetime.strptime(expected_iso, "%Y-%m-%dT%H:%M").replace(tzinfo=timezone.utc)
        if abs((got - want).total_seconds()) > 60:
            problems.append(f"KTM 2026-07-02 {key}: got {utc_iso(events[key])}, expected ~{expected_iso}Z")

    for day_, expected_vaar in ((date(1993, 8, 18), 3), (date(2026, 7, 2), 4)):
        actual = (day_.weekday() + 1) % 7
        if actual != expected_vaar:
            problems.append(f"vaar {day_}: got {actual}, expected {expected_vaar}")

    if problems:
        print("GOLDEN SELF-CHECK FAILED — nothing was written:", file=sys.stderr)
        for p in problems:
            print(f"  - {p}", file=sys.stderr)
        sys.exit(1)
    print("golden self-checks passed")


# ------------------------------------------------------------------ sets

def gen_element_boundaries() -> None:
    start = swe.julday(1990, 1, 1, 0.0)
    jds = [start + i * 213.07 for i in range(120)] + [FOUNDER_JD, RAHU_KAAL_JD]
    data = []
    for jd in jds:
        row: dict = {"jdUt": round(jd, 8), "utc": utc_iso(jd)}
        for name, (value_fn, width) in ELEMENTS.items():
            end = next_boundary(value_fn, width, jd)
            row[name] = {
                "index": int(value_fn(jd) // width),
                "endJdUt": round(end, 8),
                "endUtc": utc_iso(end),
            }
        data.append(row)
    write_json(VEDIC_FIXTURES / "element-boundaries.json", {
        "source": SOURCE,
        "parameters": {
            "count": len(data),
            "definition": "per start instant: current element index and the instant "
                          "its element ends (next crossing of k*width); tithi 12 deg on "
                          "moon-sun elongation, karana 6 deg on elongation, nakshatra "
                          "360/27 deg on sidereal moon, yoga 360/27 deg on sidereal sun+moon",
            "solver": "bisection to 1e-7 day (~9 ms)",
        },
        "data": data,
    })


def gen_panchang_at_sunrise() -> None:
    days: list[tuple[str, date]] = []
    days += [("kathmandu", date(2025, 1, 10) + timedelta(days=36 * i)) for i in range(34)]
    days += [("birgunj", date(2025, 2, 5) + timedelta(days=37 * i)) for i in range(34)]
    days += [("helsinki", date(2025, 3, 1) + timedelta(days=36 * i)) for i in range(30)]
    days += [("utqiagvik", date(2026, m, 15)) for m in range(1, 13)]
    days += [("birgunj", date(1993, 8, 18)), ("kathmandu", date(2026, 7, 2))]

    kshaya, vriddhi = scan_kshaya_vriddhi("kathmandu", date(2025, 1, 1), date(2027, 12, 30))
    print(f"kshaya days found: {[d.isoformat() for d in kshaya]}")
    print(f"vriddhi days found: {[d.isoformat() for d in vriddhi]}")
    existing = {(site, d) for site, d in days}
    days += [("kathmandu", d) for d in kshaya + vriddhi if ("kathmandu", d) not in existing]

    data = [day_record(site, d) for site, d in days]
    n_kshaya = sum(1 for r in data if r["kshayaTithi"])
    n_vriddhi = sum(1 for r in data if r["vriddhiTithi"])
    if n_kshaya < 3 or n_vriddhi < 3:
        print(f"FAILED: only {n_kshaya} kshaya / {n_vriddhi} vriddhi records", file=sys.stderr)
        sys.exit(1)

    write_json(VEDIC_FIXTURES / "panchang-at-sunrise.json", {
        "source": SOURCE,
        "parameters": {
            "count": len(data),
            "kshayaRecords": n_kshaya,
            "vriddhiRecords": n_vriddhi,
            "window": "sunrise -> next civil date's sunrise; sunrise + 1 day if the next "
                      "date has none; local midnight -> next local midnight on polar days",
            "spans": "ordered element spans touching the window; first span startUtc null "
                     "(began before window); last span endUtc may fall past window end",
            "sites": SITES,
        },
        "data": data,
    })


def main() -> None:
    swe.set_sid_mode(swe.SIDM_LAHIRI, 0, 0)
    self_check()
    gen_element_boundaries()
    gen_panchang_at_sunrise()
    print("done")


if __name__ == "__main__":
    main()
