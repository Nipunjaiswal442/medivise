import { useState, type FormEvent } from 'react';
import styles from './PatientsPage.module.css';

interface PatientRecord {
    id: string;
    name: string;
    age: number;
    gender: string;
    condition: string;
    lastVisit: string;
    status: 'active' | 'discharged' | 'scheduled';
}

// Sample patient data
const SAMPLE_PATIENTS: PatientRecord[] = [
    { id: 'P-001', name: 'John Anderson', age: 54, gender: 'Male', condition: 'Hypertension', lastVisit: '2026-03-10', status: 'active' },
    { id: 'P-002', name: 'Maria Garcia', age: 38, gender: 'Female', condition: 'Type 2 Diabetes', lastVisit: '2026-03-09', status: 'active' },
    { id: 'P-003', name: 'Robert Chen', age: 67, gender: 'Male', condition: 'Coronary Artery Disease', lastVisit: '2026-03-08', status: 'scheduled' },
    { id: 'P-004', name: 'Emily Johnson', age: 29, gender: 'Female', condition: 'Asthma', lastVisit: '2026-03-07', status: 'active' },
    { id: 'P-005', name: 'James Williams', age: 72, gender: 'Male', condition: 'COPD', lastVisit: '2026-03-05', status: 'discharged' },
    { id: 'P-006', name: 'Sarah Thompson', age: 45, gender: 'Female', condition: 'Rheumatoid Arthritis', lastVisit: '2026-03-04', status: 'active' },
    { id: 'P-007', name: 'Michael Davis', age: 61, gender: 'Male', condition: 'Atrial Fibrillation', lastVisit: '2026-03-03', status: 'scheduled' },
    { id: 'P-008', name: 'Lisa Brown', age: 33, gender: 'Female', condition: 'Migraine', lastVisit: '2026-03-01', status: 'discharged' },
];

export default function PatientsPage() {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<PatientRecord[]>([]);
    const [hasSearched, setHasSearched] = useState(false);

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        const q = query.trim().toLowerCase();
        if (!q) {
            setResults(SAMPLE_PATIENTS);
        } else {
            setResults(
                SAMPLE_PATIENTS.filter(
                    (p) =>
                        p.name.toLowerCase().includes(q) ||
                        p.id.toLowerCase().includes(q) ||
                        p.condition.toLowerCase().includes(q)
                )
            );
        }
        setHasSearched(true);
    };

    const handleInputChange = (value: string) => {
        setQuery(value);
        if (value.trim() === '') {
            setHasSearched(false);
            setResults([]);
        }
    };

    const getStatusClass = (status: string) => {
        switch (status) {
            case 'active': return styles.statusActive;
            case 'discharged': return styles.statusDischarged;
            case 'scheduled': return styles.statusScheduled;
            default: return '';
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.pageHeader}>
                <h1 className={styles.title}>Patient Search</h1>
                <p className={styles.subtitle}>
                    Search for patients by name, ID, or medical condition
                </p>
            </header>

            {/* Search bar */}
            <form onSubmit={handleSearch} className={styles.searchForm}>
                <div className={styles.searchWrapper}>
                    <svg
                        className={styles.searchIcon}
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <circle cx="11" cy="11" r="8" />
                        <line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        type="text"
                        id="patient-search"
                        className={styles.searchInput}
                        placeholder="Search by name, patient ID, or condition..."
                        value={query}
                        onChange={(e) => handleInputChange(e.target.value)}
                        autoFocus
                    />
                    {query && (
                        <button
                            type="button"
                            className={styles.clearBtn}
                            onClick={() => { setQuery(''); setHasSearched(false); setResults([]); }}
                            aria-label="Clear search"
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>
                <button type="submit" className={styles.searchBtn}>
                    Search
                </button>
            </form>

            {/* Results */}
            {!hasSearched && (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="11" cy="11" r="8" />
                            <line x1="21" y1="21" x2="16.65" y2="16.65" />
                        </svg>
                    </div>
                    <h3 className={styles.emptyTitle}>Search for a patient</h3>
                    <p className={styles.emptyHint}>
                        Enter a patient's name, ID (e.g. P-001), or medical condition to find their records.
                    </p>
                </div>
            )}

            {hasSearched && results.length === 0 && (
                <div className={styles.emptyState}>
                    <div className={styles.emptyIcon}>
                        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="12" />
                            <line x1="12" y1="16" x2="12.01" y2="16" />
                        </svg>
                    </div>
                    <h3 className={styles.emptyTitle}>No patients found</h3>
                    <p className={styles.emptyHint}>
                        No records match <strong>"{query}"</strong>. Try a different search term.
                    </p>
                </div>
            )}

            {hasSearched && results.length > 0 && (
                <div className={styles.resultsSection}>
                    <p className={styles.resultCount}>
                        {results.length} patient{results.length !== 1 ? 's' : ''} found
                    </p>
                    <div className={styles.resultsTable}>
                        <div className={styles.tableHeader}>
                            <span>ID</span>
                            <span>Patient Name</span>
                            <span>Age / Gender</span>
                            <span>Condition</span>
                            <span>Last Visit</span>
                            <span>Status</span>
                        </div>
                        {results.map((patient) => (
                            <div key={patient.id} className={styles.tableRow}>
                                <span className={styles.cellId}>{patient.id}</span>
                                <span className={styles.cellName}>{patient.name}</span>
                                <span className={styles.cellMeta}>{patient.age} / {patient.gender}</span>
                                <span className={styles.cellCondition}>{patient.condition}</span>
                                <span className={styles.cellDate}>{patient.lastVisit}</span>
                                <span>
                                    <span className={`${styles.statusBadge} ${getStatusClass(patient.status)}`}>
                                        {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}
