# scripts — offline fixture generation

`generate_fixtures.py` produces the golden JSON fixtures committed under
`packages/*/fixtures/` by querying Swiss Ephemeris (via `pyswisseph`).

## Why this is offline-only

Swiss Ephemeris is AGPL-licensed; grahan is MIT. No Swiss Ephemeris code may
be linked, bundled, or required at runtime — it runs **only here, on a
maintainer's machine**, to produce reference _data_ (facts are not
copyrightable code). The packages are built and tested from the committed
JSON alone: **Python is never required for `pnpm build` or `pnpm test`.**

## Setup (once)

Requires Python 3.11 (pyswisseph 2.10.3.2 has no prebuilt Windows wheel for
3.12+). On Windows: `winget install Python.Python.3.11`.

```powershell
py -3.11 -m venv scripts/.venv
scripts/.venv/Scripts/pip install -r scripts/requirements.txt
```

## Regenerate fixtures

```powershell
scripts/.venv/Scripts/python scripts/generate_fixtures.py
```

The script is deterministic — no clock reads, fixed instant grids, rounded
values, sorted keys — so a re-run with the same pyswisseph version produces
byte-identical files (`git status` stays clean). It also self-checks the
golden values from CLAUDE.md (founder chart, 1993 Lahiri ayanamsa, Kathmandu
2026-07-02 sunrise/sunset) and aborts without writing if any disagree.

Ephemeris mode: `FLG_MOSEPH` (built-in Moshier model, no data files,
accuracy ~0.1″ — far tighter than grahan's published tolerances).
