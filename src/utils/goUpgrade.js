import { trackEvent } from './analytics';

/**
 * Single contextual entry point to the paywall. Every lock/upgrade CTA routes
 * through here so we (a) attribute the purchase to the surface that triggered it
 * and (b) hand the membership page an upgrade intent — which plan/cycle to
 * preselect and where to return after purchase — instead of dumping the actor on
 * a broad three-tier page defaulted to the most expensive option.
 *
 * @param {string}  source   e.g. 'tape_full_read' | 'history_full_read' | 'compare_full_notes' | 'first_review'
 * @param {string}  plan     plan id to preselect (default 'basic' — the cheapest unlock of the deep read)
 * @param {string}  cycle    'monthly' | 'yearly' (default 'monthly' — smallest first commitment)
 * @param {string}  returnTo optional panel to return to after a successful purchase
 */
export const UPGRADE_INTENT_KEY = 'drst_upgrade_intent';

export function goUpgrade({ source = 'unknown', plan = 'basic', cycle = 'monthly', returnTo } = {}) {
  const intent = { source, plan, cycle, returnTo };
  try {
    trackEvent('upgrade_intent', { source, plan, cycle });
  } catch { /* analytics must never block navigation */ }
  // Hand the intent to the membership page out-of-band so we don't have to thread
  // it through the navigation plumbing. Membership reads + clears it on mount.
  try {
    sessionStorage.setItem(UPGRADE_INTENT_KEY, JSON.stringify(intent));
  } catch { /* private mode / quota — degrade to the default membership view */ }
  try {
    window.dispatchEvent(new CustomEvent('drst-navigate', {
      detail: { panel: 'membership', upgrade: intent },
    }));
  } catch { /* noop */ }
}

/** Read-and-clear the pending upgrade intent (call once, on the membership page). */
export function consumeUpgradeIntent() {
  try {
    const raw = sessionStorage.getItem(UPGRADE_INTENT_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(UPGRADE_INTENT_KEY);
    return JSON.parse(raw);
  } catch { return null; }
}

export default goUpgrade;
