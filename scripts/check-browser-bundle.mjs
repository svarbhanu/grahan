// Browser-bundle proof, run from a consumer directory where the
// @grahan packages and esbuild are installed (CI installs the packed
// tarballs; locally, any scratch dir after `npm install <tgz>...`).
//
//   node check-browser-bundle.mjs
//
// Proves three claims the README makes:
//   1. The shipped code bundles for the browser with ZERO Node builtins
//      (esbuild with platform=browser errors on any node: import).
//   2. The bundle actually computes (founder-date panchang check).
//   3. Tree-shaking works: a panchang-only bundle must stay well under
//      the everything-bundle (planet tables + eclipses shaken off).
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

// Ceilings set from the first measured run (see PLAN.md 2026-07-06);
// generous headroom so only a real regression trips them.
const PANCHANG_GZIP_LIMIT_KB = 40;
const TREESHAKE_RATIO_LIMIT = 0.6;

mkdirSync('entries', { recursive: true });
writeFileSync(
  'entries/panchang-only.mjs',
  `import { panchang } from '@grahan/vedic';
const p = panchang({
  date: new Date('1993-08-18T05:15:00Z'),
  latitude: 27.0104, longitude: 84.8821, timezone: 'Asia/Kathmandu',
});
console.log(p.tithi.name, p.nakshatra.name, p.nakshatra.pada);
`,
);
writeFileSync(
  'entries/everything.mjs',
  `export * from '@grahan/core';
export * from '@grahan/vedic';
export * from '@grahan/calendars';
`,
);

async function bundle(entry, outfile) {
  await build({
    entryPoints: [entry],
    outfile,
    bundle: true,
    minify: true,
    format: 'esm',
    platform: 'browser', // any node: import is a hard build error here
    logLevel: 'silent',
  });
  return gzipSync(readFileSync(outfile)).length / 1024;
}

const panchangKb = await bundle(
  'entries/panchang-only.mjs',
  'out-panchang.mjs',
);
const everythingKb = await bundle(
  'entries/everything.mjs',
  'out-everything.mjs',
);
const ratio = panchangKb / everythingKb;

console.log(`[bundle] panchang-only: ${panchangKb.toFixed(1)} KB gzipped`);
console.log(`[bundle] everything:    ${everythingKb.toFixed(1)} KB gzipped`);
console.log(`[bundle] tree-shake ratio: ${ratio.toFixed(2)}`);

const output = execFileSync('node', ['out-panchang.mjs'], { encoding: 'utf8' });
console.log(`[bundle] founder check: ${output.trim()}`);

const problems = [];
if (!output.includes('Pratipada') || !output.includes('Magha')) {
  problems.push(`bundle computed wrong panchang: ${output.trim()}`);
}
if (panchangKb > PANCHANG_GZIP_LIMIT_KB) {
  problems.push(
    `panchang bundle ${panchangKb.toFixed(1)} KB > ${PANCHANG_GZIP_LIMIT_KB} KB ceiling`,
  );
}
if (ratio > TREESHAKE_RATIO_LIMIT) {
  problems.push(
    `tree-shake ratio ${ratio.toFixed(2)} > ${TREESHAKE_RATIO_LIMIT} - planet/eclipse code is leaking into the panchang bundle`,
  );
}

if (problems.length > 0) {
  console.error('BROWSER BUNDLE CHECK FAILED:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('browser bundle check passed');
