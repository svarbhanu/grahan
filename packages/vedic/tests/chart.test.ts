import { describe, expect, it } from 'vitest';
import {
  chartHouses,
  kundali,
  kundaliSvg,
  GRAHA_ABBREVIATIONS,
  GRAHA_ORDER,
} from '../src/index.js';

const FOUNDER = kundali({
  date: new Date('1993-08-18T05:15:00Z'),
  latitude: 27.0104,
  longitude: 84.8821,
});

function tagBalanced(svg: string, tag: string): boolean {
  const opens = svg.match(new RegExp(`<${tag}[ >]`, 'g'))?.length ?? 0;
  const closes = svg.match(new RegExp(`</${tag}>`, 'g'))?.length ?? 0;
  return opens === closes;
}

describe('kundaliSvg', () => {
  for (const style of ['north', 'south'] as const) {
    it(`${style}: renders all nine grahas and balanced markup`, () => {
      const svg = kundaliSvg(FOUNDER, { style });
      expect(svg.startsWith('<svg ')).toBe(true);
      expect(svg.endsWith('</svg>')).toBe(true);
      expect(tagBalanced(svg, 'text')).toBe(true);
      for (const graha of GRAHA_ORDER) {
        expect(svg).toContain(GRAHA_ABBREVIATIONS[graha]);
      }
      expect(svg).toContain('Sa℞'); // founder Saturn is retrograde
    });
  }

  it('north style numbers house 1 with the lagna rashi', () => {
    const svg = kundaliSvg(FOUNDER, { style: 'north' });
    // Tula = rashi index 6 → displayed as "7" in the top diamond.
    expect(svg).toContain('>7</text>');
  });

  it('south style marks the lagna cell', () => {
    const svg = kundaliSvg(FOUNDER, { style: 'south' });
    expect(svg).toContain('>La</text>');
  });

  it('respects the size option', () => {
    const svg = kundaliSvg(FOUNDER, { size: 640 });
    expect(svg).toContain('viewBox="0 0 640 640"');
  });
});

describe('chartHouses', () => {
  it('D1 houses mirror the kundali bhavas', () => {
    const houses = chartHouses(FOUNDER, 'rashi');
    expect(houses[0]?.rashi).toBe(FOUNDER.lagna.rashi);
    const labelCount = houses.reduce((n, h) => n + h.labels.length, 0);
    expect(labelCount).toBe(9);
  });

  it('D9 houses anchor on the navamsa lagna', () => {
    const houses = chartHouses(FOUNDER, 'navamsa');
    expect(houses[0]?.rashi).toBe(FOUNDER.lagna.navamsaRashi);
    for (const graha of FOUNDER.grahas) {
      const house = houses.find((h) => h.rashi === graha.navamsaRashi);
      const abbreviation = GRAHA_ABBREVIATIONS[graha.graha];
      expect(
        house?.labels.some((label) => label.startsWith(abbreviation)),
      ).toBe(true);
    }
  });
});
