import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontFamily: 'var(--font-sans)',
            background: 'var(--color-gray-50)',
          }}
        >
          <div style={{ textAlign: 'center', maxWidth: 420, padding: '2rem' }}>
            <h1
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: 'var(--color-gray-900)',
                marginBottom: '0.5rem',
              }}
            >
              Something went wrong
            </h1>
            <p
              style={{
                color: 'var(--color-gray-500)',
                marginBottom: '1.5rem',
              }}
            >
              An unexpected error occurred. Please refresh the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '0.625rem 1.25rem',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: 'var(--color-white)',
                background: 'var(--color-primary)',
                borderRadius: 'var(--radius-md)',
                border: 'none',
                cursor: 'pointer',
              }}
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
