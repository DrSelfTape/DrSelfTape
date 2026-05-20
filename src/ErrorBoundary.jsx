import { Component } from 'react';
import * as Sentry from '@sentry/react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  componentDidCatch(error, info) {
    // Auto-reload on dynamic-import failures (stale chunks after deploy).
    // Browsers phrase this differently — match all of them, including
    // Safari and Firefox variants we missed before.
    const msg = error?.message || '';
    const isChunkError =
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('error loading dynamically imported module') ||
      msg.includes('Importing a module script failed') ||
      msg.includes('Loading chunk') ||
      msg.includes('Loading CSS chunk') ||
      msg.includes('ChunkLoadError') ||
      // Safari sometimes surfaces these as a network error on the import URL
      /Unable to preload CSS for/.test(msg);

    if (isChunkError) {
      const reloadKey = 'drst-chunk-reload';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      // Allow up to 2 auto-reloads per minute (1 single retry on Safari
      // wasn't enough — its WebView held a stale entry HTML even after
      // the first reload). After that, show the manual-refresh screen
      // with a cache-bust button so we don't loop forever.
      const count = lastReload ? Number(lastReload.split(':')[1] || 0) : 0;
      const firstTs = lastReload ? Number(lastReload.split(':')[0]) : 0;
      const withinWindow = firstTs && now - firstTs < 60000;
      if (!withinWindow || count < 2) {
        const nextCount = withinWindow ? count + 1 : 1;
        sessionStorage.setItem(reloadKey, `${withinWindow ? firstTs : now}:${nextCount}`);
        // Cache-bust the URL so Safari's WebView fetches fresh HTML.
        const u = new URL(window.location.href);
        u.searchParams.set('_r', String(now));
        window.location.replace(u.toString());
        return;
      }
    }

    Sentry.captureException(error, { extra: { componentStack: info?.componentStack } });
    this.setState({ error, info });
    console.error('App crashed:', error, info);
  }
  render() {
    if (this.state.error) {
      const isChunkError = (this.state.error?.message || '').includes('dynamically imported module');
      return (
        <div style={{ padding: 40, fontFamily: '-apple-system, BlinkMacSystemFont, "Space Grotesk", "Poppins", sans-serif', background: '#FAFAF7', color: '#0A0A0A', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8, letterSpacing: '-0.4px' }}>
            {isChunkError ? 'New version available' : 'Something went wrong'}
          </h1>
          <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.62)', marginBottom: 24, maxWidth: 360, lineHeight: 1.5 }}>
            {isChunkError
              ? 'Dr Self Tape just got an update. Tap below to load the latest version — your work is safe.'
              : (
                <>
                  Something tripped us up. We logged the error and the team has been notified — no action needed on your end.
                  <br />
                  Tap below to reload and try again.
                </>
              )}
          </p>
          <button
            onClick={() => {
              sessionStorage.removeItem('drst-chunk-reload');
              // Force a cache-bypassing reload — Safari especially needs
              // the query-string change to refetch the entry HTML.
              const u = new URL(window.location.href);
              u.searchParams.set('_r', String(Date.now()));
              window.location.replace(u.toString());
            }}
            style={{
              background: 'linear-gradient(135deg, #D4A85F, #7A5A18)', color: '#fff', border: 'none', padding: '14px 32px',
              borderRadius: 100, fontSize: 11, fontWeight: 700, cursor: 'pointer',
              letterSpacing: '0.12em', textTransform: 'uppercase',
              boxShadow: '0 8px 22px rgba(212,168,95,0.30)',
            }}
          >
            Refresh App
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
