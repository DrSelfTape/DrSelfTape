// Slate's mascot steps aside while you scroll past it.
//
// The FAB is 76px tall at `bottom: safe + 98px`; the shell's content box
// reserves `84px + safe`. That leaves a ~90px band on the right edge where a
// card sits underneath the clapperboard — partly unreadable, partly untappable.
// Reported as "the clapperboard is sometimes in the way", and "sometimes" is
// the clue: it only collides with whatever happens to land in that band.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  nextFabState, FAB_SCROLL_SLACK, FAB_TOP_ZONE,
} from '../src/components/Slate/fabScroll.js';

// ── nextFabState: the same decision measured against a held anchor ──────────
// The shell re-pointed the comparison on every scroll event, so a drag moving
// <=FAB_SCROLL_SLACK per event never cleared the slack and the mascot never
// stepped aside — the collision the feature exists to fix, on exactly the slow
// scroll where a user is reading.
const run = (ys, start = { hidden: false, anchor: 0 }) =>
  ys.reduce((state, y) => nextFabState(state, y), start);

test('a slow sustained scroll eventually hides it', () => {
  // 5px per event: every single delta is inside the slack.
  const ys = [];
  for (let y = 30; y <= 200; y += 5) ys.push(y);
  assert.equal(run(ys, { hidden: false, anchor: 30 }).hidden, true,
    'slow downward movement must accumulate against the anchor');
});

test('jitter around a resting point still never hides it', () => {
  // Oscillation cannot drag the anchor along, so it cannot accumulate.
  const ys = [];
  for (let i = 0; i < 40; i += 1) ys.push(400 + (i % 2 ? 4 : -4));
  assert.equal(run(ys, { hidden: false, anchor: 400 }).hidden, false,
    'a thumb resting on the glass must not strobe the mascot');
});

test('scrolling back up brings it home', () => {
  const after = run([200, 100], { hidden: false, anchor: 100 });
  assert.equal(after.hidden, false);
});

test('the top zone always wins and re-anchors', () => {
  const after = nextFabState({ hidden: true, anchor: 900 }, 0);
  assert.deepEqual(after, { hidden: false, anchor: 0 });
});

test('rubber-banding past the top reads as at-the-top', () => {
  assert.equal(nextFabState({ hidden: true, anchor: 10 }, -40).hidden, false);
});

test('a long flick down hides it and it stays hidden through the flick', () => {
  assert.equal(run([0, 60, 180, 340, 520, 700]).hidden, true,
    'it should remain out of the way for the whole flick');
});

test('a delta of exactly the slack holds the current state', () => {
  // The boundary is deliberately inclusive: the slack is what stops a resting
  // thumb strobing the mascot, so exactly-slack must not flip it.
  for (const dy of [0, FAB_SCROLL_SLACK, -FAB_SCROLL_SLACK]) {
    const from = { hidden: true, anchor: 400 };
    assert.equal(nextFabState(from, 400 + dy).hidden, true, `dy=${dy} should hold hidden`);
    assert.equal(
      nextFabState({ hidden: false, anchor: 400 }, 400 + dy).hidden, false,
      `dy=${dy} should hold visible`,
    );
  }
});

test('it is visible anywhere inside the top zone', () => {
  assert.equal(nextFabState({ hidden: true, anchor: 500 }, FAB_TOP_ZONE).hidden, false);
  assert.equal(nextFabState({ hidden: true, anchor: 0 }, 1).hidden, false);
});
