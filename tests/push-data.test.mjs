import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const result = await build({
  stdin: { contents: "export { pushData } from './src/utils/pushData.js';", resolveDir: root },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external',
});
const mod = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, mod, mod.exports);
const { pushData } = mod.exports;

test('APNs shape: the BE data block sits under notification.data.data', () => {
  const notif = { title: 'Audition Update', data: { aps: { alert: {} }, data: { type: 'audition_update', audition_id: 7 } } };
  assert.equal(pushData(notif).type, 'audition_update');
  assert.equal(pushData(notif).audition_id, 7);
});

test('FCM / flat shape and the wrapped-notification shape still read', () => {
  assert.equal(pushData({ data: { type: 'new_message', match_id: 3 } }).match_id, 3);
  assert.equal(pushData({ notification: { data: { type: 'x' } } }).type, 'x');
  assert.deepEqual(pushData(null), {});
  assert.deepEqual(pushData({ data: { data: 'not-an-object', type: 'y' } }), { data: 'not-an-object', type: 'y' });
});
