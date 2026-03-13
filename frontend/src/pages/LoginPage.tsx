import { useState, useEffect, type FormEvent, type ChangeEvent } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import Logo from '@/components/ui/Logo';
import {
  EmailIcon,
  LockIcon,
  EyeIcon,
  EyeOffIcon,
  AlertCircleIcon,
} from '@/components/ui/Icons';
import { InlineSpinner } from '@/components/ui/Spinner';
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
      const code = (err as { code?: string })?.code ?? '';
      let message: string;
      switch (code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
          message = 'Invalid email or password.';
          break;
        case 'auth/too-many-requests':
          message = 'Too many failed attempts. Please try again later.';
          break;
        case 'auth/user-disabled':
          message = 'This account has been disabled.';
          break;
        default:
          message = 'Unable to sign in. Please check your credentials.';
      }
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
          <Logo variant="light" className={styles.panelLogo} />

          <div className={styles.panelContent}>
            <h1 className={styles.panelHeading}>
              Clinical Intelligence,<br />Delivered Instantly
            </h1>
            <p className={styles.panelSubheading}>
              Medivise brings AI-powered clinical decision support, drug interaction checking,
              and evidence-based protocols to your fingertips — securely and in real time.
            </p>
          </div>



          <div className={styles.panelDecoration} aria-hidden="true">
            <MedicalPattern />
          </div>
        </div>
      </aside>

      {/* Right panel — form */}
      <main className={styles.formSide}>
        <div className={styles.formCard}>
          {/* Logo with red cross in white panel */}
          <div className={styles.formLogo}>
            <div className={styles.formLogoIcon}>
              <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
                <rect width="40" height="40" rx="10" fill="#B91C1C" />
                <path d="M16 10h8v6h6v8h-6v6h-8v-6h-6v-8h6V10z" fill="white" />
              </svg>
            </div>
            <span className={styles.formLogoText}>Medivise</span>
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
              <AlertCircleIcon />
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
                <Link to="/forgot-password" className={styles.forgotLink}>
                  Forgot password?
                </Link>
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
                  <InlineSpinner />
                  Signing in…
                </>
              ) : (
                'Sign in to Medivise'
              )}
            </button>
          </form>

          <p className={styles.signupPrompt}>
            Don't have an account?{' '}
            <Link to="/signup" className={styles.signupLink}>Create an account</Link>
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



// ─── Decorative SVG (login-page-specific) ────────────────────────────────────

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
