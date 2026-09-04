/* Verifies that every user-visible version reference points at the same
   release. Run via `npm run check-versions` (also useful as a CI gate). */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');

const pkgVersion = pkg.version;
const swMatch = sw.match(/CACHE_VERSION\s*=\s*'inkflow-v([^']+)'/);
const htmlMatch = html.match(/index\.js\?v=([^"']+)/);

const refs = {
  'package.json': pkgVersion,
  'sw.js CACHE_VERSION': swMatch ? swMatch[1] : null,
  'index.html script cache-bust': htmlMatch ? htmlMatch[1] : null,
};

let ok = true;
for (const [source, version] of Object.entries(refs)) {
  if (!version) {
    console.error(`✗ ${source}: version reference not found (file structure changed?)`);
    ok = false;
  } else if (version !== pkgVersion) {
    console.error(`✗ ${source}: ${version} (expected ${pkgVersion})`);
    ok = false;
  } else {
    console.log(`✓ ${source}: ${version}`);
  }
}

if (!ok) {
  console.error(`\nVersion drift detected — set every reference to ${pkgVersion}.`);
  process.exit(1);
}
console.log(`\nAll version references agree on ${pkgVersion}.`);
