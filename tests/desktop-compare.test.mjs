import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { matrixRows, matrixTakes, nextMatrixTab, scrubTake } from '../src/panels/Dashboard/Jericho/compareMatrixData.js';
import { loadDesktopReview, setupReviewRender } from './desktop-compare-harness.mjs';
import { mountComponent } from './recording-review-harness.mjs';

const result = { winner: 2, ranking: [2, 1], headline: 'Take 2 listens before answering.', why_winner: 'The other person changes you.', what_to_do: 'Keep the thought before the line.', takes: [
  { take: 1, score: 68, one_line: 'The plan is visible.', best_moment: '0:12 The pause.', analysis: { scores: { framing: 6, eyeline: 7 }, performance_dna: { emotional_range: 5 }, performance: { listening_presence: 'PAID LISTENING ONE' } } },
  { take: 2, score: 86, one_line: 'A thought arrives.', steal: 'The stillness.', analysis: { scores: { framing: 8, eyeline: 9 }, performance_dna: { emotional_range: 8, cold_read: 0 }, performance: { listening_presence: 'PAID LISTENING TWO' }, stayed_in_frame: false, shot_size: 'MCU' } },
] };
const current = await loadDesktopReview();
const original = await loadDesktopReview({ baseline: true });
const render = (Component, props = {}) => renderToStaticMarkup(createElement(Component, props));

function find(tree, predicate) {
  if (!tree || typeof tree !== 'object') return null;
  if (predicate(tree)) return tree;
  const children = [tree.props?.children].flat(Infinity);
  for (const child of children) { const match = find(child, predicate); if (match) return match; }
  return null;
}
const button = (tree, label) => find(tree, node => node.type === 'button' && node.props.children === label);

test('real comparison becomes columns in ranked order with one winner and a sticky criterion column', () => {
  setupReviewRender({ compare: result });
  const html = render(current.CompareTakes);
  for (const text of ['Compare takes matrix', 'nc-criterion', 'nc-winner', '86.0 / 100', '68.0 / 100', 'Emotional Range', '0.0 / 10']) assert.ok(html.includes(text), text);
  assert.ok(html.indexOf('Take 2<span>Winner') < html.indexOf('Take 1</div>'));
  assert.equal((html.match(/<span>Winner<\/span>/g) || []).length, 1);
});

test('all three tabs and reset work through the real matrix component', () => {
  setupReviewRender(); let resets = 0;
  const mounted = mountComponent(current.DesktopCompareMatrix, { result, locked: false, onReset: () => resets++ });
  let tree = mounted.render();
  button(tree, 'Notes').props.onClick(); tree = mounted.render();
  assert.ok(renderToStaticMarkup(tree).includes('PAID LISTENING TWO'));
  button(tree, 'Technicals').props.onClick(); tree = mounted.render();
  const tech = renderToStaticMarkup(tree);
  for (const text of ['Framing', 'Eyeline', 'MCU', '>No<', '8.0 / 10']) assert.ok(tech.includes(text), text);
  button(tree, 'Compare another set').props.onClick();
  assert.equal(resets, 1);
  mounted.unmount();
});

test('free comparisons preserve the ranking and highlights while deep notes stay absent on every tab', () => {
  const takes = matrixTakes(result, true);
  assert.deepEqual(takes.map(t => t.analysis), [{}, {}]);
  assert.equal(matrixRows(takes, 'scores').length, 1);
  assert.equal(matrixRows(takes, 'technicals').length, 0);
  assert.ok(matrixRows(takes, 'notes').some(row => row.values.includes('A thought arrives.')));
  for (const tab of ['scores', 'notes', 'technicals']) assert.ok(!JSON.stringify(matrixRows(takes, tab)).includes('PAID'));
  setupReviewRender({ compare: result, paid: false });
  const html = render(current.CompareTakes);
  assert.ok(html.includes('86.0 / 100'));
  assert.ok(html.includes('See plans'));
  assert.ok(!html.includes('Emotional Range'));
});

for (const status of ['duplicate', 'single']) test(`${status} comparisons never crown or tint a winner`, () => {
  const r = { ...result, comparison_status: status, headline: 'The same performance.' };
  assert.equal(matrixTakes(r, false).some(t => t.winner), false);
  setupReviewRender({ compare: r });
  const html = render(current.CompareTakes);
  assert.ok(html.includes('SAME TAKE'));
  assert.ok(!html.includes('nc-winner'));
  assert.ok(!html.includes('<span>Winner</span>'));
});

