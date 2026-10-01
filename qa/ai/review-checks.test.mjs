import { test } from 'node:test';
import assert from 'node:assert/strict';
import { sampleReview } from '../../src/data/sampleReview.js';
import { checkReview } from './review-checks.mjs';
import ReviewReplayProvider from './replay-provider.mjs';

const context = { hasHistory: false, durationSeconds: 30, unsupportedDimensions: ['cold_read'] };
test('approved editorial fixture passes deterministic checks', () => assert.equal(checkReview(sampleReview, context).pass, true));
const bad = [
  ['invalid-json', () => '{'],
  ['missing-verdict', r => ({ ...r, verdict: '' })],
  ['missing-strength', r => ({ ...r, whats_working: [] })],
  ['missing-actionable-adjustment', r => ({ ...r, adjustments: [{ note: 'Be better' }] })],
  ['missing-next-take-focus', r => ({ ...r, the_one_thing: '' })],
  ['unsupported-history', r => ({ ...r, verdict: 'Your previous tapes show the same issue.' })],
  ['booking-guarantee', r => ({ ...r, verdict: 'You will definitely book this role.' })],
  ['internal-jargon', r => ({ ...r, verdict: 'Frame 3 shows the dissociation test.' })],
  ['invalid-timestamp', r => ({ ...r, verdict: 'Around 0:62, the listening changes.' })],
  ['invalid-timestamp', r => ({ ...r, verdict: 'Around 1:05, the listening changes.' })],
  ['invalid-score', r => ({ ...r, scores: { framing: 11 } })],
  ['invalid-score', r => ({ ...r, scores: { framing: '8' } })],
  ['unsupported-dimension:cold_read', r => ({ ...r, performance_dna: { cold_read: 7 } })],
];
for (const [reason, mutate] of bad) test('rejects ' + reason + ' ' + bad.indexOf(bad.find(x => x[1] === mutate)), () => {
  const result = checkReview(mutate(structuredClone(sampleReview)), context);
  assert.equal(result.pass, false); assert.ok(result.reason.includes(reason), result.reason);
});
test('valid available history is not treated as fabricated', () => assert.equal(checkReview({ ...sampleReview, verdict: 'Your previous tapes also explored this scene.' }, { ...context, hasHistory: true }).pass, true));
test('free headline is not required to contain paid full-performance fields', () => {
  const r = { ...sampleReview }; delete r.the_one_thing;
  assert.equal(checkReview(r, { ...context, mode: 'headline' }).pass, true);
  assert.equal(checkReview(r, { ...context, mode: 'full' }).pass, false);
});
test('provider does not silently replace a missing real case with the sample', async () => {
  if (process.env.DST_REVIEW_EVAL_INPUT) return;
  assert.ok((await new ReviewReplayProvider().callApi('', { vars: { caseId: 'missing-case' } })).error);
});
