/**
 * Guards `scripts/strip-native-cruft.mjs`.
 *
 * That script deletes files out of the native app bundle after `cap sync`.
 * Its own failure mode is the dangerous kind: a wrong entry in WEB_ONLY
 * removes something the app needs, and the symptom is a blank screen in a
 * SHIPPED build, not a build error. So the list itself is what gets tested —
 * every entry must be a file the web serves and the app never references.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.resolve(import.meta.dirname, '..');
const SCRIPT = path.join(ROOT, 'scripts/strip-native-cruft.mjs');

// Parse the list out of the source rather than importing it: the module runs
// its strip on import, which would delete from a real bundle during tests.
function webOnlyList() {
  const src = fs.readFileSync(SCRIPT, 'utf8');
  const m = src.match(/const WEB_ONLY = \[([^\]]*)\]/);
  assert.ok(m, 'WEB_ONLY array not found — did the script get renamed?');
  return [...m[1].matchAll(/['"]([^'"]+)['"]/g)].map((x) => x[1]);
}

function grepCount(dir, needle) {
  if (!fs.existsSync(path.join(ROOT, dir))) return 0;
  let hits = 0;
  const walk = (d) => {
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isDirectory()) {
        if (e.name === 'node_modules') continue;
        walk(p);
      } else if (/\.(jsx?|mjs|tsx?|css|html)$/.test(e.name)) {
        if (fs.readFileSync(p, 'utf8').includes(needle)) hits += 1;
      }
    }
  };
  walk(path.join(ROOT, dir));
  return hits;
}

test('every WEB_ONLY entry exists in public/, so the strip is not a no-op typo', () => {
  for (const rel of webOnlyList()) {
    assert.ok(
      fs.existsSync(path.join(ROOT, 'public', rel)),
      `WEB_ONLY lists "${rel}" but public/${rel} does not exist. A typo here ` +
        'strips nothing and the zip keeps shipping to iOS, silently.',
    );
  }
});

test('no WEB_ONLY entry is referenced from src/ — the app must never need one', () => {
  for (const rel of webOnlyList()) {
    assert.equal(
      grepCount('src', rel),
      0,
      `WEB_ONLY lists "${rel}" but src/ references it. Stripping it would ` +
        'break the app in a shipped build with no build-time error.',
    );
  }
});

test('each WEB_ONLY entry IS served by the web build, which is why it stays in dist', () => {
  for (const rel of webOnlyList()) {
    assert.ok(
      grepCount('public', rel) > 0,
      `WEB_ONLY lists "${rel}" but nothing in public/ links it. If the web ` +
        'does not serve it either, delete the file instead of stripping it.',
    );
  }
});

test('the script fails loudly when cap sync has not run', () => {
  // Run it from a scratch cwd with no native roots: silently doing nothing is
  // the bug this guards, because it would let a zip ride into a real build.
  const tmp = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'dst-cruft-'));
  try {
    assert.throws(
      () => execFileSync(process.execPath, [SCRIPT], { cwd: tmp, stdio: 'pipe' }),
      /./,
      'expected a non-zero exit when no native web root exists',
    );
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
});
