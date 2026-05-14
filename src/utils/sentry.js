// Sentry init — runs once at app boot, only if VITE_SENTRY_DSN is set.
// Keeping this in its own module so main.jsx stays readable and so any
// SDK upgrade only touches one file.

import * as Sentry from '@sentry/react';

export function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    environment: import.meta.env.MODE,
    integrations: [
      Sentry.browserTracingIntegration(),
      Sentry.replayIntegration({ maskAllText: false, blockAllMedia: true }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.0,
    replaysOnErrorSampleRate: 1.0,
    // Don't spam Sentry with the chunk-reload errors we already handle.
    ignoreErrors: [
      'Failed to fetch dynamically imported module',
      'Loading chunk',
      'Loading CSS chunk',
    ],
  });
}

export { Sentry };
