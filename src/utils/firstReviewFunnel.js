/**
 * H-05 — activation funnel helpers.
 *
 * The free first review is the single metric the business steers by, and the
 * funnel was partially blind in two specific ways this module fixes:
 *
 * 1. **Once-per-first-review, not once-per-mount.** `first_review_upload_shown`
 *    (and `first_review_completed`) were guarded by a `useRef`, which resets on
 *    every unmount. TapeReview remounts on the AI-consent flow, on tab
 *    switches, and on a return from background — so a single first review could
 *    emit the same "step reached" event several times, inflating the top of the
 *    funnel against a completion count that cannot inflate the same way. The
 *    guard has to outlive the component, so it lives in localStorage and is
 *    cleared only when the first review actually completes.
 *
 * 2. **Which path did they come in through?** There are two entries into a
 *    first review — the onboarding offer card and the Home-hero
 *    `launchFreeReview` — and `first_review_started` hardcoded
 *    `source: 'onboarding'` for both. Every Home-hero start was therefore
 *    filed under onboarding, which makes the two paths impossible to compare.
 *    Entry source is now recorded when the flow starts and read at fire time.
 *
 * No event is renamed here (H-05 requirement 4) — historical queries keep
 * working; only a `source` property is added and the double-fires stop.
 */

const SOURCE_KEY = 'dst_first_review_source';
const ONCE_PREFIX = 'dst_fr_once:';

export const FIRST_REVIEW_SOURCE_ONBOARDING = 'onboarding';
export const FIRST_REVIEW_SOURCE_HOME_HERO = 'home_hero';

/** Record which surface started this first-review attempt. */
export const markFirstReviewEntry = (source) => {
  try { window.sessionStorage.setItem(SOURCE_KEY, source); } catch { /* noop */ }
};

/**
 * The recorded entry source. Returns 'unknown' rather than defaulting to
 * 'onboarding': an in-flight attempt started on a build without this module has
 * no recorded source, and guessing would reintroduce exactly the mislabelling
 * this exists to remove.
 */
export const getFirstReviewEntry = () => {
  try { return window.sessionStorage.getItem(SOURCE_KEY) || 'unknown'; } catch { return 'unknown'; }
};

/**
 * True the first time it is called for `key` within one first review; false
 * afterwards, across remounts, reloads and app restarts.
 *
 * Falls back to allowing the fire when storage is unavailable (private mode):
 * a duplicate event is a smaller measurement problem than a missing one.
 */
export const claimFirstReviewOnce = (key) => {
  try {
    const k = ONCE_PREFIX + key;
    if (localStorage.getItem(k)) return false;
    localStorage.setItem(k, '1');
    return true;
  } catch {
    return true;
  }
};

/**
 * Clear the once-guards. Called when the first review completes — at that point
 * the attempt is over, and any later attempt is a REPEAT review, which has its
 * own events and its own (uninflated) counts.
 */
export const clearFirstReviewOnce = (keys) => {
  try {
    (keys || []).forEach((key) => localStorage.removeItem(ONCE_PREFIX + key));
    window.sessionStorage.removeItem(SOURCE_KEY);
  } catch { /* noop */ }
};
