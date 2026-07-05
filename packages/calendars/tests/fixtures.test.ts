import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { bsFromDate, dateFromBs } from '../src/index.js';

interface AnchorFixture {
  data: {
    anchors: {
      ad: [number, number, number];
      bs: [number, number, number];
      weekday: string;
      note: string;
    }[];
  };
}

const fixture = JSON.parse(
  readFileSync(new URL('../fixtures/bs-anchors.json', import.meta.url), 'utf8'),
) as AnchorFixture;

describe('published-calendar anchors (fixtures/bs-anchors.json)', () => {
  for (const { ad, bs, weekday, note } of fixture.data.anchors) {
    it(`${ad.join('-')} AD = ${bs.join('-')} BS, ${weekday} (${note})`, () => {
      const [adYear, adMonth, adDay] = ad;
      const [bsYear, bsMonth, bsDay] = bs;

      const toBs = bsFromDate({ year: adYear, month: adMonth, day: adDay });
      expect([toBs.year, toBs.month, toBs.day]).toEqual(bs);
      expect(toBs.weekday.name).toBe(weekday);

      const toAd = dateFromBs({ year: bsYear, month: bsMonth, day: bsDay });
      expect([toAd.year, toAd.month, toAd.day]).toEqual(ad);
      expect(toAd.weekday.name).toBe(weekday);
    });
  }
});
