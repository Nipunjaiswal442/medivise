import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-gray-50)',
      fontFamily: 'var(--font-sans)',
    }}>
      {/* Top nav */}
      <header style={{
        background: 'var(--color-white)',
        borderBottom: '1px solid var(--color-gray-200)',
        padding: '0 2rem',
        height: '64px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: 'var(--shadow-sm)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
          <div style={{
            width: '2rem',
            height: '2rem',
            background: 'var(--color-primary)',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            <svg viewBox="0 0 40 40" fill="none" width="20" height="20">
              <path d="M16 10h8v6h6v8h-6v6h-8v-6h-6v-8h6V10z" fill="white" />
            </svg>
          </div>
          <span style={{
            fontFamily: 'var(--font-display)',
            fontSize: '1.25rem',
            fontWeight: 700,
            color: 'var(--color-primary)',
          }}>
            Medivise
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ textAlign: 'right' }}>
            <p style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-gray-900)' }}>
              {user?.name}
            </p>
            <p style={{ fontSize: '0.75rem', color: 'var(--color-gray-500)', textTransform: 'capitalize' }}>
              {user?.specialty ?? user?.role}
            </p>
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '0.875rem',
              fontWeight: 500,
              color: 'var(--color-primary)',
              border: '1.5px solid var(--color-primary)',
              borderRadius: 'var(--radius-md)',
              background: 'transparent',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              fontFamily: 'var(--font-sans)',
            }}
            onMouseOver={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'var(--color-primary-bg)';
            }}
            onMouseOut={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
            }}
          >
            Sign out
          </button>
        </div>
      </header>

      {/* Body */}
      <main style={{ padding: '3rem 2rem', maxWidth: '960px', margin: '0 auto' }}>
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary-dark), var(--color-primary))',
          borderRadius: 'var(--radius-xl)',
          padding: '2.5rem',
          color: 'white',
          marginBottom: '2rem',
        }}>
          <p style={{ fontSize: '0.875rem', opacity: 0.8, marginBottom: '0.25rem' }}>
            Good morning,
          </p>
          <h1 style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2rem',
            fontWeight: 700,
            marginBottom: '0.5rem',
          }}>
            {user?.name} 👋
          </h1>
          <p style={{ opacity: 0.85, fontSize: '0.9375rem' }}>
            Welcome back to Medivise. Your clinical dashboard is ready.
          </p>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
        }}>
          {[
            { label: 'Patients Today', value: '24', icon: '👤' },
            { label: 'Drug Interactions Checked', value: '8', icon: '💊' },
            { label: 'Protocols Referenced', value: '5', icon: '📋' },
            { label: 'Alerts', value: '2', icon: '🔔' },
          ].map(({ label, value, icon }) => (
            <div key={label} style={{
              background: 'var(--color-white)',
              border: '1px solid var(--color-gray-200)',
              borderRadius: 'var(--radius-lg)',
              padding: '1.5rem',
              boxShadow: 'var(--shadow-sm)',
            }}>
              <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{icon}</div>
              <div style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--color-primary)', marginBottom: '0.25rem' }}>
                {value}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--color-gray-500)' }}>{label}</div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
