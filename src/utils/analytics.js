import posthog from 'posthog-js';

// Initialize PostHog (free tier: 1M events/month)
const POSTHOG_KEY = 'phc_drselftape_placeholder';
const POSTHOG_HOST = 'https://us.i.posthog.com';

let initialized = false;

export function initAnalytics() {
  if (initialized) return;
  try {
    posthog.init(POSTHOG_KEY, {
      api_host: POSTHOG_HOST,
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: true,
      persistence: 'localStorage',
      loaded: () => { initialized = true; },
    });
  } catch (e) {
    console.warn('PostHog init failed:', e);
  }
}

export function identifyUser(user) {
  if (!user?.id) return;
  try {
    posthog.identify(String(user.id), {
      email: user.email,
      name: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
      role: user.role,
    });
  } catch {}
}

export function trackEvent(event, properties = {}) {
  // PostHog
  try { posthog.capture(event, properties); } catch {}

  // Also send to our backend for server-side logging
  try {
    const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
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
};
