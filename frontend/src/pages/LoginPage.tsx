import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import styles from './LoginPage.module.css';

interface FormState {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  general?: string;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, isAuthenticated, isLoading: authLoading } = useAuth();

  const [form, setForm] = useState<FormState>({ email: '', password: '', rememberMe: false });
  const [errors, setErrors] = useState<FormErrors>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const from = (location.state as { from?: { pathname: string } })?.from?.pathname || '/dashboard';

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate, from]);

  const validate = (): boolean => {
    const next: FormErrors = {};
    if (!form.email) {
      next.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      next.email = 'Enter a valid email address';
    }
    if (!form.password) {
      next.password = 'Password is required';
    } else if (form.password.length < 6) {
      next.password = 'Password must be at least 6 characters';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      await login(form);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        'Unable to sign in. Please check your credentials.';
      setErrors({ general: message });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading) return null;

  return (
    <div className={styles.root}>
      {/* Left panel — branding */}
      <aside className={styles.panel}>
        <div className={styles.panelInner}>
          <Logo className={styles.panelLogo} />

          <div className={styles.panelContent}>
            <h1 className={styles.panelHeading}>
              Clinical Intelligence,<br />Delivered Instantly
            </h1>
            <p className={styles.panelSubheading}>
              Medivise brings AI-powered clinical decision support, drug interaction checking,
              and evidence-based protocols to your fingertips — securely and in real time.
            </p>
          </div>

          <ul className={styles.featureList}>
            {FEATURES.map(({ icon, label }) => (
              <li key={label} className={styles.featureItem}>
                <span className={styles.featureIcon}>{icon}</span>
                <span>{label}</span>
              </li>
            ))}
          </ul>

          <div className={styles.panelDecoration} aria-hidden="true">
            <MedicalPattern />
          </div>
        </div>
      </aside>

      {/* Right panel — form */}
      <main className={styles.formSide}>
        <div className={styles.formCard}>
          {/* Mobile logo */}
          <div className={styles.mobileLogo}>
            <Logo />
          </div>

          <header className={styles.formHeader}>
            <h2 className={styles.formTitle}>Welcome back</h2>
            <p className={styles.formSubtitle}>
              Sign in to your Medivise account to continue
            </p>
          </header>

          {/* General error */}
          {errors.general && (
            <div className={styles.alert} role="alert">
              <AlertIcon />
              <span>{errors.general}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className={styles.form}>
            {/* Email */}
            <div className={styles.field}>
              <label htmlFor="email" className={styles.label}>
                Email address
              </label>
              <div className={`${styles.inputWrapper} ${errors.email ? styles.inputError : ''}`}>
                <span className={styles.inputIcon}><EmailIcon /></span>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@hospital.com"
                  autoComplete="email"
                  autoFocus
                  className={styles.input}
                  aria-describedby={errors.email ? 'email-error' : undefined}
                  aria-invalid={!!errors.email}
                />
              </div>
              {errors.email && (
                <span id="email-error" className={styles.fieldError} role="alert">
                  {errors.email}
                </span>
              )}
            </div>

            {/* Password */}
            <div className={styles.field}>
              <div className={styles.labelRow}>
                <label htmlFor="password" className={styles.label}>
                  Password
                </label>
                <a href="#" className={styles.forgotLink}>
                  Forgot password?
                </a>
              </div>
              <div className={`${styles.inputWrapper} ${errors.password ? styles.inputError : ''}`}>
                <span className={styles.inputIcon}><LockIcon /></span>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={styles.input}
                  aria-describedby={errors.password ? 'password-error' : undefined}
                  aria-invalid={!!errors.password}
                />
                <button
                  type="button"
                  className={styles.togglePassword}
                  onClick={() => setShowPassword((p) => !p)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              </div>
              {errors.password && (
                <span id="password-error" className={styles.fieldError} role="alert">
                  {errors.password}
                </span>
              )}
            </div>

            {/* Remember me */}
            <label className={styles.checkboxLabel}>
              <input
                type="checkbox"
                name="rememberMe"
                checked={form.rememberMe}
                onChange={handleChange}
                className={styles.checkbox}
              />
              <span className={styles.checkboxText}>Remember me for 7 days</span>
            </label>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className={styles.submitBtn}
            >
              {isSubmitting ? (
                <>
                  <SpinnerIcon />
                  Signing in…
                </>
              ) : (
                'Sign in to Medivise'
              )}
            </button>
          </form>

          <p className={styles.demoNote}>
            <strong>Demo credentials:</strong> dr.smith@medivise.com / Medivise@2024
          </p>

          <footer className={styles.formFooter}>
            <p>
              Protected under HIPAA. All access is logged and monitored.
            </p>
            <div className={styles.footerLinks}>
              <a href="#">Privacy Policy</a>
              <span aria-hidden="true">·</span>
              <a href="#">Terms of Service</a>
              <span aria-hidden="true">·</span>
              <a href="#">Support</a>
            </div>
          </footer>
        </div>
      </main>
    </div>
  );
}

// ─── Feature list ─────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '🧠', label: 'AI-Powered Clinical Decision Support' },
  { icon: '💊', label: 'Real-Time Drug Interaction Checker' },
  { icon: '📋', label: 'Evidence-Based Treatment Protocols' },
  { icon: '🔒', label: 'HIPAA-Compliant & Secure' },
];

// ─── SVG Icons ───────────────────────────────────────────────────────────────

function Logo({ className }: { className?: string }) {
  return (
    <div className={`${styles.logo} ${className ?? ''}`}>
      <div className={styles.logoIcon}>
        <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
          <rect width="40" height="40" rx="10" fill="currentColor" />
          <path
            d="M16 10h8v6h6v8h-6v6h-8v-6h-6v-8h6V10z"
            fill="white"
          />
        </svg>
      </div>
      <span className={styles.logoText}>Medivise</span>
    </div>
  );
}

function MedicalPattern() {
  return (
    <svg viewBox="0 0 400 400" fill="none" className={styles.decorPattern}>
      {Array.from({ length: 6 }, (_, row) =>
        Array.from({ length: 6 }, (_, col) => {
          const x = col * 70 + 10;
          const y = row * 70 + 10;
          return (
            <g key={`${row}-${col}`} opacity="0.12">
              <rect x={x + 26} y={y + 10} width="8" height="30" rx="2" fill="white" />
              <rect x={x + 10} y={y + 26} width="30" height="8" rx="2" fill="white" />
            </g>
          );
        })
      )}
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function EyeIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
      <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
      <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
      <line x1="2" x2="22" y1="2" y2="22" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{ animation: 'spin 0.8s linear infinite' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}
