// PostHog is loaded lazily — the SDK is ~175KB minified, and a placeholder
// key means it's a no-op right now anyway. We also skip init entirely until
// a real key is set, so the chunk never downloads on first paint.

import { baseURL } from '../redux/constant';

const POSTHOG_KEY = import.meta.env.VITE_POSTHOG_KEY || '';
const POSTHOG_HOST = import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com';

let posthogPromise = null;
let initialized = false;

function loadPostHog() {
  if (!POSTHOG_KEY) return null;
  if (!posthogPromise) {
    posthogPromise = import('posthog-js').then((m) => m.default).catch(() => null);
  }
  return posthogPromise;
}

export async function initAnalytics() {
  if (initialized || !POSTHOG_KEY) return;
  const posthog = await loadPostHog();
  if (!posthog) return;
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      // Capture events from anonymous (logged-out) visitors too. Without
      // this the project-level 'identified only' default would suppress
      // landing-page / signup-page activity from our beta funnels.
      person_profiles: 'always',
      persistence: 'localStorage',
      loaded: () => { initialized = true; },
    });
  } catch (e) {
    console.warn('PostHog init failed:', e);
  }
}

export async function identifyUser(user) {
  if (!user?.id || !POSTHOG_KEY) return;
  const posthog = await loadPostHog();
  if (!posthog) return;
  try {
    posthog.identify(String(user.id), {
      email: user.email,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      role: user.role,
    });
  } catch {}
}

// App event → Meta standard conversion event. These are the optimization
// targets Meta campaigns bid toward; everything else fires as a custom event so
// it's still usable for retargeting / lookalike audiences.
const META_STD = {
  user_signup: 'CompleteRegistration',
  purchase: 'Subscribe',
};

export function trackEvent(event, properties = {}) {
  // PostHog (lazy — only if a key is configured)
  if (POSTHOG_KEY) {
    loadPostHog()?.then((posthog) => {
      try { posthog?.capture(event, properties); } catch {}
    });
  }

  // Meta Pixel (web only — initialised in index.html for non-native platforms).
  try {
    if (typeof window !== 'undefined' && window.fbq) {
      const std = META_STD[event];
      if (std) window.fbq('track', std, properties);
      else window.fbq('trackCustom', event, properties);
    }
  } catch { /* pixel not loaded */ }

  // Also send to our backend for server-side logging. Reuse the same
  // baseURL the rest of the app uses so we can't accidentally diverge.
  try {
    const token = JSON.parse(localStorage.getItem('persist:root') || '{}');
    const auth = JSON.parse(token?.auth || '{}');
    const accessToken = auth?.user?.token?.access || auth?.user?.token;
    if (accessToken) {
      fetch(`${baseURL}/v1/analytics/track/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ event, properties }),
      }).catch(() => {});
    }
  } catch {}
}

// Pre-built events for common actions
export const Events = {
  SIGNUP: 'user_signup',
  LOGIN: 'user_login',
  GENERATE_SCENE: 'generate_scene',
  PRACTICE_AI: 'practice_with_ai',
  SWIPE: 'swipe_reader',
  MATCH: 'match_created',
  SEND_MESSAGE: 'send_message',
  START_REHEARSAL: 'start_rehearsal',
  GO_AVAILABLE: 'go_available',
  UPLOAD_HEADSHOT: 'upload_headshot',
  ADD_AUDITION: 'add_audition',
  SCAN_SCREENSHOT: 'scan_screenshot',
  TUTORIAL_STEP: 'tutorial_step_complete',
  TUTORIAL_COMPLETE: 'tutorial_complete',
  ACTING_COACH: 'acting_coach_review',
  TAPE_REVIEW: 'tape_review',
  COMPARE_TAKES: 'compare_takes',
  SIDES_UPLOADED: 'sides_uploaded',
  PURCHASE: 'purchase',
};
