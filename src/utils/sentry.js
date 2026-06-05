// Sentry init — runs once at app boot, only if VITE_SENTRY_DSN is set.
// Keeping this in its own module so main.jsx stays readable and so any
// SDK upgrade only touches one file.

import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.VITE_SENTRY_ENVIRONMENT || import.meta.env.MODE,
    // Collect IP address + user-agent for easier beta debugging.
    sendDefaultPii: true,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: true }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
    // Don't spam Sentry with the chunk-reload errors we already handle.
    // Both `ignoreErrors` (SDK-level) and a regex sweep in beforeSend
    // (catch-all for variants the substring match misses).
    ignoreErrors: [
      'Failed to fetch dynamically imported module',
      'Loading chunk',
      'Loading CSS chunk',
      'is not a valid JavaScript MIME type',
      'Importing a module script failed',
      'Unable to preload CSS for',
      // Network blips that fire on background-tab tabs we can't help with.
      'NetworkError when attempting to fetch resource',
      'Load failed',
    ],
    beforeSend(event, hint) {
      const msg = hint?.originalException?.message
        || event?.exception?.values?.[0]?.value
        || event?.message
        || '';
      // Belt-and-suspenders chunk filter — covers iOS Safari + Chrome
      // variants of the "stale entry HTML returned as JS" failure.
      if (/MIME type|preload CSS|ChunkLoadError|dynamically imported|Importing a module script/i.test(msg)) {
        return null;
      }
      return event;
    },
  });
}

/* Tag every subsequent error with the authenticated user so we can
 * triage beta reports by who hit them. Call from App.jsx after login. */
export function identifySentryUser(user) {
  if (!user?.id || !import.meta.env.VITE_SENTRY_DSN) return;
  try {
    Sentry.setUser({
      id: String(user.id),
      email: user.email,
      username: user.email,
    });
  } catch { /* swallow */ }
}

export function clearSentryUser() {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  try { Sentry.setUser(null); } catch { /* swallow */ }
}

export { Sentry };
