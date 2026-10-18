import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { EmailIcon, AlertCircleIcon, LockIcon } from '@/components/ui/Icons';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import { errorMessage } from '@/convex/client';
import styles from './ForgotPasswordPage.module.css';

const PASSWORD_RULE = /^(?=.*[A-Z])(?=.*[0-9])(?=.*[^A-Za-z0-9]).{8,}$/;

/** Two steps: email a 6-digit code, then enter it with a new password (signs you in). */
export default function ForgotPasswordPage() {
    const { requestPasswordReset, confirmPasswordReset } = useAuth();
    const navigate = useNavigate();
    const [step, setStep] = useState<'email' | 'code'>('email');
    const [email, setEmail] = useState('');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const sendCode = async (e: FormEvent) => {
        e.preventDefault();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Enter a valid email address');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            await requestPasswordReset(email);
            setStep('code');
        } catch (err: unknown) {
            const message = errorMessage(err, '');
            if (/not configured|could not send/i.test(message)) {
                setError(message);
            } else {
                // Do not reveal whether an account exists for this email
                setStep('code');
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetPassword = async (e: FormEvent) => {
        e.preventDefault();
        if (!/^\d{6}$/.test(code.trim())) {
            setError('Enter the 6-digit code from the email');
            return;
        }
        if (!PASSWORD_RULE.test(password)) {
            setError('Password must be at least 8 characters and include an uppercase letter, a number and a symbol');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match');
            return;
        }
        setIsSubmitting(true);
        setError('');
        try {
            await confirmPasswordReset(email, code, password);
            navigate('/dashboard', { replace: true });
        } catch (err: unknown) {
            const message = errorMessage(err, '');
            setError(/password must/i.test(message) ? message : 'That code is invalid or has expired. Request a new one.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className={styles.root}>
            <div className={styles.card}>
                <div className={styles.formLogo}>
                    <div className={styles.formLogoIcon}>
                        <svg viewBox="0 0 40 40" fill="none" aria-hidden="true">
                            <rect width="40" height="40" rx="10" fill="#B91C1C" />
                            <path d="M16 10h8v6h6v8h-6v6h-8v-6h-6v-8h6V10z" fill="white" />
                        </svg>
                    </div>
                    <span className={styles.formLogoText}>Medivise</span>
                </div>

                <div className={styles.lockIcon}>
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                </div>

                <header className={styles.header}>
                    <h2 className={styles.title}>{step === 'email' ? 'Forgot your password?' : 'Check your email'}</h2>
                    <p className={styles.subtitle}>
                        {step === 'email'
                            ? "Enter your account's email address and we'll send you a 6-digit reset code."
                            : <>If an account exists for <strong>{email}</strong>, we sent it a 6-digit code. It expires in 15 minutes.</>}
                    </p>
                </header>

                {error && (
                    <div className={styles.alert} role="alert">
                        <AlertCircleIcon />
                        <span>{error}</span>
                    </div>
                )}

                {step === 'email' ? (
                    <form onSubmit={sendCode} noValidate className={styles.form}>
                        <div className={styles.field}>
                            <label htmlFor="reset-email" className={styles.label}>Email address</label>
                            <div className={styles.inputWrapper}>
                                <span className={styles.inputIcon}><EmailIcon /></span>
                                <input
                                    id="reset-email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => { setEmail(e.target.value); setError(''); }}
                                    placeholder="you@hospital.com"
                                    autoComplete="email"
                                    autoFocus
                                    className={styles.input}
                                />
                            </div>
                        </div>
                        <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
                            {isSubmitting ? <><InlineSpinner /> Sending…</> : 'Send reset code'}
                        </button>
                    </form>
                ) : (
                    <form onSubmit={resetPassword} noValidate className={styles.form}>
                        <div className={styles.field}>
                            <label htmlFor="reset-code" className={styles.label}>6-digit code</label>
                            <div className={styles.inputWrapper}>
                                <span className={styles.inputIcon}><EmailIcon /></span>
                                <input
                                    id="reset-code"
                                    inputMode="numeric"
                                    autoComplete="one-time-code"
                                    maxLength={6}
                                    value={code}
                                    onChange={(e) => { setCode(e.target.value.replace(/\D/g, '')); setError(''); }}
                                    placeholder="123456"
                                    autoFocus
                                    className={styles.input}
                                />
                            </div>
                        </div>
                        <div className={styles.field}>
                            <label htmlFor="new-password" className={styles.label}>New password</label>
                            <div className={styles.inputWrapper}>
                                <span className={styles.inputIcon}><LockIcon /></span>
                                <input
                                    id="new-password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={password}
                                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                                    placeholder="Uppercase, number and symbol, 8+ characters"
                                    className={styles.input}
                                />
                            </div>
                        </div>
                        <div className={styles.field}>
                            <label htmlFor="confirm-password" className={styles.label}>Confirm new password</label>
                            <div className={styles.inputWrapper}>
                                <span className={styles.inputIcon}><LockIcon /></span>
                                <input
                                    id="confirm-password"
                                    type="password"
                                    autoComplete="new-password"
                                    value={confirm}
                                    onChange={(e) => { setConfirm(e.target.value); setError(''); }}
                                    className={styles.input}
                                />
                            </div>
                        </div>
                        <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
                            {isSubmitting ? <><InlineSpinner /> Resetting…</> : 'Reset password and sign in'}
                        </button>
                        <button type="button" className={styles.resendBtn} onClick={() => { setStep('email'); setCode(''); setError(''); }}>
                            Use a different email or send a new code
                        </button>
                    </form>
                )}

                <Link to="/login" className={styles.backLink}>
                    ← Back to sign in
                </Link>
            </div>
        </div>
    );
}
