import { Component } from 'react';
import * as Sentry from '@sentry/react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  componentDidCatch(error, info) {
    // Auto-reload on dynamic import failures (stale chunks after deploy)
    const msg = error?.message || '';
    if (
      msg.includes('Failed to fetch dynamically imported module') ||
      msg.includes('Loading chunk') ||
      msg.includes('Loading CSS chunk')
    ) {
      const reloadKey = 'drst-chunk-reload';
      const lastReload = sessionStorage.getItem(reloadKey);
      const now = Date.now();
      // Only auto-reload once per minute to prevent infinite loops
      if (!lastReload || now - Number(lastReload) > 60000) {
        sessionStorage.setItem(reloadKey, String(now));
        window.location.reload();
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
          <p style={{ fontSize: 14, color: 'rgba(10,10,10,0.62)', marginBottom: 24, maxWidth: 360 }}>
            {isChunkError
              ? 'Dr Self Tape just got an update. Tap below to load the latest version.'
              : 'An unexpected error occurred. Please refresh to try again.'}
          </p>
          <button
            onClick={() => { sessionStorage.removeItem('drst-chunk-reload'); window.location.reload(); }}
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
