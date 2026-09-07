import assert from 'node:assert/strict';
import { test } from 'node:test';
import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadDesktopReview, setupReviewRender } from './desktop-review-harness.mjs';
import { mountComponent } from './recording-review-harness.mjs';

const current = await loadDesktopReview();
const render = (Component, props = {}) => renderToStaticMarkup(createElement(Component, props));
const result = { winner: 1, ranking: [1], takes: [{ take: 1, score: 80,
  analysis: { performance_dna: { emotional_range: 9 }, performance: { choices: 'PRIVATE' } } }] };

for (const entitlement of [{ loading: true, error: null }, { loading: false, error: null, balance: null }]) {
  test(`desktop Compare waits for entitlement (${JSON.stringify(entitlement)})`, () => {
    setupReviewRender({ compare: result });
    Object.assign(globalThis.__desktopEntitlement, entitlement);
    const html = render(current.CompareTakes);
    assert.ok(html.includes('80.0 / 100'));
    assert.ok(!html.includes('Emotional Range'));
  });
}

test('desktop report restores the actual device timeline and average', () => {
  setupReviewRender();
  const html = render(current.DesktopTapeReport, { review: { verdict: 'A thought' }, headlineScore: 8,
    scoreHistory: [{ t: 1, avg: 6 }, { t: 2, avg: 8 }] });
  for (const value of ['Your scores over time', '7.0', 'This device', '6.0', '8.0']) assert.ok(html.includes(value), value);
});

test('library playback reaches the report player without a local File', () => {
  setupReviewRender({ review: { verdict: 'At 0:12', headline_score: 8 } });
  globalThis.__desktopState.jericho.tapeReviewPlaybackUrl = 'https://media.example.test/owned.mp4';
  assert.ok(render(current.TapeReview).includes('src="https://media.example.test/owned.mp4"'));
});

test('desktop sharing accepts legacy tone tags and still blocks empty or busy reviews', () => {
  setupReviewRender();
  for (const [review, sharing, disabled] of [
    [{ tone_tags: ['Grounded'] }, false, false],
    [{ verdict: 'A thought' }, false, false],
    [{ tone_tags: [] }, false, true],
    [{}, false, true],
    [{ tone_tags: ['Grounded'] }, true, true],
  ]) {
    const html = render(current.DesktopTapeReport, { review, sharing, onShare: () => {} });
    const buttons = [...html.matchAll(/<button\b([^>]*)>(.*?)<\/button>/g)];
    assert.equal(buttons.length, 2);
    for (const [, attributes] of buttons) assert.equal(attributes.includes('disabled=""'), disabled);
  }
});

test('desktop styles cannot recolor console siblings and cap mounted motion', () => {
  for (const name of ['desktopReview', 'desktopCompare']) {
    const css = readFileSync(new URL(`../src/panels/Dashboard/Jericho/${name}.css`, import.meta.url), 'utf8');
    assert.ok(!css.includes('.console-paper'), name);
  }
  const css = readFileSync(new URL('../src/panels/Dashboard/Jericho/desktopReview.css', import.meta.url), 'utf8');
  assert.match(css, /\.noir-review[^{}]*\.tr-reveal[^{}]*\{[^}]*animation-duration:\s*300ms\s*!important/);
  assert.match(css, /\.noir-review[^{}]*tapeTutPop[^{}]*\{[^}]*animation-duration:\s*300ms\s*!important/);
});

test('shared review renderer has no desktop/store dependency', () => {
  const source = readFileSync(new URL('../src/panels/Dashboard/Jericho/TapeReviewNotes.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /import .*DesktopPerformanceDNA/);
});

test('report accepts an injected DNA renderer and retains bars without it', () => {
  setupReviewRender();
  const review = { performance_dna: { emotional_range: 8 } };
  const injected = render(current.DesktopTapeReport, { review,
    renderDna: values => createElement('p', null, `INJECTED DNA ${values.emotional_range}`) });
  assert.ok(injected.includes('INJECTED DNA 8'));
  const fallback = render(current.DesktopTapeReport, { review });
  assert.ok(fallback.includes('Performance DNA'));
  assert.ok(fallback.includes('Emotional Range'));
  const source = readFileSync(new URL('../src/panels/Dashboard/Jericho/DesktopTapeReport.jsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /import .*DesktopPerformanceDNA/);
});

test('fully revealed parity detects a mutation in the branch shared renderer', async () => {
  const baseline = await loadDesktopReview({ baseline: true, mutateSharedNotes: true });
  const mutated = await loadDesktopReview({ mutateSharedNotes: true });
  setupReviewRender({ mobile: true, review: { verdict: 'A thought', performance_dna: { emotional_range: 8 } } });
  const before = render(baseline.TapeReview);
  const after = render(mutated.TapeReview);
  assert.ok(before.includes('Performance DNA'));
  assert.ok(!before.includes('SHARED RENDERER REGRESSION'));
  assert.ok(after.includes('SHARED RENDERER REGRESSION'));
  assert.notEqual(after, before);
});

test('history detail uses only fetched notes in the desktop report after the job expired', async () => {
  setupReviewRender({ paid: false });
  window.addEventListener = () => {}; window.removeEventListener = () => {};
  globalThis.document = { activeElement: null };
  const requests = [];
  globalThis.__desktopGet = async url => {
    requests.push(url);
    return { data: { data: { id: 101, created_at: '2026-08-01T12:00:00Z', ai_feedback: {
      verdict: 'SERVER HEADLINE', headline_score: 7.2, adjustments: [{ note: 'Listen at 0:12' }],
    } } } };
  };
  const mounted = mountComponent(current.ReviewDetailSheet, { session: { id: 101, ai_feedback: { performance_dna: { cold_read: 9 }, verdict: 'CACHED SECRET' } } });
  try {
    assert.ok(renderToStaticMarkup(mounted.render()).includes('Loading your review'));
    mounted.flush();
    await new Promise(resolve => setImmediate(resolve));
    const html = renderToStaticMarkup(mounted.render());
    for (const text of ['Tape review report', 'SERVER HEADLINE', 'Generated', 'original video isn’t available']) assert.ok(html.includes(text), text);
    assert.ok(!html.includes('CACHED SECRET'));
    assert.ok(!html.includes('Performance DNA'));
    assert.deepEqual(requests, ['/v1/ai/session-log/101/']);
  } finally { mounted.unmount(); delete globalThis.__desktopGet; }
});
