import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadResults } from './first-review-sample-harness.mjs';

const { TapeReviewNotes, SampleReview, sampleReview } = await loadResults();
const render = (review, props = {}) => renderToStaticMarkup(createElement(TapeReviewNotes, { review, ...props }));

test('the fictional fixture renders through the live notes component', () => {
  const html = render(sampleReview);
  for (const content of ['Quick read', 'What&#x27;s working', 'The one thing', 'Performance DNA', 'Guarded hope', 'Coax a return call']) {
    assert.ok(html.includes(content), content);
  }
  assert.ok(!html.includes('Cold Read'), 'unsupported dimensions must stay omitted');
  assert.ok(!html.includes('<button'), 'notes are read-only');
});

test('live reveal stages keep their existing order and the mission slot', () => {
  const stage0 = render(sampleReview, { revealStage: 0 });
  const stage1 = render(sampleReview, { revealStage: 1 });
  const stage2 = render(sampleReview, { revealStage: 2 });
  const full = render(sampleReview, { afterNotes: createElement('p', null, 'MISSION_SLOT') });
  assert.ok(stage0.includes('Quick read'));
  assert.ok(!stage0.includes('What&#x27;s working'));
  assert.ok(stage1.includes('What&#x27;s working'));
  assert.ok(!stage1.includes('The one thing'));
  assert.ok(stage2.includes('The one thing'));
  assert.ok(!stage2.includes('Performance DNA'));
  assert.ok(full.indexOf('The one thing') < full.indexOf('MISSION_SLOT'));
  assert.ok(full.indexOf('MISSION_SLOT') < full.indexOf('Performance DNA'));
});

test('a server-trimmed result never gains deep fields from the sample', () => {
  render(sampleReview); // Visiting a full example must not seed user results.
  const html = render({ verdict: 'Free headline', whats_working: ['One strength'], adjustments: [{ note: 'First fix' }], tone_tags: ['Grounded'], headline_score: 7 });
  for (const content of ['Free headline', 'One strength', 'First fix', 'Grounded']) assert.ok(html.includes(content));
  for (const content of ['Performance DNA', 'Performance read', 'Tape scores', 'Alex', 'Coax a return call']) assert.ok(!html.includes(content));
});

test('full live notes retain performance fields and score bars', () => {
  const html = render({ ...sampleReview, performance: { emotional_arc: 'CRAFT_EVIDENCE' }, scores: { framing: 8, eyeline: 7, lighting: 8, energy_commitment: 7, dynamic_range: 6 } });
  for (const content of ['Performance read', 'CRAFT_EVIDENCE', 'Tape scores', 'Framing', 'Casting-ready', 'width:80%']) assert.ok(html.includes(content), content);
});

test('empty and partial payloads remain safe without invented DNA scores', () => {
  assert.equal(render({}), '');
  const html = render({ performance_dna: { dramatic_depth: 0 }, tone_tags: null, whats_working: null, adjustments: null });
  assert.ok(html.includes('Dramatic Depth'));
  assert.ok(html.includes('width:0%'));
  assert.ok(!html.includes('Cold Read'));
});

test('sample labels fiction and paid detail honestly, greets the viewer, and ends on both CTAs', () => {
  const html = renderToStaticMarkup(createElement(SampleReview, { firstName: ' Joseph ', onClose() {}, onTry() {} }));
  for (const content of ['Joseph, here’s how a review reads.', 'fictional actor', 'illustrative examples', 'require a plan', 'Record the practice scene', 'Upload my own tape']) assert.ok(html.includes(content), content);
  assert.ok(html.indexOf('Performance DNA</h3>') < html.indexOf('Record the practice scene'));
  assert.ok(!html.includes('The verdict on your take'));
  const unnamed = renderToStaticMarkup(createElement(SampleReview, { firstName: ' ', onClose() {}, onTry() {} }));
  assert.ok(unnamed.includes('Here’s how a review reads.'));
});
