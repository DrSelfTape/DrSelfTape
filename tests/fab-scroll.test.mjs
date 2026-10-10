// Slate's mascot steps aside while you scroll past it.
//
// The FAB is 76px tall at `bottom: safe + 98px`; the shell's content box
// reserves `84px + safe`. That leaves a ~90px band on the right edge where a
// card sits underneath the clapperboard — partly unreadable, partly untappable.
// Reported as "the clapperboard is sometimes in the way", and "sometimes" is
// the clue: it only collides with whatever happens to land in that band.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextFabHidden, FAB_SCROLL_SLACK, FAB_TOP_ZONE } from '../src/components/Slate/fabScroll.js';

test('scrolling down hides it, scrolling back up brings it home', () => {
  assert.equal(nextFabHidden(false, 200, 100), true, 'a clear downward scroll should hide it');
  assert.equal(nextFabHidden(true, 100, 200), false, 'scrolling up should bring it back');
});

test('it is always visible near the top of a list', () => {
  // A screen the user has not scrolled should show the mascot — that is the
  // whole point of a FAB.
  assert.equal(nextFabHidden(true, 0, 500), false);
  assert.equal(nextFabHidden(true, FAB_TOP_ZONE, 500), false);
  assert.equal(nextFabHidden(false, FAB_TOP_ZONE, 0), false);
});

test('a thumb resting on the glass does not flicker it', () => {
  // Sub-slack jitter in either direction must hold the current state, or the
  // mascot strobes while a finger rests on a scrolling list.
  for (const dy of [0, 1, -1, FAB_SCROLL_SLACK, -FAB_SCROLL_SLACK]) {
    assert.equal(nextFabHidden(true, 400 + dy, 400), true, `dy=${dy} should hold hidden`);
    assert.equal(nextFabHidden(false, 400 + dy, 400), false, `dy=${dy} should hold visible`);
  }
});

test('iOS rubber-banding past the top does not leave it hidden', () => {
  // Overscroll reports a negative scrollTop on iOS; that must read as "at the
  // top", not as a large upward delta that happens to work by accident.
  assert.equal(nextFabHidden(true, -40, 10), false);
});

test('a long flick down hides it and it stays hidden through the flick', () => {
  let hidden = false;
  for (const y of [0, 60, 180, 340, 520, 700]) {
    hidden = nextFabHidden(hidden, y, y - 60);
  }
  assert.equal(hidden, true, 'it should remain out of the way for the whole flick');
});
