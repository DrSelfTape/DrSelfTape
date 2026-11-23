import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { bundleHasKey, checkNativeKey } from '../scripts/check-native-keys.mjs';

function dist(t, files) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'dst-native-keys-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  for (const [rel, body] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), body);
  }
  return root;
}

// Built bundles always carry the prefix table from purchases.js; that alone is not a key.
const PREFIX_TABLE = 'const K={ios:"appl_",android:"goog_"};';

test('a bundle with each store key passes for that store only', t => {
  const root = dist(t, { 'assets/index-abc.js': PREFIX_TABLE + 'const a="appl_FakeTestKey1234";' });
  assert.equal(bundleHasKey('ios', root), true);
  assert.equal(bundleHasKey('android', root), false);
  assert.doesNotThrow(() => checkNativeKey('ios', root));
  assert.throws(() => checkNativeKey('android', root), /VITE_REVENUECAT_ANDROID_KEY/);
});

test('the key may sit in a lazily loaded chunk', t => {
  const root = dist(t, { 'assets/index.js': PREFIX_TABLE, 'assets/chunks/purchases-x.js': 'x="goog_FakeTestKey1234"' });
  assert.doesNotThrow(() => checkNativeKey('android', root));
});

test('the prefix table, a too-short value, or a missing dist is not a key', t => {
  const root = dist(t, { 'assets/index.js': PREFIX_TABLE + 'y="goog_abc"', 'notes.txt': 'goog_FakeTestKey1234' });
  assert.equal(bundleHasKey('android', root), false);
  assert.equal(bundleHasKey('android', path.join(root, 'missing')), false);
  assert.throws(() => checkNativeKey('nope', root), /Unknown platform/);
});

test('the CLI exits non-zero without printing the key', t => {
  const good = dist(t, { 'a.js': 'k="goog_FakeTestKey1234"' });
  const out = execFileSync(process.execPath, ['scripts/check-native-keys.mjs', 'android', good], { encoding: 'utf8' });
  assert.match(out, /present/);
  assert.doesNotMatch(out, /FakeTestKey/);
  const bad = dist(t, { 'a.js': PREFIX_TABLE });
  assert.throws(
    () => execFileSync(process.execPath, ['scripts/check-native-keys.mjs', 'android', bad], { stdio: 'pipe' }),
    error => error.status === 1 && /VITE_REVENUECAT_ANDROID_KEY/.test(String(error.stderr)),
  );
});
