/**
 * How we are allowed to talk about reader supply. One place, read by every
 * surface that shows a number.
 *
 * Every count came from its own call site before this, and they disagreed
 * badly: Home said "2019 new readers near you" (every provisioned account),
 * the desktop CTA said "N actors looking for readers right now" next to a
 * pulsing live dot while using a 30-DAY figure, the deck said "N nearby" with
 * no geography anywhere in the query, and the App Store screenshot claimed 234
 * online — more than every account that had ever logged in.
 *
 * Three rules, and they are the whole point of this file:
 *   1. A number's LABEL must match the number's DEFINITION.
 *   2. Only `online` may be paired with a live/pulsing indicator.
 *   3. Never fall back between two different quantities. Showing
 *      pending_likes when available_count is 0, under one label, is how you
 *      end up telling someone "3 readers active this month" because three
 *      people liked them.
 *
 * The backend counterpart is apps/matching/selectors.py, which guarantees the
 * numbers below describe exactly the readers the deck can actually deal.
 */

/** Normalize the stats payload into the only three quantities that exist. */
export function supplyCounts(stats) {
  return {
    // Cards waiting for this user right now (swipe history applied).
    deck: Number(stats?.deck_count) || 0,
    // Readers this user could be matched with at all.
    available: Number(stats?.available_count) || 0,
    // Connected this instant. The ONLY one that may pulse.
    online: Number(stats?.online_count) || 0,
    windowDays: Number(stats?.window_days) || 30,
  };
}

/**
 * The canonical supply sentence.
 *
 * Returns null when there is nothing honest to say — callers should render
 * nothing rather than reach for a different number to fill the space.
 */
export function supplyLine(stats) {
  const { deck, available, online, windowDays } = supplyCounts(stats);
  if (online > 0) {
    return { text: `${online} reader${online === 1 ? '' : 's'} online now`, live: true };
  }
  if (deck > 0) {
    return { text: `${deck} in your deck`, live: false };
  }
  if (available > 0) {
    return {
      text: `${available} reader${available === 1 ? '' : 's'} active in the last ${windowDays} days`,
      live: false,
    };
  }
  return null;
}

/** True when we may render a pulsing "live" dot beside a supply number. */
export function isLive(stats) {
  return supplyCounts(stats).online > 0;
}