test('partial or server-trimmed analysis does not create zero scores or hidden notes', () => {
  const takes = matrixTakes({ ranking: ['2', 2, 1, 99], winner: '2', takes: [{ take: 1, score: null }, { take: 2, score: 0 }] }, false);
  assert.equal(takes.length, 2);
  assert.equal(takes[0].winner, true);
  assert.deepEqual(matrixRows(takes, 'scores')[0].values, ['0.0 / 100', null]);
  assert.deepEqual(matrixRows(takes, 'technicals'), []);
});

test('keyboard tab navigation wraps and handles Home and End', () => {
  assert.equal(nextMatrixTab('scores', 'ArrowLeft'), 'technicals');
  assert.equal(nextMatrixTab('technicals', 'ArrowRight'), 'scores');
  assert.equal(nextMatrixTab('notes', 'Home'), 'scores');
  assert.equal(nextMatrixTab('notes', 'End'), 'technicals');
  assert.equal(nextMatrixTab('notes', 'Enter'), null);
});

test('hover scrub is bounded and never runs on touch, playing video or reduced motion', () => {
  const video = { duration: 60, currentTime: 0, paused: true };
  const pointer = { clientX: 60, left: 10, width: 100 };
  assert.equal(scrubTake(video, pointer), true);
  assert.ok(Math.abs(video.currentTime - 29.975) < .001);
  for (const extra of [{ reducedMotion: true }, { pointerType: 'touch' }, { width: 0 }]) assert.equal(scrubTake(video, { ...pointer, ...extra }), false);
  assert.equal(scrubTake({ ...video, paused: false }, pointer), false);
  assert.equal(scrubTake(null, pointer), false);
});

// The design-token pass swapped literal colours and fonts for tokens, so the
// frozen baseline can no longer match byte for byte. Mask ONLY those values: a
// colour inside a text-/bg-/border- utility, and paint declarations in inline
// style. Every other class and every layout style must still match exactly.
const COLOR_VALUE = String.raw`\[(?:#[0-9a-fA-F]{3,8}|rgba?\([^\]]*\)|var\(--dst-[\w-]+\))\]|white|black`;
const COLOR_UTILITY = new RegExp(String.raw`(^|[\s:])(text|bg|border)-(?:${COLOR_VALUE})(?=[\s/]|$)`, 'g');
const PAINT_PROPERTY = /^(?:color|background|background-color|border-color|font-family)$/;
const normalisePresentation = html => html
  .replace(/ class="([^"]*)"/g, (_, value) => ` class="${value.replace(COLOR_UTILITY, '$1$2-COLOR')}"`)
  .replace(/ style="([^"]*)"/g, (_, value) => {
    // Split on declaration ends, not on the ';' that closes an HTML entity.
    const kept = value.split(/(?<!&#?\w+);/).filter(d => d && !PAINT_PROPERTY.test(d.slice(0, d.indexOf(':')).trim()));
    return kept.length ? ` style="${kept.join(';')}"` : '';
  });

test('the baseline comparison masks colour values only, never structure', () => {
  const same = (a, b) => assert.equal(normalisePresentation(a), normalisePresentation(b));
  const differ = (a, b) => assert.notEqual(normalisePresentation(a), normalisePresentation(b));
  same('<p class="text-sm text-[#0A0A0A] mb-1">', '<p class="text-sm text-[var(--dst-ink)] mb-1">');
  same('<p class="bg-white hover:text-[rgba(10,10,10,0.6)]">', '<p class="bg-[var(--dst-surface)] hover:text-[var(--dst-ink-2)]">');
  same('<p style="width:86%;background:linear-gradient(90deg, #D4A85F, #7A5A18)">', '<p style="width:86%;background:var(--dst-brass-ui)">');
  same('<p style="font-family:&#x27;Playfair Display&#x27;, serif">', '<p style="font-family:var(--dst-font-serif)">');
  differ('<p class="flex text-[#0A0A0A]">', '<p class="grid text-[#0A0A0A]">');
  differ('<p class="text-sm text-[#0A0A0A]">', '<p class="text-xl text-[#0A0A0A]">');
  differ('<p class="text-[11px]">', '<p class="text-[12px]">');
  differ('<p class="bg-[#D4A85F]/15">', '<p class="bg-[#D4A85F]/20">');
  differ('<p class="mb-1">', '<p>');
  differ('<p style="width:86%;color:red">', '<p style="width:68%;color:red">');
  differ('<p style="display:none">', '<p>');
});
for (const [native, mobile] of [[false, true], [true, true], [true, false]]) for (const paid of [true, false]) test(`mobile compare matches main apart from colour tokens (native=${native}, small=${mobile}, paid=${paid})`, () => {
  setupReviewRender({ native, mobile, paid, compare: result });
  const before = render(original.CompareTakes);
  setupReviewRender({ native, mobile, paid, compare: result });
  assert.equal(normalisePresentation(render(current.CompareTakes)), normalisePresentation(before));
});
