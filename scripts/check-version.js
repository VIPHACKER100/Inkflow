#!/usr/bin/env node
/**
 * Fails if sw.js CACHE_NAME drifts from the package.json version.
 * Run via `npm run check:version`; also enforced in CI (.github/workflows/ci.yml).
 */
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const sw = fs.readFileSync(path.join(root, 'sw.js'), 'utf8');

const match = sw.match(/CACHE_NAME\s*=\s*['"]inkflow-v([^'"]+)['"]/);
if (!match) {
  console.error('✖ scripts/check-version.js: could not find CACHE_NAME in sw.js');
  process.exit(1);
}
if (match[1] !== pkg.version) {
  console.error(`✖ Version drift: package.json is ${pkg.version}, sw.js CACHE_NAME is inkflow-v${match[1]}.`);
  console.error('   Bump CACHE_NAME in sw.js together with package.json.');
  process.exit(1);
}
console.log(`✓ sw.js CACHE_NAME matches package.json (v${pkg.version})`);
