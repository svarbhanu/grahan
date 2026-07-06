// Publish-tarball gate: asserts a packed .tgz is safe to publish.
// Used by the release workflow and runnable by hand before any release.
//
//   node scripts/inspect-tarball.mjs tarballs/*.tgz
//   EXPECT_VERSION=1.0.0 node scripts/inspect-tarball.mjs tarballs/*.tgz
//
// Checks, per tarball:
//   - only dist/ code ships (plus package.json, README, LICENSE)
//   - publishConfig exports were applied: no "grahan-dist" dev condition,
//     entry points resolve into dist/
//   - version matches EXPECT_VERSION when set, and all tarballs agree
// Exits non-zero on the first failure, naming it.
import { execFileSync } from 'node:child_process';

const ALLOWED_NON_DIST = new Set([
  'package/package.json',
  'package/README.md',
  'package/LICENSE',
]);

const tarballs = process.argv.slice(2);
if (tarballs.length === 0) {
  console.error('usage: node scripts/inspect-tarball.mjs <tgz>...');
  process.exit(2);
}

const problems = [];
const versions = new Set();

for (const tgz of tarballs) {
  // --force-local: a Windows path like C:/… has a colon GNU tar would
  // otherwise read as a remote host. Harmless on Linux runners.
  const files = execFileSync('tar', ['--force-local', '-tzf', tgz], {
    encoding: 'utf8',
  })
    .split('\n')
    .map((f) => f.trim())
    .filter((f) => f && !f.endsWith('/'));

  for (const file of files) {
    if (file.startsWith('package/dist/')) continue;
    if (ALLOWED_NON_DIST.has(file)) continue;
    problems.push(`${tgz}: unexpected file ${file}`);
  }

  const manifest = JSON.parse(
    execFileSync(
      'tar',
      ['--force-local', '-xzOf', tgz, 'package/package.json'],
      {
        encoding: 'utf8',
      },
    ),
  );
  const exportsText = JSON.stringify(manifest.exports ?? {});
  if (exportsText.includes('grahan-dist')) {
    problems.push(
      `${tgz}: dev-only 'grahan-dist' condition leaked into exports`,
    );
  }
  if (!exportsText.includes('./dist/')) {
    problems.push(`${tgz}: exports do not point into dist/ (${exportsText})`);
  }
  if (
    process.env.EXPECT_VERSION &&
    manifest.version !== process.env.EXPECT_VERSION
  ) {
    problems.push(
      `${tgz}: version ${manifest.version} != EXPECT_VERSION ${process.env.EXPECT_VERSION}`,
    );
  }
  versions.add(manifest.version);
  console.log(
    `inspected ${manifest.name}@${manifest.version} (${files.length} files)`,
  );
}

if (versions.size > 1) {
  problems.push(`tarballs disagree on version: ${[...versions].join(', ')}`);
}

if (problems.length > 0) {
  console.error('TARBALL INSPECTION FAILED:');
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('all tarballs pass publish inspection');
