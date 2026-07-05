/**
 * Shared VSOP87D series evaluator (Meeus ch. 32): each variable is
 * Σₖ tauᵏ · Σᵢ Aᵢ·cos(Bᵢ + Cᵢ·tau), tau in julian millennia from J2000 (TT).
 */

import type { Vsop87Series } from './vsop87-earth.data.js';

/**
 * Evaluate one VSOP87 variable (L, B, or R) at a time `tau`.
 *
 * @example
 * ```ts
 * evaluateSeries(EARTH_R, 0); // ≈ 0.9833 AU (Earth at J2000, near perihelion)
 * ```
 */
export function evaluateSeries(series: Vsop87Series, tau: number): number {
  let total = 0;
  let tauPower = 1;
  for (const order of series) {
    let sum = 0;
    for (const [a, b, c] of order) {
      sum += a * Math.cos(b + c * tau);
    }
    total += sum * tauPower;
    tauPower *= tau;
  }
  return total;
}
