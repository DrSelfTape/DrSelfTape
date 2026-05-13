import { Component } from 'react';

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

    this.setState({ error, info });
    console.error('App crashed:', error, info);
  }
  render() {
    if (this.state.error) {
      const isChunkError = (this.state.error?.message || '').includes('dynamically imported module');
      return (
        <div style={{ padding: 40, fontFamily: "'Poppins', sans-serif", background: '#0D0D0D', color: '#fff', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🎬</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 8 }}>
            {isChunkError ? 'New version available' : 'Something went wrong'}
          </h1>
          <p style={{ fontSize: 14, color: '#999', marginBottom: 24, maxWidth: 360 }}>
            {isChunkError
              ? 'Dr Self Tape just got an update. Tap below to load the latest version.'
              : 'An unexpected error occurred. Please refresh to try again.'}
          </p>
          <button
            onClick={() => { sessionStorage.removeItem('drst-chunk-reload'); window.location.reload(); }}
            style={{
              background: '#FF8280', color: '#fff', border: 'none', padding: '12px 32px',
              borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
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
