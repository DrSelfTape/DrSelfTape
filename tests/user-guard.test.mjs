import assert from 'node:assert/strict';
import { test } from 'node:test';
import { guardUser, STALE_USER } from '../src/redux/features/jericho/userGuard.js';

const api = (ids) => {
  let i = 0;
  return { getState: () => ({ auth: { user: ids[Math.min(i++, ids.length - 1)] == null ? null : { id: ids[Math.min(i - 1, ids.length - 1)] } } }), rejectWithValue: (v) => ({ rejected: v }) };
};

test('a completion for the same user passes through untouched', async () => {
  const run = guardUser(async (arg) => `ok:${arg}`);
  assert.equal(await run('x', api([42, 42])), 'ok:x');
});

test('a completion after logout, or after another account signed in, becomes a silent stale rejection', async () => {
  const run = guardUser(async () => 'payload for A');
  assert.deepEqual(await run(null, api([42, null])), { rejected: STALE_USER });
  assert.deepEqual(await run(null, api([42, 99])), { rejected: STALE_USER });
  assert.equal(STALE_USER.stale, true);
  assert.equal(STALE_USER.silent, true);
});

test('a failure keeps its own error for the same user and is swallowed for a departed one', async () => {
  const boom = guardUser(async () => { throw new Error('network'); });
  await assert.rejects(() => boom(null, api([42, 42])), /network/);
  assert.deepEqual(await boom(null, api([42, null])), { rejected: STALE_USER });
});
