import assert from 'node:assert/strict';
import { test } from 'node:test';
import { build } from 'esbuild';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const result = await build({
  stdin: { contents: "export { getFirstRouteByRole } from './src/routes/routeHelpers.jsx';", resolveDir: root },
  bundle: true, write: false, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic',
});
const mod = { exports: {} };
new Function('require', 'module', 'exports', result.outputFiles[0].text)(require, mod, mod.exports);
const { getFirstRouteByRole } = mod.exports;

test('every real role lands inside the app; only a missing role goes to /login', () => {
  assert.equal(getFirstRouteByRole('actor'), '/dashboard');
  assert.equal(getFirstRouteByRole('casting_director'), '/dashboard');
  assert.equal(getFirstRouteByRole('coach'), '/collaboration');
  assert.equal(getFirstRouteByRole('admin'), '/admin/dashboard');
  assert.equal(getFirstRouteByRole('agent'), '/dashboard', 'the retired side-menu config sent unknown real roles to the actor menu');
  assert.equal(getFirstRouteByRole(''), '/login');
  assert.equal(getFirstRouteByRole(undefined), '/login');
  assert.equal(getFirstRouteByRole(7), '/login');
});
