import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { EmailIcon, AlertCircleIcon } from '@/components/ui/Icons';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import styles from './ForgotPasswordPage.module.css';

export default function ForgotPasswordPage() {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!email) {
            setError('Email address is required');
            return;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Enter a valid email address');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            await resetPassword(email);
            setSent(true);
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code ?? '';
            let message: string;
            switch (code) {
                case 'auth/user-not-found':
                    // Don't reveal if account exists — just show success
                    setSent(true);
                    return;
                case 'auth/too-many-requests':
                    message = 'Too many requests. Please try again later.';
                    break;
                default:
                    message = 'Failed to send reset email. Please try again.';
            }
            setError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (sent) {
        return (
            <div className={styles.root}>
                <div className={styles.card}>
                    <div className={styles.sentIcon}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <rect width="20" height="16" x="2" y="4" rx="2" />
                            <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                    </div>
                    <h2 className={styles.sentTitle}>Check your email</h2>
                    <p className={styles.sentText}>
                        We've sent a password reset link to <strong>{email}</strong>. Check your inbox and follow the instructions to reset your password.
                    </p>
                    <p className={styles.sentNote}>
                        Didn't receive the email? Check your spam folder or{' '}
                        <button
                            className={styles.resendBtn}
                            onClick={() => { setSent(false); setEmail(''); }}
                        >
                            try again
                        </button>
                    </p>
                    <Link to="/login" className={styles.backLink}>
                        ← Back to sign in
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.root}>
            <div className={styles.card}>
                {/* Logo */}
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
                    <h2 className={styles.title}>Forgot your password?</h2>
                    <p className={styles.subtitle}>
                        Enter the email address associated with your account and we'll send you a link to reset your password.
                    </p>
                </header>

                {error && (
                    <div className={styles.alert} role="alert">
                        <AlertCircleIcon />
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate className={styles.form}>
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
                        {isSubmitting ? (
                            <>
                                <InlineSpinner />
                                Sending…
                            </>
                        ) : (
                            'Send Reset Link'
                        )}
                    </button>
                </form>

                <Link to="/login" className={styles.backLink}>
                    ← Back to sign in
                </Link>
            </div>
        </div>
    );
}
