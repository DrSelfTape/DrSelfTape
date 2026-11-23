import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { mkdtemp, rm } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import path from 'node:path';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

// Render the real dashboard and exercise its real reducer without HTTP or DOM.
const dir = await mkdtemp(path.resolve('.admin-dashboard-test-'));
after(() => rm(dir, { recursive: true, force: true }));
const outfile = path.join(dir, 'harness.mjs');
await build({
  stdin: { contents: `export { default as Dashboard } from './src/panels/Admin/AdminDashboard.jsx';
    export { default as reducer, fetchAdminStats } from './src/redux/features/admin/adminSlice.js';`, resolveDir: process.cwd() },
  outfile, bundle: true, platform: 'node', format: 'esm', packages: 'external', jsx: 'automatic',
  plugins: [{ name: 'no-http', setup(builder) {
    builder.onResolve({ filter: /^\.\.\/\.\.\/(http|constant)$/ }, ({ path: name }) => ({ path: name, namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: name }) => ({
      contents: name.endsWith('http') ? 'export default {}' : 'export const baseURL = "https://fixture.invalid";',
    }));
  } }],
});
const { Dashboard, reducer, fetchAdminStats } = await import(pathToFileURL(outfile));
const initial = () => reducer(undefined, { type: 'init' });
const html = (state) => renderToStaticMarkup(React.createElement(Provider,
  { store: configureStore({ reducer: { admin: reducer }, preloadedState: { admin: state } }) },
  React.createElement(Dashboard)));
const fabricated = /1,247|1,083|48,920|>167<|12\.5%|8\.2%|15\.3%|9\.8%/;

test('missing response renders unavailable metrics and no fabricated chart or trends', () => {
  const output = html(initial());
  assert.equal((output.match(/>Unavailable</g) || []).length, 11);
  assert.match(output, /Signup data unavailable/);
  assert.doesNotMatch(output, fabricated);
  assert.doesNotMatch(output, /%/);
});

test('real zeros and zero trends survive while omitted fields remain unavailable', () => {
  const state = reducer(initial(), fetchAdminStats.fulfilled({ data: {
    total_users: 0, total_users_trend: 0, total_revenue: 0, revenue_trend: 0,
    new_signups: 0, signups_over_time: [],
  } }, 'request'));
  const output = html(state);
  assert.match(output, />0</);
  assert.match(output, /\$0</);
  assert.match(output, /\+0%/);
  assert.match(output, /No signup data for this period/);
  assert.match(output, />Unavailable</);
  assert.doesNotMatch(output, fabricated);
});

test('null fields do not become money or a sample signup history', () => {
  const output = html({ ...initial(), stats: { total_revenue: null, total_users: null, signups_over_time: null } });
  assert.match(output, /Signup data unavailable/);
  assert.doesNotMatch(output, /\$Unavailable|\$0|48,920/);
});

test('failed request clears prior statistics and shows a safe error; retry recovers', () => {
  let state = reducer(initial(), fetchAdminStats.fulfilled({ total_users: 42 }, 'first'));
  state = reducer(state, fetchAdminStats.pending('retry'));
  assert.doesNotMatch(html(state), />42<|Unavailable/);
  state = reducer(state, fetchAdminStats.rejected(new Error('private diagnostic'), 'retry'));
  assert.equal(state.stats, null);
  const output = html(state);
  assert.match(output, /role="alert"/);
  assert.match(output, /Dashboard data is unavailable/);
  assert.doesNotMatch(output, /private diagnostic|>42</);
  assert.doesNotMatch(output, fabricated);
  state = reducer(state, fetchAdminStats.pending('recover'));
  state = reducer(state, fetchAdminStats.fulfilled({ data: { total_users: 43, signups_over_time: [] } }, 'recover'));
  assert.match(html(state), />43</);
  assert.doesNotMatch(html(state), /role="alert"/);
});

test('unrelated admin errors do not label a successful stats response as failed', () => {
  const output = html({ ...initial(), stats: { total_users: 42 }, error: 'unrelated request' });
  assert.match(output, />42</);
  assert.doesNotMatch(output, /role="alert"/);
});
