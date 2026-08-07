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
      // Client-side error tracking — without this, $exception never fires and
      // a broken deploy is invisible until users complain.
      capture_exceptions: true,
      loaded: () => { initialized = true; },
    });
  } catch (e) {
    console.warn('PostHog init failed:', e);
  }
}

export async function identifyUser(user) {
  if (!user?.id || !POSTHOG_KEY) return;
  // Ensure init() has run before identify() — on iOS (Capacitor WKWebView) the
  // [user] effect could fire identify() before initAnalytics() finished, so the
  // anon distinct_id was never aliased and the client's in-app events stayed
  // detached from the server-side user_signup (only ~26% stitched). Awaiting
  // init closes that race; the server-side $anon_distinct_id stamp is the
  // belt-and-suspenders (see getPostHogDistinctId + BE posthog_capture).
  await initAnalytics();
  const posthog = await loadPostHog();
  if (!posthog) return;
  try {
    posthog.identify(String(user.id), {
      email: user.email,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      role: user.role,
    });
  } catch { /* noop */ }
}

// The current (pre-login, anonymous) PostHog distinct_id. Sent to the BE at
// signup so the server-side user_signup event can carry $anon_distinct_id and
// merge this anonymous person (which holds the pre-identify funnel events) into
// the real user — the race-proof half of the identity stitch. '' when PostHog
// isn't ready yet (BE simply skips the stamp; the client identify() still runs).
export async function getPostHogDistinctId() {
  if (!POSTHOG_KEY) return '';
  const posthog = await loadPostHog();
  try { return posthog?.get_distinct_id?.() || ''; } catch { return ''; }
}

// App event → Meta standard conversion event. These are the optimization
// targets Meta campaigns bid toward; everything else fires as a custom event so
// it's still usable for retargeting / lookalike audiences.
const META_STD = {
  user_signup: 'CompleteRegistration',
  purchase: 'Subscribe',
};

// Read a browser cookie by name (for Meta's _fbp / _fbc match keys). Forwarding
// these to the backend lets the server-side Conversions API match the same
// person the browser pixel does — the single biggest Event Match Quality lift.
function readCookie(name) {
  try {
    const m = document.cookie.match(new RegExp('(?:^|; )' + name + '=([^;]*)'));
    return m ? decodeURIComponent(m[1]) : undefined;
  } catch { return undefined; }
}

// One id shared by the browser pixel AND the server-side CAPI event so Meta
// dedupes them into a single conversion instead of double-counting.
function newEventId() {
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  } catch { /* noop */ }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function trackEvent(event, properties = {}) {
  const eventId = newEventId();

  // PostHog (lazy — only if a key is configured). Await init so the earliest
  // session events (fired before initAnalytics resolved) aren't dropped
  // client-side — same race the identity stitch closed for identify().
  if (POSTHOG_KEY) {
    initAnalytics()
      .then(loadPostHog)
      .then((posthog) => { try { posthog?.capture(event, properties); } catch { /* noop */ } });
  }

  // Meta Pixel (web only — initialised in index.html for non-native platforms).
  // The 4th-arg eventID is what Meta dedupes against the server-side event.
  try {
    if (typeof window !== 'undefined' && window.fbq) {
      // 'purchase' → Subscribe is owned by the server webhook now (single
      // source of truth: real entitlement only, deterministic dedupe id,
      // carries value). Firing the pixel Subscribe here fired on paywall
      // taps + failures (poisoning the optimizer) AND double-counted the
      // webhook. Send purchase as a custom event so internal Meta funnels
      // still see it, but it never books a Subscribe conversion.
      const std = event === 'purchase' ? null : META_STD[event];
      if (std) window.fbq('track', std, properties, { eventID: eventId });
      else window.fbq('trackCustom', event, properties, { eventID: eventId });
    }
  } catch { /* pixel not loaded */ }

  // Also send to our backend — this is the ONLY Meta signal path on the native
  // app (no fbq there), and it carries event_id + _fbp/_fbc so the server-side
  // Conversions API can fire a deduped, well-matched conversion.
  try {
    const token = JSON.parse(localStorage.getItem('persist:root') || '{}');
    const auth = JSON.parse(token?.auth || '{}');
    const accessToken = auth?.user?.token?.access || auth?.user?.token;
    if (accessToken) {
      const fbp = readCookie('_fbp');
      const fbc = readCookie('_fbc');
      const enriched = { ...properties };
      if (fbp) enriched.fbp = fbp;
      if (fbc) enriched.fbc = fbc;
      if (typeof window !== 'undefined' && window.location) {
        enriched.source_url = window.location.href;
      }
      fetch(`${baseURL}/v1/analytics/track/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ event, properties: enriched, event_id: eventId }),
      }).catch(() => {});
    }
  } catch { /* noop */ }
}

// Pre-built events for common actions
export const Events = {
  SIGNUP: 'user_signup',
  LOGIN: 'user_login',
  GENERATE_SCENE: 'generate_scene',
  PRACTICE_AI: 'practice_with_ai',
  SWIPE: 'swipe_reader',
  MATCH: 'match_created',

  // ── Visibility funnel. 52 of 73 active actors could not be dealt into any
  // deck because they had no picture. The OUTCOME is measurable server-side
  // (manage.py headshot_nudge re-reports the visible/invisible split), but not
  // the funnel: someone who opens the app, reads the prompt and walks away is
  // indistinguishable from someone who never opened it — and those two failures
  // need completely different fixes.
  VISIBILITY_PROMPT_SHOWN: 'visibility_prompt_shown',
  VISIBILITY_PICKER_OPENED: 'visibility_picker_opened',
  VISIBILITY_AVATAR_CHOSEN: 'visibility_avatar_chosen',
  VISIBILITY_PHOTO_UPLOADED: 'visibility_photo_uploaded',
  VISIBILITY_DISMISSED: 'visibility_dismissed',
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
  SLATE_OPENED: 'slate_opened',
  SLATE_MESSAGE: 'slate_message',
  PURCHASE: 'purchase',
  // Free-first-review onboarding funnel (Day-0 activation → paywall).
  FIRST_REVIEW_OFFER_SHOWN: 'first_review_offer_shown',
  FIRST_REVIEW_OFFER_TAPPED: 'first_review_offer_tapped',
  FIRST_REVIEW_STARTED: 'first_review_started',
  FIRST_REVIEW_COMPLETED: 'first_review_completed',
  FIRST_REVIEW_PAYWALL_SHOWN: 'first_review_paywall_shown',
  FIRST_REVIEW_PAYWALL_TAP: 'first_review_paywall_tap',
  FIRST_REVIEW_SKIPPED: 'first_review_skipped',
  // Added 2026-07-07 — the silent-abort + repeat gaps the activation funnel was
  // blind to. offer_shown → upload_shown → started → completed → notes_viewed,
  // plus the two silent drops (consent decline, upload dead-end) and the repeat
  // half of ACTIVE (a returning actor's second review).
  FIRST_REVIEW_CONSENT_DECLINED: 'first_review_consent_declined',
  FIRST_REVIEW_UPLOAD_SHOWN: 'first_review_upload_shown',
  FIRST_REVIEW_NOTES_VIEWED: 'first_review_notes_viewed',
  REPEAT_REVIEW_STARTED: 'repeat_review_started',
  REPEAT_REVIEW_COMPLETED: 'repeat_review_completed',
  // Referral loop — share tap in the Invite panel, and a successful
  // /growth/referral/apply/ after a referred signup.
  REFERRAL_SHARE_TAP: 'referral_share_tap',
  REFERRAL_APPLIED: 'referral_applied',
};
