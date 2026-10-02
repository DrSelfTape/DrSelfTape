// Library imports
import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Capacitor } from '@capacitor/core';

/**
 * One navigation door for dashboard destinations.
 *
 * Inside the Capacitor shell there is no router history to push onto — the
 * whole app is one mounted tree — so react-router's imperative navigate()
 * silently does nothing. Every dashboard destination therefore has to be
 * handed to DashboardLayout / MobileApp as a `drst-navigate` event instead.
 *
 * The failure is quiet and easy to reintroduce: on web the button works, so
 * it only shows up as a dead tap on a real device. Codex found four of them
 * still live after a review pass that was specifically looking for them.
 * Importing this is cheaper than remembering the rule.
 *
 * Web behaviour is unchanged — a plain router push.
 */

// Path -> the panel/tab the native shells understand. A destination missing
// from here falls through to navigate(), which is correct for anything
// outside the dashboard shell (auth screens, the public reader page).
export const NAV_DETAIL = {
  '/dashboard': { tab: 'home' },
  '/dashboard/jericho?tab=tape': { tab: 'tape-review' },
  '/dashboard/profile': { panel: 'dash-profile' },
  '/dashboard/generator': { panel: 'generator' },
  '/dashboard/scene-study': { tab: 'scenes' },
  '/dashboard/find-a-reader': { panel: 'find-a-reader' },
  '/dashboard/green-room': { panel: 'green-room' },
  '/dashboard/auditions': { tab: 'auditions' },
  '/dashboard/cd-sim': { panel: 'cd-sim' },
  '/dashboard/referral': { panel: 'referral' },
  '/dashboard/leaderboard': { panel: 'leaderboard' },
  '/dashboard/craft-journey': { panel: 'craft-journey' },
  '/dashboard/readers': { panel: 'find-a-reader' },
  '/dashboard/self-tapes': { panel: 'self-tapes' },
  '/dashboard/submissions': { panel: 'submissions' },
  '/dashboard/my-studio': { panel: 'my-studio' },
  '/dashboard/membership': { panel: 'membership' },
};

/** Dispatch a native shell navigation. Returns false if we don't know the
 *  destination, so callers can fall back to the router. */
export function goNative(path) {
  const detail = NAV_DETAIL[path];
  if (!detail) return false;
  window.dispatchEvent(new CustomEvent('drst-navigate', { detail }));
  return true;
}

/** `go(path)` — the event on native, a router push on web. */
export function useGo() {
  const navigate = useNavigate();
  return useCallback((path, options) => {
    if (Capacitor.isNativePlatform() && goNative(path)) return;
    navigate(path, options);
  }, [navigate]);
}

export default useGo;
