import { useState, type FormEvent, type ChangeEvent } from 'react';
import { Link } from 'react-router-dom';
import {
    EmailIcon,
    LockIcon,
    EyeIcon,
    EyeOffIcon,
    AlertCircleIcon,
} from '@/components/ui/Icons';
import { InlineSpinner } from '@/components/ui/Spinner';
import { useAuth } from '@/context/AuthContext';
import styles from './SignupPage.module.css';

interface SignupForm {
    name: string;
    email: string;
    password: string;
    confirmPassword: string;
    specialty: string;
    licenseNumber: string;
    role: string;
}

interface FormErrors {
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    specialty?: string;
    licenseNumber?: string;
    general?: string;
}

const ROLES = [
    { value: 'physician', label: 'Physician' },
    { value: 'nurse', label: 'Nurse' },
    { value: 'pharmacist', label: 'Pharmacist' },
    { value: 'admin', label: 'Administrator' },
];

const SPECIALTIES = [
    'Internal Medicine',
    'Cardiology',
    'Neurology',
    'Orthopedics',
    'Pediatrics',
    'Surgery',
    'Dermatology',
    'Oncology',
    'Psychiatry',
    'Emergency Medicine',
    'Radiology',
    'Anesthesiology',
    'Other',
];

export default function SignupPage() {
    const { signup } = useAuth();
    const [form, setForm] = useState<SignupForm>({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        specialty: '',
        licenseNumber: '',
        role: 'physician',
    });
    const [errors, setErrors] = useState<FormErrors>({});
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);

    const validate = (): boolean => {
        const next: FormErrors = {};
        if (!form.name.trim()) next.name = 'Full name is required';
        if (!form.email) {
            next.email = 'Email address is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            next.email = 'Enter a valid email address';
        }
        if (!form.password) {
            next.password = 'Password is required';
        } else if (form.password.length < 8) {
            next.password = 'Password must be at least 8 characters';
        } else if (!/(?=.*[A-Z])(?=.*[0-9])(?=.*[!@#$%^&*])/.test(form.password)) {
            next.password = 'Must include uppercase, number, and special character';
        }
        if (form.password !== form.confirmPassword) {
            next.confirmPassword = 'Passwords do not match';
        }
        if (!form.specialty) next.specialty = 'Please select a specialty';
        if (!form.licenseNumber.trim()) next.licenseNumber = 'License number is required';
        setErrors(next);
        return Object.keys(next).length === 0;
    };

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
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
            await signup({
                name: form.name,
                email: form.email,
                password: form.password,
                role: form.role,
                specialty: form.specialty,
                licenseNumber: form.licenseNumber,
            });
            setSuccess(true);
        } catch (err: unknown) {
            const code = (err as { code?: string })?.code ?? '';
            let message: string;
            switch (code) {
                case 'auth/email-already-in-use':
                    message = 'An account with this email already exists.';
                    break;
                case 'auth/weak-password':
                    message = 'Password is too weak. Use at least 6 characters.';
                    break;
                case 'auth/invalid-email':
                    message = 'Invalid email address.';
                    break;
                default:
                    message = 'Registration failed. Please try again.';
            }
            setErrors({ general: message });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className={styles.root}>
                <div className={styles.successCard}>
                    <div className={styles.successIcon}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#16A34A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                            <polyline points="22 4 12 14.01 9 11.01" />
                        </svg>
                    </div>
                    <h2 className={styles.successTitle}>Account Created!</h2>
                    <p className={styles.successText}>
                        Your Medivise account has been created successfully. You can now sign in with your credentials.
                    </p>
                    <Link to="/login" className={styles.successBtn}>
                        Sign in to Medivise
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.root}>
            <div className={styles.formCard}>
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

                <header className={styles.formHeader}>
                    <h2 className={styles.formTitle}>Create your account</h2>
                    <p className={styles.formSubtitle}>
                        Join Medivise to access clinical decision support tools
                    </p>
                </header>

                {errors.general && (
                    <div className={styles.alert} role="alert">
                        <AlertCircleIcon />
                        <span>{errors.general}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate className={styles.form}>
                    {/* Name */}
                    <div className={styles.field}>
                        <label htmlFor="name" className={styles.label}>Full Name</label>
                        <div className={`${styles.inputWrapper} ${errors.name ? styles.inputError : ''}`}>
                            <span className={styles.inputIcon}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                    <circle cx="12" cy="7" r="4" />
                                </svg>
                            </span>
                            <input
                                id="name"
                                type="text"
                                name="name"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Dr. Jane Doe"
                                autoComplete="name"
                                autoFocus
                                className={styles.input}
                            />
                        </div>
                        {errors.name && <span className={styles.fieldError}>{errors.name}</span>}
                    </div>

                    {/* Email */}
                    <div className={styles.field}>
                        <label htmlFor="signup-email" className={styles.label}>Email Address</label>
                        <div className={`${styles.inputWrapper} ${errors.email ? styles.inputError : ''}`}>
                            <span className={styles.inputIcon}><EmailIcon /></span>
                            <input
                                id="signup-email"
                                type="email"
                                name="email"
                                value={form.email}
                                onChange={handleChange}
                                placeholder="you@hospital.com"
                                autoComplete="email"
                                className={styles.input}
                            />
                        </div>
                        {errors.email && <span className={styles.fieldError}>{errors.email}</span>}
                    </div>

                    {/* Role & Specialty side-by-side */}
                    <div className={styles.fieldRow}>
                        <div className={styles.field}>
                            <label htmlFor="role" className={styles.label}>Role</label>
                            <select
                                id="role"
                                name="role"
                                value={form.role}
                                onChange={handleChange}
                                className={styles.select}
                            >
                                {ROLES.map(({ value, label }) => (
                                    <option key={value} value={value}>{label}</option>
                                ))}
                            </select>
                        </div>
                        <div className={styles.field}>
                            <label htmlFor="specialty" className={styles.label}>Specialty</label>
                            <select
                                id="specialty"
                                name="specialty"
                                value={form.specialty}
                                onChange={handleChange}
                                className={`${styles.select} ${errors.specialty ? styles.selectError : ''}`}
                            >
                                <option value="">Select specialty</option>
                                {SPECIALTIES.map((s) => (
                                    <option key={s} value={s}>{s}</option>
                                ))}
                            </select>
                            {errors.specialty && <span className={styles.fieldError}>{errors.specialty}</span>}
                        </div>
                    </div>

                    {/* License Number */}
                    <div className={styles.field}>
                        <label htmlFor="licenseNumber" className={styles.label}>Medical License Number</label>
                        <div className={`${styles.inputWrapper} ${errors.licenseNumber ? styles.inputError : ''}`}>
                            <span className={styles.inputIcon}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <rect width="18" height="18" x="3" y="3" rx="2" />
                                    <path d="M3 9h18" />
                                    <path d="M9 21V9" />
                                </svg>
                            </span>
                            <input
                                id="licenseNumber"
                                type="text"
                                name="licenseNumber"
                                value={form.licenseNumber}
                                onChange={handleChange}
                                placeholder="MD-12345"
                                className={styles.input}
                            />
                        </div>
                        {errors.licenseNumber && <span className={styles.fieldError}>{errors.licenseNumber}</span>}
                    </div>

                    {/* Password */}
                    <div className={styles.field}>
                        <label htmlFor="signup-password" className={styles.label}>Password</label>
                        <div className={`${styles.inputWrapper} ${errors.password ? styles.inputError : ''}`}>
                            <span className={styles.inputIcon}><LockIcon /></span>
                            <input
                                id="signup-password"
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={form.password}
                                onChange={handleChange}
                                placeholder="Minimum 8 characters"
                                autoComplete="new-password"
                                className={styles.input}
                            />
                            <button
                                type="button"
                                className={styles.togglePassword}
                                onClick={() => setShowPassword((p) => !p)}
                            >
                                {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                            </button>
                        </div>
                        {errors.password && <span className={styles.fieldError}>{errors.password}</span>}
                        <span className={styles.fieldHint}>Must include uppercase, number, and special character</span>
                    </div>

                    {/* Confirm Password */}
                    <div className={styles.field}>
                        <label htmlFor="confirmPassword" className={styles.label}>Confirm Password</label>
                        <div className={`${styles.inputWrapper} ${errors.confirmPassword ? styles.inputError : ''}`}>
                            <span className={styles.inputIcon}><LockIcon /></span>
                            <input
                                id="confirmPassword"
                                type={showPassword ? 'text' : 'password'}
                                name="confirmPassword"
                                value={form.confirmPassword}
                                onChange={handleChange}
                                placeholder="Re-enter your password"
                                autoComplete="new-password"
                                className={styles.input}
                            />
                        </div>
                        {errors.confirmPassword && <span className={styles.fieldError}>{errors.confirmPassword}</span>}
                    </div>

                    <button type="submit" disabled={isSubmitting} className={styles.submitBtn}>
                        {isSubmitting ? (
                            <>
                                <InlineSpinner />
                                Creating account…
                            </>
                        ) : (
                            'Create Account'
                        )}
                    </button>
                </form>

                <p className={styles.signinPrompt}>
                    Already have an account?{' '}
                    <Link to="/login" className={styles.signinLink}>Sign in</Link>
                </p>
            </div>
        </div>
    );
}
