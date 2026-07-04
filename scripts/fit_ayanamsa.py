"""Fit a cubic in julian centuries (J2000) to the committed Lahiri fixture.

Pure-python least squares (normal equations) — prints coefficients for
packages/vedic/src/ayanamsa.ts and the max residual in arcseconds.
"""

from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
fixture = json.loads(
    (ROOT / "packages" / "vedic" / "fixtures" / "ayanamsa.json").read_text("utf-8")
)

points = [((row["jdUt"] - 2451545.0) / 36525.0, row["lahiri"]) for row in fixture["data"]]

DEGREE = 3
size = DEGREE + 1
# Normal equations A^T A c = A^T y for the Vandermonde design matrix.
ata = [[sum(t ** (i + j) for t, _ in points) for j in range(size)] for i in range(size)]
aty = [sum(y * t**i for t, y in points) for i in range(size)]

# Gaussian elimination with partial pivoting.
for col in range(size):
    pivot = max(range(col, size), key=lambda r: abs(ata[r][col]))
    ata[col], ata[pivot] = ata[pivot], ata[col]
    aty[col], aty[pivot] = aty[pivot], aty[col]
    for row in range(col + 1, size):
        factor = ata[row][col] / ata[col][col]
        for k in range(col, size):
            ata[row][k] -= factor * ata[col][k]
        aty[row] -= factor * aty[col]
coeffs = [0.0] * size
for row in reversed(range(size)):
    coeffs[row] = (aty[row] - sum(ata[row][k] * coeffs[k] for k in range(row + 1, size))) / ata[row][row]

max_residual = max(
    abs(sum(c * t**i for i, c in enumerate(coeffs)) - y) for t, y in points
)
print("coefficients (deg 0..3):")
for c in coeffs:
    print(f"  {c!r}")
print(f"max residual: {max_residual * 3600:.3f} arcsec over {len(points)} epochs")
