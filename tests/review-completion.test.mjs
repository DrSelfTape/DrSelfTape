import assert from 'node:assert/strict';
import { test } from 'node:test';
import { claimReviewCompletion, reviewCompletionId } from '../src/utils/reviewCompletion.js';

test('same server review stays the same receipt across request retries and job recovery', () => {
  const result = { _session_id: 17, job_id: 'job' };
  assert.equal(reviewCompletionId(result, { requestId: 'first' }), 'session:17');
  assert.equal(reviewCompletionId(result, { requestId: 'retry' }), 'session:17');
  assert.equal(reviewCompletionId({}, { arg: { jobId: 'resumed' } }), 'job:resumed');
  assert.equal(reviewCompletionId({}, { arg: { idempotencyKey: 'same' }, requestId: 'retry' }), 'attempt:same');
  assert.equal(reviewCompletionId({}), null);
});

test('completion is once per account and review, including memory fallback', () => {
  const saved = new Map();
  globalThis.localStorage = { getItem: k => saved.get(k), setItem: (k,v) => saved.set(k,v) };
  assert.equal(claimReviewCompletion('actorA', 'session:1'), true);
  assert.equal(claimReviewCompletion('actorA', 'session:1'), false);
  assert.equal(claimReviewCompletion('actorA', 'session:2'), true);
  assert.equal(claimReviewCompletion('actorB', 'session:1'), true);
  saved.set('dst_review_completed:v2:actorA:session:3', '1');
  assert.equal(claimReviewCompletion('actorA', 'session:3'), false);
  assert.equal(claimReviewCompletion('actorA', null), false);
  globalThis.localStorage = { getItem: () => { throw Error('blocked'); } };
  assert.equal(claimReviewCompletion('private', 'session:1'), true);
  assert.equal(claimReviewCompletion('private', 'session:1'), false);
});
