/**
 * North Indian chart: houses hold fixed positions (house 1 is the top
 * diamond, counting anticlockwise) and each shows its rashi's number.
 * Drawn as a square with both diagonals plus the midpoint diamond.
 */

import type { ChartHouse } from './chart.js';

/** Label anchor (x, y) for each house 1–12, as fractions of the side. */
const HOUSE_ANCHORS: readonly (readonly [number, number])[] = [
  [0.5, 0.28],
  [0.25, 0.12],
  [0.12, 0.28],
  [0.28, 0.5],
  [0.12, 0.72],
  [0.25, 0.88],
  [0.5, 0.72],
  [0.75, 0.88],
  [0.88, 0.72],
  [0.72, 0.5],
  [0.88, 0.28],
  [0.75, 0.12],
];

export function renderNorthChart(houses: ChartHouse[], size: number): string {
  const s = size;
  const parts: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${s} ${s}" width="${s}" height="${s}" font-family="system-ui, sans-serif">`,
    `<rect x="1" y="1" width="${s - 2}" height="${s - 2}" fill="none" stroke="currentColor" stroke-width="1.5"/>`,
    `<path d="M1 1 L${s - 1} ${s - 1} M${s - 1} 1 L1 ${s - 1}" stroke="currentColor" stroke-width="1" fill="none"/>`,
    `<path d="M${s / 2} 1 L${s - 1} ${s / 2} L${s / 2} ${s - 1} L1 ${s / 2} Z" stroke="currentColor" stroke-width="1" fill="none"/>`,
  ];
  const rashiFont = Math.round(s * 0.035);
  const grahaFont = Math.round(s * 0.042);
  for (const house of houses) {
    const anchor = HOUSE_ANCHORS[house.bhava - 1];
    if (anchor === undefined) continue;
    const [fx, fy] = anchor;
    const x = Math.round(fx * s);
    const y = Math.round(fy * s);
    parts.push(
      `<text x="${x}" y="${y - grahaFont}" text-anchor="middle" font-size="${rashiFont}" fill="currentColor" opacity="0.6">${house.rashi + 1}</text>`,
    );
    house.labels.forEach((label, line) => {
      parts.push(
        `<text x="${x}" y="${y + line * (grahaFont + 2)}" text-anchor="middle" font-size="${grahaFont}" fill="currentColor">${label}</text>`,
      );
    });
  }
  parts.push('</svg>');
  return parts.join('\n');
}
