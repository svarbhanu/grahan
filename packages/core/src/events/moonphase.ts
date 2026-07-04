/**
 * Moon phase: elongation, phase angle, illuminated fraction, and the
 * common eight-phase name (Meeus ch. 48).
 */

import { degToRad, normalizeDegrees, radToDeg } from '../math/angles.js';
import { moonPosition } from '../bodies/moon.js';
import { sunPosition } from '../bodies/sun.js';

const KM_PER_AU = 149597870.7;

export type MoonPhaseName =
  | 'new'
  | 'waxing-crescent'
  | 'first-quarter'
  | 'waxing-gibbous'
  | 'full'
  | 'waning-gibbous'
  | 'last-quarter'
  | 'waning-crescent';

const PHASE_NAMES: readonly MoonPhaseName[] = [
  'new',
  'waxing-crescent',
  'first-quarter',
  'waxing-gibbous',
  'full',
  'waning-gibbous',
  'last-quarter',
  'waning-crescent',
];

export interface MoonPhase {
  /** Moon − Sun apparent longitude, degrees [0, 360); 0 new, 180 full. */
  elongation: number;
  /** Phase angle i (Sun–Moon–Earth), degrees [0, 180]. */
  phaseAngle: number;
  /** Illuminated fraction of the disc, 0–1. */
  illuminatedFraction: number;
  /** Eight-phase name, each covering a 45° window of elongation. */
  phaseName: MoonPhaseName;
}

/**
 * Phase of the Moon at an instant.
 *
 * @example
 * ```ts
 * moonPhase(2449217.71875).phaseName; // 'new' (Shukla Pratipada, 1993-08-18)
 * ```
 */
export function moonPhase(jdUt: number): MoonPhase {
  const sun = sunPosition(jdUt);
  const moon = moonPosition(jdUt);
  const elongation = normalizeDegrees(
    moon.apparentLongitude - sun.apparentLongitude,
  );

  // Geocentric elongation ψ includes the Moon's latitude (Meeus 48.2).
  const psi = Math.acos(
    Math.cos(degToRad(moon.latitude)) * Math.cos(degToRad(elongation)),
  );
  // Phase angle from the Sun–Moon–Earth triangle (Meeus 48.3).
  const sunKm = sun.distanceAu * KM_PER_AU;
  const phaseAngle = radToDeg(
    Math.atan2(sunKm * Math.sin(psi), moon.distanceKm - sunKm * Math.cos(psi)),
  );

  const index = Math.round(elongation / 45) % 8;
  const phaseName = PHASE_NAMES[index] ?? 'new';

  return {
    elongation,
    phaseAngle,
    illuminatedFraction: (1 + Math.cos(degToRad(phaseAngle))) / 2,
    phaseName,
  };
}
