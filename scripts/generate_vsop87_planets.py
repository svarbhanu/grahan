"""Generate packages/core/src/bodies/vsop87-<planet>.data.ts for the five
classical planets (Mercury, Venus, Mars, Jupiter, Saturn).

Same source and format as generate_vsop87_earth.py (VSOP87D: heliocentric
spherical L/B/R, mean ecliptic and equinox of date), but truncation is sized
from an error budget instead of fixed counts: for each series order k we keep
the smallest amplitude-sorted prefix whose dropped tail satisfies
    (sum of dropped |A|) * TAU_MAX**k < EPS
over grahan's supported window 1900-2100 (TAU_MAX = 0.101 julian millennia).
The linear tail-sum is a worst-case bound, so the real truncation error is
far below the printed bound. Budget: 6 orders x 0.2" ~= 1.2" heliocentric
worst case (realistically ~0.1"), vs the published geocentric planet
tolerance of 0.02 deg (72") — Mars near opposition amplifies heliocentric
error ~4x, still leaving a margin of more than a factor 10.
"""

from __future__ import annotations

import math
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE_DIR = ROOT / "scripts" / ".cache"
OUT_DIR = ROOT / "packages" / "core" / "src" / "bodies"

MIRRORS = [
    "https://cdsarc.cds.unistra.fr/ftp/VI/81/VSOP87D.{ext}",
    "https://raw.githubusercontent.com/gmiller123456/vsop87-multilang/master/Raw/VSOP87D.{ext}",
]

PLANETS = {
    "mercury": "mer",
    "venus": "ven",
    "mars": "mar",
    "jupiter": "jup",
    "saturn": "sat",
}

# Approximate semi-major axes (AU). The R budget scales with distance: what
# matters for geocentric direction is the RELATIVE radial error dR/a, so a
# fixed absolute AU budget would be ~25x too strict for Saturn vs Mercury.
SEMI_MAJOR_AU = {
    "mercury": 0.39,
    "venus": 0.72,
    "mars": 1.52,
    "jupiter": 5.20,
    "saturn": 9.55,
}

TAU_MAX = 0.101  # |julian millennia from J2000| across 1900-2100
EPS = 1e-6  # rad (L, B) worst-case truncation bound per series order
VARIABLE_NAMES = {1: "L", 2: "B", 3: "R"}


def download(ext: str) -> str:
    cache = CACHE_DIR / f"VSOP87D.{ext}"
    if cache.exists():
        return cache.read_text(encoding="ascii")
    last_error: Exception | None = None
    for mirror in MIRRORS:
        url = mirror.format(ext=ext)
        try:
            with urllib.request.urlopen(url, timeout=60) as response:
                text = response.read().decode("ascii")
            cache.parent.mkdir(parents=True, exist_ok=True)
            cache.write_text(text, encoding="ascii")
            print(f"downloaded {url} ({len(text)} bytes)")
            return text
        except Exception as error:  # noqa: BLE001 - try the mirror
            print(f"failed {url}: {error}", file=sys.stderr)
            last_error = error
    raise SystemExit(f"could not download VSOP87D.{ext}: {last_error}")


def parse(text: str) -> dict[str, list[list[tuple[float, float, float]]]]:
    series: dict[str, list[list[tuple[float, float, float]]]] = {
        "L": [], "B": [], "R": [],
    }
    current: list[tuple[float, float, float]] | None = None
    for line in text.splitlines():
        if "VSOP87" in line and "VARIABLE" in line:
            variable = VARIABLE_NAMES[int(line.split("VARIABLE")[1].split()[0])]
            order = int(line.split("*T**")[1].split()[0])
            terms: list[tuple[float, float, float]] = []
            assert len(series[variable]) == order, "series arrived out of order"
            series[variable].append(terms)
            current = terms
        elif current is not None and line.strip():
            fields = line.split()
            a, b, c = (float(x) for x in fields[-3:])
            current.append((a, b, c))
    if not (series["L"] and series["B"] and series["R"]):
        raise SystemExit("parse sanity failed: missing L/B/R headers")
    if len(series["L"][0]) < 200:
        raise SystemExit(f"parse sanity failed: L0 has only {len(series['L'][0])} terms")
    return series


def truncate(
    terms: list[tuple[float, float, float]], order: int, eps: float
) -> list[tuple[float, float, float]]:
    """Smallest amplitude-sorted prefix whose dropped tail stays under eps."""
    scale = TAU_MAX ** order
    tail = sum(abs(a) for a, _, _ in terms) * scale
    kept = 0
    for a, _, _ in terms:
        if tail < eps:
            break
        tail -= abs(a) * scale
        kept += 1
    return terms[:kept]


def emit(planet: str, series: dict[str, list[list[tuple[float, float, float]]]]) -> None:
    upper = planet.upper()
    eps_by_variable = {"L": EPS, "B": EPS, "R": EPS * SEMI_MAJOR_AU[planet]}
    kept = {
        v: [truncate(terms, order, eps_by_variable[v]) for order, terms in enumerate(series[v])]
        for v in ("L", "B", "R")
    }
    counts = {v: [len(t) for t in kept[v]] for v in kept}
    bound = {
        v: sum(
            (sum(abs(a) for a, _, _ in full) - sum(abs(a) for a, _, _ in cut))
            * TAU_MAX ** order
            for order, (full, cut) in enumerate(zip(series[v], kept[v]))
        )
        for v in ("L", "B", "R")
    }
    lines = [
        "// Generated by scripts/generate_vsop87_planets.py — DO NOT EDIT BY HAND.",
        f"// Source: VSOP87D (Bretagnon & Francou 1988), {planet.capitalize()},",
        "// heliocentric spherical coordinates, mean ecliptic and equinox of date.",
        "// Each term is [A, B, C]: A*cos(B + C*tau), tau = julian millennia",
        "// from J2000 (TT); series k is multiplied by tau**k.",
        f"// Units: radians (L, B), AU (R). Kept terms: L {counts['L']}, B {counts['B']}, R {counts['R']}.",
        f"// Worst-case truncation bound over 1900–2100: L {bound['L']:.2e} rad, B {bound['B']:.2e} rad, R {bound['R']:.2e} AU.",
        "",
        "import type { Vsop87Series } from './vsop87-earth.data.js';",
    ]
    for variable in ("L", "B", "R"):
        lines.append("")
        lines.append(f"export const {upper}_{variable}: Vsop87Series = [")
        for terms in kept[variable]:
            if not terms:
                continue
            lines.append("  [")
            for a, b, c in terms:
                lines.append(f"    [{a!r}, {b!r}, {c!r}],")
            lines.append("  ],")
        lines.append("];")
    out = OUT_DIR / f"vsop87-{planet}.data.ts"
    out.write_text("\n".join(lines) + "\n", encoding="utf-8", newline="\n")
    total = sum(len(t) for v in kept for t in kept[v])
    arcsec_l = math.degrees(bound["L"]) * 3600
    print(f"wrote {out.relative_to(ROOT)}: {total} terms, L-bound {arcsec_l:.3f}\"")


if __name__ == "__main__":
    for name, ext in PLANETS.items():
        emit(name, parse(download(ext)))
