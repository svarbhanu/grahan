// Consumer-fidelity smoke test: runs against the packed npm tarballs
// installed into a scratch project (see .github/workflows/ci.yml), on the
// oldest supported Node versions. No test framework — plain node.
import { panchang } from '@grahan/vedic';
import { sunPosition, julianDayFromDate } from '@grahan/core';

const p = panchang({
  date: new Date('1993-08-18T05:15:00Z'),
  latitude: 27.0104,
  longitude: 84.8821,
  timezone: 'Asia/Kathmandu',
});

const sun = sunPosition(julianDayFromDate(new Date('1993-08-18T05:15:00Z')));

const failures = [];
if (p.tithi.name !== 'Pratipada' || p.tithi.paksha !== 'shukla')
  failures.push(`tithi: ${JSON.stringify(p.tithi)}`);
if (p.nakshatra.name !== 'Magha' || p.nakshatra.pada !== 3)
  failures.push(`nakshatra: ${JSON.stringify(p.nakshatra)}`);
if (p.yoga.name !== 'Parigha') failures.push(`yoga: ${JSON.stringify(p.yoga)}`);
if (p.vaar.name !== 'Wednesday')
  failures.push(`vaar: ${JSON.stringify(p.vaar)}`);
if (Math.abs(sun.apparentLongitude - 145.281) > 0.01)
  failures.push(`sun: ${sun.apparentLongitude}`);

if (failures.length > 0) {
  console.error(
    `smoke FAILED on node ${process.version}:\n  ${failures.join('\n  ')}`,
  );
  process.exit(1);
}
console.log(
  `smoke OK on node ${process.version}: Shukla Pratipada · Magha-3 · Parigha · Wednesday`,
);
