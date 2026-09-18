import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadDesktopReview, setupReviewRender } from './desktop-review-harness.mjs';
import { reviewMoments, scoreValue, seekToMoment } from '../src/panels/Dashboard/Jericho/desktopReviewData.js';

const current = await loadDesktopReview();
const original = await loadDesktopReview({ baseline: true });
const full = { verdict: 'The thought arrives at 0:12.', headline_score: 7.4,
  whats_working: [{ title: 'Listen', detail: 'You hear the silence at 0:18.' }],
  performance: { emotional_arc: 'PAID CRAFT 0:24' }, adjustments: [{ note: 'PAID FIX at 0:32' }],
  the_one_thing: 'PAID ONE THING', scores: { framing: 8, lighting: 7 },
  performance_dna: { emotional_range: 7, cold_read: 0 }, tone_tags: ['Grounded'] };
const render = (Component, props = {}) => renderToStaticMarkup(createElement(Component, props));

test('desktop renders the complete real review as a report with only observed evidence', () => {
  setupReviewRender({ review: full });
  const html = render(current.TapeReview);
  for (const text of ['Tape review report', '4 timestamped notes', '2 tape scores', '2 DNA axes scored', 'PAID CRAFT', 'PAID FIX', 'PAID ONE THING', '7.4', 'Share to Story', 'Square post']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('14 timestamped'));
  assert.ok(!html.includes('Generated <time'), 'a generation date must not be invented');
  assert.ok(html.includes('Generation date unavailable'));
});

test('stripped free results do not regain scores, DNA, craft or cached evidence', () => {
  setupReviewRender({ paid: false, review: { verdict: 'FREE HEADLINE', headline_score: 6.2, whats_working: ['Top strength'], adjustments: [{ note: 'First fix' }], tone_tags: ['Grounded'] } });
  const html = render(current.TapeReview);
  for (const text of ['FREE HEADLINE', '6.2', 'Top strength', 'First fix', 'Your full casting read is ready']) assert.ok(html.includes(text), text);
  for (const text of ['PAID', 'nr-score-list', 'DNA axes scored', 'Tape scores</h3>']) assert.ok(!html.includes(text), text);
});

test('legacy free scores remain hidden even before the server score-strip flag flips', () => {
  setupReviewRender({ paid: false, review: { ...full, performance: undefined, performance_dna: undefined, adjustments: full.adjustments.slice(0, 1) } });
  const html = render(current.TapeReview);
  assert.ok(html.includes('7.4'));
  assert.ok(!html.includes('nr-score-list'));
  assert.ok(!html.includes('PAID CRAFT'));
});

test('timestamps are parsed from visible notes only, deduplicated and bounded by footage', () => {
  assert.deepEqual(reviewMoments({ verdict: '0:12 then 0:12 and 0:75', performance: { strongest_beat: '1:02' }, adjustments: [{ note: 'Past end 2:03' }] }, 90).map(m => [m.stamp, m.seconds]), [['0:12', 12], ['1:02', 62]]);
  assert.deepEqual(reviewMoments({ scores: { framing: '0:12' }, whats_working: null, adjustments: null }), []);
});

test('playhead jumps require loaded footage, preserve pause and reject unavailable moments', () => {
  const video = { duration: 90, currentTime: 0, paused: true };
  assert.equal(seekToMoment(video, 62), true);
  assert.equal(video.currentTime, 62);
  assert.equal(video.paused, true);
  for (const time of [-1, 91, Infinity]) assert.equal(seekToMoment(video, time), false);
  assert.equal(seekToMoment(null, 10), false);
  assert.equal(seekToMoment({ duration: NaN }, 10), false);
});

test('missing and malformed scores never become zero; real zero stays scored', () => {
  for (const value of [null, undefined, '', true, 'bad', -1, 11]) assert.equal(scoreValue(value), null);
  assert.equal(scoreValue(0), 0);
  assert.equal(scoreValue('7.5'), 7.5);
});

test('mobile studio summary omits unavailable scores and preserves a real zero', () => {
  for (const headline_score of [null, '', false, -1, 11]) {
    setupReviewRender({ mobile: true, review: { verdict: 'Notes without a score', headline_score } });
    assert.ok(!render(current.TapeReview).includes('class="studio-score"'));
  }
  setupReviewRender({ mobile: true, review: { verdict: 'A scored take', headline_score: 0 } });
  assert.ok(render(current.TapeReview).includes('Overall score 0.0 out of 10'));
});

for (const native of [false, true]) for (const mobile of [false, true]) {
  if (!native && !mobile) continue;
  for (const paid of [false, true]) test(`mobile result preserves review content and access gates (native=${native}, small=${mobile}, paid=${paid})`, () => {
    setupReviewRender({ native, mobile, paid, review: full });
    const before = render(original.TapeReview);
    if (paid) for (const label of ['PAID CRAFT', 'PAID FIX', 'PAID ONE THING', 'Performance DNA']) assert.ok(before.includes(label), `fully revealed baseline: ${label}`);
    setupReviewRender({ native, mobile, paid, review: full });
    const updated = render(current.TapeReview);
    for (const label of ['The thought arrives at 0:12.', 'You hear the silence at 0:18.', '7.4']) assert.ok(updated.includes(label), label);
    for (const label of ['PAID CRAFT', 'PAID ONE THING']) assert.equal(updated.includes(label), paid, label);
    assert.equal(updated.includes('Performance DNA'), before.includes('Performance DNA'), 'preserve the upgrade teaser without exposing private notes');
    assert.ok(updated.includes('PAID FIX'), 'the first adjustment remains available to free actors');
    assert.ok(updated.includes('studio-score'), 'compact score replaces the animated gauge');
  });
}
