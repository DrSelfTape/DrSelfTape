import assert from 'node:assert/strict';
import { test } from 'node:test';
import { renderToStaticMarkup } from 'react-dom/server';
import { loadDesktopReview, setupReviewRender } from './desktop-dna-harness.mjs';
import { mountComponent } from './recording-review-harness.mjs';

const { DesktopPerformanceDNA } = await loadDesktopReview();
function find(tree, label) {
  if (!tree || typeof tree !== 'object') return null;
  if (tree.type === 'button' && tree.props.children === label) return tree;
  for (const child of [tree.props?.children].flat(Infinity)) { const match = find(child, label); if (match) return match; }
  return null;
}

test('DNA table, overlay controls and retry use real component state without inventing missing cells', async () => {
  setupReviewRender(); let attempts = 0;
  const mounted = mountComponent(DesktopPerformanceDNA, { dna: { emotional_range: 8 }, loadHistory: async () => {
    if (++attempts === 1) throw new Error('offline');
    return { average: { emotional_range: 6 }, counts: { emotional_range: 2 }, count: 2 };
  } });
  let tree = mounted.render(); mounted.flush();
  find(tree, 'Table view').props.onClick(); tree = mounted.render();
  assert.ok(renderToStaticMarkup(tree).includes('Not scored'));
  await find(tree, '30-day average').props.onClick(); tree = mounted.render();
  assert.ok(renderToStaticMarkup(tree).includes('offline'));
  await find(tree, '30-day average').props.onClick(); tree = mounted.render();
  assert.equal(find(tree, '30-day average').props['aria-pressed'], true);
  assert.ok(renderToStaticMarkup(tree).includes('6.0'));
  find(tree, 'This tape').props.onClick(); tree = mounted.render();
  assert.ok(!renderToStaticMarkup(tree).includes('8.0'));
  assert.ok(renderToStaticMarkup(tree).includes('6.0'));
  await find(tree, '30-day average').props.onClick(); tree = mounted.render();
  assert.equal(attempts, 2);
  assert.equal(find(tree, '30-day average').props['aria-pressed'], false);
  assert.equal(find(tree, 'House-look ideal'), null);
  mounted.unmount();
});

test('unmount aborts a pending DNA history request', async () => {
  setupReviewRender(); let signal, resolve;
  const mounted = mountComponent(DesktopPerformanceDNA, { dna: { emotional_range: 8 }, loadHistory: options => {
    signal = options.signal; return new Promise(done => { resolve = done; });
  } });
  const tree = mounted.render(); mounted.flush();
  const promise = find(tree, '30-day average').props.onClick();
  mounted.unmount(); assert.equal(signal.aborted, true);
  resolve({ average: {}, counts: {}, count: 0 }); await promise;
});
