import { CORE_VERSION } from '@grahan/core';

/**
 * @grahan/vedic — Vedic layer on the grahan sky engine.
 *
 * Placeholder proving the workspace link to @grahan/core; the real modules
 * (ayanamsa, tithi, nakshatra, yoga, karana, Rahu Kaal) arrive in M5.
 *
 * @example
 * ```ts
 * import { engineInfo } from '@grahan/vedic';
 * console.log(engineInfo()); // { vedic: "0.0.0", core: "0.0.0" }
 * ```
 */
export function engineInfo(): { vedic: string; core: string } {
  return { vedic: '0.0.0', core: CORE_VERSION };
}
