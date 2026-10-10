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

export function nextFabHidden(previous, y, lastY) {
  const dy = y - lastY;
  if (y <= FAB_TOP_ZONE) return false;
  if (dy > FAB_SCROLL_SLACK) return true;
  if (dy < -FAB_SCROLL_SLACK) return false;
  return previous;
}
