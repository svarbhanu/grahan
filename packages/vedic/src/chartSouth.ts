/**
 * South Indian chart: the twelve signs hold fixed grid cells (Meena at the
 * top-left, proceeding clockwise) and the lagna's cell is marked with a
 * corner stroke. The center 2×2 block stays empty.
 */

import type { ChartHouse } from './chart.js';

/** Grid (column, row) for each rashi 0–11 in the fixed South layout. */
const RASHI_CELLS: readonly (readonly [number, number])[] = [
  [1, 0], // Mesha
  [2, 0], // Vrishabha
  [3, 0], // Mithuna
  [3, 1], // Karka
  [3, 2], // Simha
  [3, 3], // Kanya
  [2, 3], // Tula
  [1, 3], // Vrishchika
  [0, 3], // Dhanu
  [0, 2], // Makara
  [0, 1], // Kumbha
  [0, 0], // Meena
];

export function renderSouthChart(houses: ChartHouse[], size: number): string {
  const cell = size / 4;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" font-family="system-ui, sans-serif">`,
    `<rect x="1" y="1" width="${size - 2}" height="${size - 2}" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
  ];
  // Cell borders (skip the inner 2×2 block).
  for (const [column, row] of RASHI_CELLS) {
    parts.push(
      `<rect x="${column * cell}" y="${row * cell}" width="${cell}" height="${cell}" fill="none" stroke="currentColor" stroke-width="1"/>`,
    );
  }
  const grahaFont = Math.round(size * 0.042);
  const lagnaHouse = houses.find((house) => house.bhava === 1);
  for (const house of houses) {
    const cellPosition = RASHI_CELLS[house.rashi];
    if (cellPosition === undefined) continue;
    const [column, row] = cellPosition;
    const x = Math.round(column * cell + cell / 2);
    const yTop = Math.round(row * cell + grahaFont * 1.4);
    if (house.bhava === 1) {
      // The lagna marker: a slash across the cell's top-left corner.
      parts.push(
        `<path d="M${column * cell} ${row * cell + cell * 0.3} L${column * cell + cell * 0.3} ${row * cell}" stroke="currentColor" stroke-width="1.5" fill="none"/>`,
      );
    }
    house.labels.forEach((label, line) => {
      parts.push(
        `<text x="${x}" y="${yTop + line * (grahaFont + 2)}" text-anchor="middle" font-size="${grahaFont}" fill="currentColor">${label}</text>`,
      );
    });
  }
  // Keep the lagna's rashi visible even when house 1 is empty of grahas.
  if (lagnaHouse !== undefined) {
    const cellPosition = RASHI_CELLS[lagnaHouse.rashi];
    if (cellPosition !== undefined) {
      const [column, row] = cellPosition;
      parts.push(
        `<text x="${column * cell + cell * 0.12}" y="${row * cell + cell * 0.88}" font-size="${Math.round(size * 0.035)}" fill="currentColor" opacity="0.6">La</text>`,
      );
    }
  }
  parts.push('</svg>');
  return parts.join('\n');
}
