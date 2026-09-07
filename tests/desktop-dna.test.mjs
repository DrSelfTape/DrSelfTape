import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { DNA_KEYS, dnaPoints, loadDnaHistory } from '../src/panels/Dashboard/Jericho/dnaReviewHistory.js';
import { loadDesktopReview, setupReviewRender } from './desktop-dna-harness.mjs';

const now = Date.parse('2026-09-06T12:00:00Z');
const row = (id, date = '2026-09-01T12:00:00Z', type = 'self_tape_review') => ({ id, created_at: date, session_type: type });
const detail = (id, dna) => ({ ...row(id), ai_feedback: { performance_dna: dna } });
const response = data => ({ data: { data, success: true } });

test('30-day average reads fresh gated details and averages each scored axis independently', async () => {
  const requests = [];
  const details = [detail(1, { emotional_range: 9, cold_read: 0 }), detail(2, { emotional_range: 3 }), detail(3, { emotional_range: 6, cold_read: 8 })];
  const get = async (path, options) => {
    requests.push({ path, options });
    return response(path.endsWith('/session-log/') ? [row(1), row(2), row(3), row(4, '2026-06-01'), row(5, undefined, 'live_scene'), row(6, '2026-09-07')]
      : details.find(d => path.endsWith(`/${d.id}/`)));
  };
  const result = await loadDnaHistory(get, { now });
  assert.deepEqual(result.average, { emotional_range: 6, cold_read: 4 });
  assert.equal(result.counts.emotional_range, 3);
  assert.equal(result.counts.cold_read, 2);
  assert.equal(result.counts.comedy_timing, 0);
  assert.equal(result.count, 3);
  assert.deepEqual(requests.map(r => r.path), ['/v1/ai/session-log/', '/v1/ai/session-log/1/', '/v1/ai/session-log/2/', '/v1/ai/session-log/3/']);
  assert.deepEqual(requests[0].options.params, { limit: 50 });
});

test('free trimmed history never reconstructs DNA from overall or legacy technical scores', async () => {
  const result = await loadDnaHistory(async path => response(path.endsWith('/session-log/') ? [row(1)] : { ...row(1), ai_feedback: { headline_score: 8, scores: { framing: 10 }, verdict: 'Headline' } }), { now });
  assert.deepEqual(result.average, {});
  assert.equal(result.counts.emotional_range, 0);
});

test('incomplete capped history, failed detail and wrong detail identity never produce biased averages', async () => {
  await assert.rejects(loadDnaHistory(async () => response(Array.from({ length: 50 }, (_, i) => row(i + 1))), { now }), /archive window/);
  await assert.rejects(loadDnaHistory(async path => { if (path.endsWith('/session-log/')) return response([row(1)]); throw new Error('offline'); }, { now }), /offline/);
  await assert.rejects(loadDnaHistory(async path => response(path.endsWith('/session-log/') ? [row(1)] : detail(99, { cold_read: 9 })), { now }), /could not be loaded/);
  await assert.rejects(loadDnaHistory(async () => ({ data: { success: false } }), { now }), /could not be loaded/);
});

test('history fetch deduplicates sessions, skips old sessions and propagates cancellation', async () => {
  let details = 0;
  const controller = new AbortController();
  const result = await loadDnaHistory(async (path, options) => {
    assert.equal(options.signal, controller.signal);
    if (path.endsWith('/session-log/')) return response([row(1), row(1)]);
    details++;
    return response(detail(1, { cold_read: 0 }));
  }, { now, signal: controller.signal });
  assert.equal(details, 1);
  assert.equal(result.average.cold_read, 0);
  controller.abort();
  await assert.rejects(loadDnaHistory(async () => response([row(1)]), { now, signal: controller.signal }), /cancelled/);
});

test('hexagon has six axes, preserves real zero and leaves missing dimensions open', () => {
  const points = dnaPoints({ cold_read: 0, emotional_range: 10 });
  assert.equal(points.length, 6);
  assert.equal(points[0].y, 64);
  assert.deepEqual([points[1].x, points[1].y, points[1].value], [190, 158, 0]);
  assert.equal(points[2].value, null);
});

const current = await loadDesktopReview();
test('real DNA renderer labels all vertices without an invented ideal control', () => {
  const html = renderToStaticMarkup(createElement(current.DesktopPerformanceDNA, { dna: { emotional_range: 8, cold_read: 0 }, firstName: 'Alex' }));
  for (const text of ['Performance DNA', '8.0', '0.0', 'not scored', 'Table view']) assert.ok(html.includes(text), text);
  assert.ok(!html.includes('House-look ideal'));
  assert.ok(!html.includes('class="nd-current"><polygon'), 'a sparse take must not become a filled six-score shape');
  const full = renderToStaticMarkup(createElement(current.DesktopPerformanceDNA, { dna: Object.fromEntries(DNA_KEYS.map(key => [key, 8])) }));
  assert.ok(full.includes('class="nd-current"><polygon'));
});

const original = await loadDesktopReview({ baseline: true });
for (const [native, mobile] of [[false, true], [true, true], [true, false]]) test(`mobile DNA overview is byte-identical to main (native=${native}, small=${mobile})`, () => {
  setupReviewRender({ native, mobile });
  const before = renderToStaticMarkup(createElement(original.JerichoDashboard));
  setupReviewRender({ native, mobile });
  assert.equal(renderToStaticMarkup(createElement(current.JerichoDashboard)), before);
});
