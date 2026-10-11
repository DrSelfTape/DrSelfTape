/**
 * Should Slate's mascot step aside right now?
 *
 * The FAB is 76px tall and floats at `bottom: safe + 98px`, while the shell's
 * content box only reserves `84px + safe` — so roughly a 90px band on the
 * right edge sits underneath it. A card that lands there is partly unreadable
 * and partly untappable, which is the "the clapperboard is sometimes in the
 * way" report.
 *
 * Padding every screen by another 90px forever would cost real estate on every
 * screen to fix a collision that only happens on some. So instead the mascot
 * behaves like a well-mannered FAB: away while you scroll down through that
 * band, back when you scroll up or stop.
 *
 * Pure so the thresholds are testable without mounting the 4,600-line shell.
 */

// Slack so a thumb resting on the glass, or iOS rubber-banding at the top,
// does not flicker the mascot in and out.
export const FAB_SCROLL_SLACK = 6;
// Above this the list has barely moved; keep the mascot visible so it is
// present on a screen the user has not scrolled at all.
export const FAB_TOP_ZONE = 24;

/**
 * Measured against a held scroll ANCHOR, not against the previous event.
 *
 * The first version of this compared against wherever the last scroll event
 * landed, and the shell re-pointed that on EVERY event — so a slow drag whose
 * events each moved <=FAB_SCROLL_SLACK never cleared the slack and the mascot
 * never stepped aside. That is the exact collision this feature exists to fix,
 * on exactly the slow scroll of someone reading. Holding the anchor still
 * until the slack is crossed lets slow movement accumulate, while jitter
 * around a resting point still cannot: it oscillates either side of the anchor
 * instead of dragging it along.
 *
 * Returns the next {hidden, anchor}; the caller keeps both. Returns the SAME
 * object when nothing changed, so a caller can skip the state update.
 */
export function nextFabState(state, y) {
  const { anchor } = state;
  if (y <= FAB_TOP_ZONE) {
    return state.hidden || anchor !== y ? { hidden: false, anchor: y } : state;
  }
  const dy = y - anchor;
  if (dy > FAB_SCROLL_SLACK) return { hidden: true, anchor: y };
  if (dy < -FAB_SCROLL_SLACK) return { hidden: false, anchor: y };
  // Inside the slack: hold BOTH, so the next event measures from the same place.
  return state;
}
