import { test } from 'node:test';
import assert from 'node:assert/strict';
import { versionGt, snoozed, takeBannerAttribution } from '../src/utils/bannerState.js';
test('only known valid installed versions produce update prompts', () => {
  assert.equal(versionGt('1.0.27', '1.0.9'), true);
  for (const installed of [undefined, null, '', 'broken', '1.0.27', '1.0.28']) assert.equal(versionGt('1.0.27', installed), false);
  assert.equal(versionGt('1.0.bad', '1.0.1'), false);
});
test('reminders expire and do not suppress a newer release', () => {
  const value = { version: '1.0.27', until: 100 };
  assert.equal(snoozed(value, '1.0.27', 99), true);
  assert.equal(snoozed(value, '1.0.27', 100), false);
  assert.equal(snoozed(value, '1.0.28', 99), false);
  assert.equal(snoozed('1.0.27', '1.0.27', 99), false);
});
test('completion attribution is scoped to account, time and action and consumed once', () => {
  let value = JSON.stringify({ id: 7, destination: 'tape-review', userId: 4, at: 100 });
  const storage = { getItem: () => value, removeItem: () => { value = null; } };
  assert.deepEqual(takeBannerAttribution('tape_review_completed', 5, storage, 101), {});
  assert.deepEqual(takeBannerAttribution('tape_review_completed', 4, storage, 2000000), {});
  assert.deepEqual(takeBannerAttribution('tape_review_completed', 4, storage, 101), { announcement_id: 7, entry_point: 'announcement_banner' });
  assert.deepEqual(takeBannerAttribution('tape_review_completed', 4, storage, 102), {});
});
