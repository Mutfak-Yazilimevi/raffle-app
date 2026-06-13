import { Component } from 'react';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#dc2626' }}>Beklenmedik bir hata oluştu</h2>
          <p style={{ color: '#6b7280', marginBottom: '1rem' }}>{this.state.error.message}</p>
          <button
            onClick={() => this.setState({ error: null })}
            style={{
              padding: '0.5rem 1.25rem',
              background: '#7c3aed',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
            }}
          >
            Tekrar dene
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
