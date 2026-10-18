import { useState, useEffect, type FormEvent } from 'react';
import { useMutation, useQuery } from 'convex/react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/convex/api';
import { errorMessage } from '@/convex/client';
import LoadSamplesButton from '@/components/LoadSamplesButton';
import { useAssistantStatus } from '@/hooks/useAssistantStatus';
import styles from './SettingsPage.module.css';

const SPECIALTIES = ['Internal Medicine', 'Family Medicine', 'Cardiology', 'Neurology', 'Orthopedics', 'Pediatrics', 'Surgery', 'Dermatology', 'Oncology', 'Psychiatry', 'Emergency Medicine', 'Radiology', 'Anesthesiology', 'Other'];

export default function SettingsPage() {
    const { user } = useAuth();
    const assistant = useAssistantStatus();
    const indexed = useQuery(api.functions.rag.stats, {});
    const updateProfile = useMutation(api.functions.users.updateProfile);
    const [editing, setEditing] = useState(false);
    const [name, setName] = useState('');
    const [specialty, setSpecialty] = useState('');
    const [license, setLicense] = useState('');
    const [profileMessage, setProfileMessage] = useState('');

    const startEdit = () => {
        setName(user?.name ?? '');
        setSpecialty(user?.specialty ?? '');
        setLicense(user?.licenseNumber ?? '');
        setProfileMessage('');
        setEditing(true);
    };

    const saveProfile = async (e: FormEvent) => {
        e.preventDefault();
        try {
            await updateProfile({ name, specialty: specialty || undefined, licenseNumber: license || undefined });
            setEditing(false);
            setProfileMessage('Profile updated.');
        } catch (err) {
            setProfileMessage(errorMessage(err));
        }
    };
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
                    {editing ? (
                        <form onSubmit={saveProfile} style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                            <div>
                                <label className="ui-label" htmlFor="profile-name">Full name</label>
                                <input id="profile-name" className="ui-input" value={name} onChange={(e) => setName(e.target.value)} required />
                            </div>
                            <div>
                                <label className="ui-label" htmlFor="profile-specialty">Specialty</label>
                                <select id="profile-specialty" className="ui-input" value={specialty} onChange={(e) => setSpecialty(e.target.value)}>
                                    <option value="">Not specified</option>
                                    {[...new Set([...(specialty ? [specialty] : []), ...SPECIALTIES])].map((s) => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="ui-label" htmlFor="profile-license">License number</label>
                                <input id="profile-license" className="ui-input" value={license} onChange={(e) => setLicense(e.target.value)} />
                            </div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                                <button type="submit" className="ui-btn ui-btn-primary">Save</button>
                                <button type="button" className="ui-btn ui-btn-outline" onClick={() => setEditing(false)}>Cancel</button>
                            </div>
                        </form>
                    ) : (
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, alignItems: 'center', marginBottom: '0.75rem' }}>
                            {profileMessage && <span className="ui-muted">{profileMessage}</span>}
                            <button className="ui-btn ui-btn-outline ui-btn-sm" onClick={startEdit}>Edit profile</button>
                        </div>
                    )}
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

            {/* AI Assistant Section */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>AI Assistant</h2>
                <div className={styles.card}>
                    <div className={styles.detailsGrid}>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Status</span>
                            <span className={styles.detailValue}>
                                {assistant === null ? 'Checking…' : assistant.llmConfigured && assistant.convexConfigured === false
                                    ? <span className="ui-badge ui-badge-amber">Server is missing VITE_CONVEX_URL</span>
                                    : assistant.llmConfigured
                                    ? <span className="ui-badge ui-badge-green">Enabled</span>
                                    : <span className="ui-badge ui-badge-amber">{assistant.unreachable ? 'API not reachable' : 'Not configured'}</span>}
                            </span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Model</span>
                            <span className={styles.detailValue}>{assistant?.model ?? '—'}</span>
                        </div>
                        <div className={styles.detailItem}>
                            <span className={styles.detailLabel}>Indexed for retrieval</span>
                            <span className={styles.detailValue}>
                                {indexed ? `${indexed.patient} record sections · ${indexed.consultation} consultations · ${indexed.document} document chunks` : '—'}
                            </span>
                        </div>
                    </div>
                    {assistant && !assistant.llmConfigured && (
                        <div className="ui-alert ui-alert-info" style={{ marginTop: '1rem' }}>
                            <span>
                                To activate it, add an Anthropic API key in Vercel: <strong>Project &rarr; Settings &rarr; Environment Variables</strong>, name{' '}
                                <code>ANTHROPIC_API_KEY</code>, for Production and Preview, then redeploy. Optional: <code>ANTHROPIC_MODEL</code> (default{' '}
                                <code>claude-opus-5-5</code>) and <code>ANTHROPIC_EFFORT</code> (<code>low</code>, <code>medium</code> or <code>high</code>; default{' '}
                                <code>medium</code>). The key stays on the server and is never sent to the browser.
                            </span>
                        </div>
                    )}
                </div>
            </section>

            {/* Data Section */}
            <section className={styles.section}>
                <h2 className={styles.sectionTitle}>Sample data</h2>
                <div className={styles.card}>
                    <p className="ui-muted" style={{ marginBottom: '0.75rem' }}>
                        20 fictional patients with full records (medications, allergies, vitals, labs, visit history) and a week of appointments
                        around today. Loading again refreshes them in place; patients you created yourself are not touched unless they have the same name as a sample patient.
                    </p>
                    <LoadSamplesButton />
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
