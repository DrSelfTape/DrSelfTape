// Sentry init — runs once at app boot, only if VITE_SENTRY_DSN is set.
//
// The @sentry/react SDK (~462KB) is DYNAMICALLY imported so it stays OUT of the
// cold-boot chunk. All callers (ErrorBoundary, purchases, redux slices) go
// through the capture* helpers below rather than importing the SDK statically —
// a single static import anywhere in the boot tree would drag the whole SDK back
// in. Captures before init resolves load the SDK on demand (a ~ms race at worst).

let _sentry = null;

export async function initSentry() {
  const dsn = import.meta.env.VITE_SENTRY_DSN;
  if (!dsn) return;

  const Sentry = await import('@sentry/react');
  _sentry = Sentry;

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

// Resolve the SDK: the already-inited instance if present, else load it on demand
// (used for a capture that fires before initSentry's dynamic import resolves).
function withSentry(run) {
  if (!import.meta.env.VITE_SENTRY_DSN) return;
  if (_sentry) { try { run(_sentry); } catch { /* swallow */ } return; }
  import('@sentry/react').then((S) => { try { run(S); } catch { /* swallow */ } }).catch(() => {});
}

/** Report a caught exception (ErrorBoundary, redux slices, …). */
export function captureError(error, ctx) {
  withSentry((S) => S.captureException(error, ctx));
}

/** Report a message-level event (e.g. misconfiguration warnings). */
export function captureMessage(message, ctx) {
  withSentry((S) => S.captureMessage(message, ctx));
}

/* Tag every subsequent error with the authenticated user so we can
 * triage beta reports by who hit them. Call from App.jsx after login. */
export function identifySentryUser(user) {
  if (!user?.id) return;
  withSentry((S) => S.setUser({
    id: String(user.id),
    email: user.email,
    username: user.email,
  }));
}

export function clearSentryUser() {
  withSentry((S) => S.setUser(null));
}
