import { Component } from 'react';

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }
  componentDidCatch(error, info) {
    this.setState({ error, info });
    console.error('App crashed:', error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 40, fontFamily: 'monospace', background: '#1a1a2e', color: '#C855F0', minHeight: '100vh' }}>
          <h1 style={{ fontSize: 24, marginBottom: 16 }}>💥 App Error</h1>
          <pre style={{ background: '#0f0f1a', padding: 20, borderRadius: 8, color: '#fff', whiteSpace: 'pre-wrap', fontSize: 13 }}>
            {this.state.error?.toString()}
          </pre>
          <pre style={{ background: '#0f0f1a', padding: 20, borderRadius: 8, color: '#9ca3af', whiteSpace: 'pre-wrap', fontSize: 12, marginTop: 16 }}>
            {this.state.info?.componentStack}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
