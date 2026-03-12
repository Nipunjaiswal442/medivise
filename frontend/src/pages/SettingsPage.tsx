import { useState, useEffect } from 'react';
import { useAuth } from '@/context/AuthContext';
import styles from './SettingsPage.module.css';

export default function SettingsPage() {
    const { user } = useAuth();
    const [isDark, setIsDark] = useState(() => {
        return localStorage.getItem('medivise_theme') === 'dark';
    });

    useEffect(() => {
        if (isDark) {
            document.documentElement.setAttribute('data-theme', 'dark');
            localStorage.setItem('medivise_theme', 'dark');
        } else {
            document.documentElement.removeAttribute('data-theme');
            localStorage.setItem('medivise_theme', 'light');
        }
    }, [isDark]);

    const getRoleLabel = (role?: string) => {
        switch (role) {
            case 'physician': return 'Physician';
            case 'nurse': return 'Nurse';
            case 'admin': return 'Administrator';
            case 'pharmacist': return 'Pharmacist';
            default: return role || '—';
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.pageHeader}>
                <h1 className={styles.title}>Settings</h1>
                <p className={styles.subtitle}>Manage your profile and preferences</p>
            </header>

            {/* Profile Section */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Profile</h2>
                <div className={styles.card}>
                    <div className={styles.profileRow}>
                        <div className={styles.avatar}>
                            {user?.name?.charAt(0)?.toUpperCase() || 'U'}
                        </div>
                        <div className={styles.profileInfo}>
                            <h3 className={styles.profileName}>{user?.name || 'Unknown'}</h3>
                            <p className={styles.profileEmail}>{user?.email || '—'}</p>
                        </div>
                    </div>

                    <div className={styles.detailsGrid}>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Full Name</span>
                            <span className={styles.detailValue}>{user?.name || '—'}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Email Address</span>
                            <span className={styles.detailValue}>{user?.email || '—'}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Role</span>
                            <span className={styles.detailValue}>
                                <span className={styles.roleBadge}>
                                    {getRoleLabel(user?.role)}
                                </span>
                            </span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>User ID</span>
                            <span className={styles.detailValue}>{user?.id || '—'}</span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Doctor Details Section */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Doctor Details</h2>
                <div className={styles.card}>
                    <div className={styles.detailsGrid}>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Specialty</span>
                            <span className={styles.detailValue}>
                                {user?.specialty || 'Not specified'}
                            </span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>License Number</span>
                            <span className={styles.detailValue}>
                                {user?.licenseNumber || 'Not specified'}
                            </span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Department</span>
                            <span className={styles.detailValue}>
                                {user?.specialty ? `${user.specialty} Department` : 'Not assigned'}
                            </span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Status</span>
                            <span className={styles.detailValue}>
                                <span className={styles.statusBadge}>Active</span>
                            </span>
                        </div>
                    </div>
                </div>
            </section>

            {/* Appearance Section */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Appearance</h2>
                <div className={styles.card}>
                    <div className={styles.themeRow}>
                        <div className={styles.themeInfo}>
                            <div className={styles.themeLabel}>
                                {isDark ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <circle cx="12" cy="12" r="5" />
                                        <line x1="12" y1="1" x2="12" y2="3" />
                                        <line x1="12" y1="21" x2="12" y2="23" />
                                        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                                        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                                        <line x1="1" y1="12" x2="3" y2="12" />
                                        <line x1="21" y1="12" x2="23" y2="12" />
                                        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                                        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                                    </svg>
                                )}
                                <span>{isDark ? 'Dark Mode' : 'Light Mode'}</span>
                            </div>
                            <p className={styles.themeDescription}>
                                {isDark
                                    ? 'Switch to light mode for a brighter interface'
                                    : 'Switch to dark mode for a darker interface'}
                            </p>
                        </div>
                        <button
                            className={`${styles.themeToggle} ${isDark ? styles.themeToggleActive : ''}`}
                            onClick={() => setIsDark((prev) => !prev)}
                            aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
                        >
                            <span className={styles.themeToggleThumb} />
                        </button>
                    </div>
                </div>
            </section>
        </div>
    );
}
