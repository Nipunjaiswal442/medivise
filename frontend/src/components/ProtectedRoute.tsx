import type { ReactNode } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--color-gray-50)',
      }}>
        <LoadingSpinner />
      </div>
    );
  }

  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
}

function LoadingSpinner() {
  return (
    <div style={{ textAlign: 'center' }}>
      <svg
        width="48"
        height="48"
        viewBox="0 0 48 48"
        style={{ margin: '0 auto 16px', animation: 'spin 1s linear infinite' }}
      >
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        <circle
          cx="24" cy="24" r="20"
          fill="none"
          stroke="var(--color-gray-200)"
          strokeWidth="4"
        />
        <path
          d="M24 4a20 20 0 0 1 20 20"
          fill="none"
          stroke="var(--color-primary)"
          strokeWidth="4"
          strokeLinecap="round"
        />
      </svg>
      <p style={{ color: 'var(--color-gray-500)', fontSize: '0.875rem' }}>Loading…</p>
    </div>
  );
}
