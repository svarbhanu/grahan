/**
 * `kundaliSvg()` — render a kundali as a self-contained SVG string in the
 * North Indian (fixed houses, diamond) or South Indian (fixed signs, grid)
 * style. Pure string building; strokes use `currentColor` so the chart
 * follows the text color wherever it is embedded.
 */

import type { Kundali } from './kundali.js';
import { renderNorthChart } from './chartNorth.js';
import { renderSouthChart } from './chartSouth.js';
import { GRAHA_ABBREVIATIONS } from './names.js';

export interface ChartOptions {
  /** North Indian (default) or South Indian layout. */
  style?: 'north' | 'south';
  /** Rendered width/height in pixels (square). Default 400. */
  size?: number;
  /** Draw the rashi chart (D1, default) or the navamsa chart (D9). */
  varga?: 'rashi' | 'navamsa';
}

/** One house's rendering payload, house 1 = lagna. */
export interface ChartHouse {
  /** House number 1–12. */
  bhava: number;
  /** Rashi index 0–11 occupying this house. */
  rashi: number;
  /** Graha labels in display order, e.g. "Sa℞". */
  labels: string[];
}

/**
 * Group a kundali's grahas into 12 houses for the requested varga. For the
 * navamsa the lagna's own navamsa rashi anchors house 1 (whole-sign D9).
 */
export function chartHouses(
  kundali: Kundali,
  varga: 'rashi' | 'navamsa',
): ChartHouse[] {
  const lagnaRashi =
    varga === 'rashi' ? kundali.lagna.rashi : kundali.lagna.navamsaRashi;
  const houses: ChartHouse[] = Array.from({ length: 12 }, (_, index) => ({
    bhava: index + 1,
    rashi: (lagnaRashi + index) % 12,
    labels: [],
  }));
  for (const graha of kundali.grahas) {
    const rashi = varga === 'rashi' ? graha.rashi : graha.navamsaRashi;
    const house = houses[(rashi - lagnaRashi + 12) % 12];
    if (house === undefined) continue;
    const abbreviation = GRAHA_ABBREVIATIONS[graha.graha];
    house.labels.push(graha.retrograde ? `${abbreviation}℞` : abbreviation);
  }
  return houses;
}

/**
 * Render a kundali to an SVG string.
 *
 * @example
 * ```ts
 * const svg = kundaliSvg(kundali({ date, latitude, longitude }));
 * writeFileSync('chart.svg', svg); // or element.innerHTML = svg
 * ```
 */
export function kundaliSvg(
  kundali: Kundali,
  options: ChartOptions = {},
): string {
  const { style = 'north', size = 400, varga = 'rashi' } = options;
  const houses = chartHouses(kundali, varga);
  return style === 'south'
    ? renderSouthChart(houses, size)
    : renderNorthChart(houses, size);
}
