import { useState, useEffect, type FormEvent } from 'react';
import { getSavedPatients, type SavedPatient } from '@/stores/patientStore';
import styles from './PatientsPage.module.css';

interface PatientRecord {
    id: string;
    name: string;
    age: number;
    gender: string;
    condition: string;
    lastVisit: string;
    status: 'active' | 'discharged' | 'scheduled';
    isFromConsultation?: boolean;
    symptoms?: SavedPatient['symptoms'];
    prescriptions?: SavedPatient['prescriptions'];
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
    const [allPatients, setAllPatients] = useState<PatientRecord[]>([]);
    const [selectedPatient, setSelectedPatient] = useState<PatientRecord | null>(null);

    // Load saved patients from localStorage on mount
    useEffect(() => {
        const saved = getSavedPatients();
        const savedAsRecords: PatientRecord[] = saved.map((p) => ({
            id: p.id,
            name: p.name,
            age: p.age,
            gender: p.gender,
            condition: p.condition,
            lastVisit: p.lastVisit,
            status: p.status,
            isFromConsultation: true,
            symptoms: p.symptoms,
            prescriptions: p.prescriptions,
        }));
        // Merge: saved patients first (newest), then sample data
        setAllPatients([...savedAsRecords, ...SAMPLE_PATIENTS]);
    }, []);

    const handleSearch = (e: FormEvent) => {
        e.preventDefault();
        const q = query.trim().toLowerCase();
        if (!q) {
            setResults(allPatients);
        } else {
            setResults(
                allPatients.filter(
                    (p) =>
                        p.name.toLowerCase().includes(q) ||
                        p.id.toLowerCase().includes(q) ||
                        p.condition.toLowerCase().includes(q),
                ),
            );
        }
        setHasSearched(true);
    };

    const handleInputChange = (value: string) => {
        setQuery(value);
        if (value.trim() === '') {
            setHasSearched(false);
            setResults([]);
            setSelectedPatient(null);
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
                            onClick={() => { setQuery(''); setHasSearched(false); setResults([]); setSelectedPatient(null); }}
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
                        Patients from consultations are automatically saved here.
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
                            <div
                                key={patient.id}
                                className={styles.tableRow + (patient.isFromConsultation ? ' ' + styles.consultationRow : '') + (selectedPatient?.id === patient.id ? ' ' + styles.selectedRow : '')}
                                onClick={() => setSelectedPatient(selectedPatient?.id === patient.id ? null : patient)}
                                style={{ cursor: patient.isFromConsultation ? 'pointer' : 'default' }}
                            >
                                <span className={styles.cellId}>
                                    {patient.id}
                                    {patient.isFromConsultation && <span className={styles.newBadge}>NEW</span>}
                                </span>
                                <span className={styles.cellName}>{patient.name}</span>
                                <span className={styles.cellMeta}>{patient.age} / {patient.gender}</span>
                                <span className={styles.cellCondition}>{patient.condition}</span>
                                <span className={styles.cellDate}>{patient.lastVisit}</span>
                                <span>
                                    <span className={styles.statusBadge + ' ' + getStatusClass(patient.status)}>
                                        {patient.status.charAt(0).toUpperCase() + patient.status.slice(1)}
                                    </span>
                                </span>
                            </div>
                        ))}
                    </div>

                    {/* Detail panel for consultation patients */}
                    {selectedPatient && selectedPatient.isFromConsultation && (
                        <div className={styles.detailPanel}>
                            <h3 className={styles.detailTitle}>
                                Consultation Details — {selectedPatient.name} ({selectedPatient.id})
                            </h3>
                            <div className={styles.detailGrid}>
                                <div className={styles.detailCard}>
                                    <h4>Symptoms</h4>
                                    {selectedPatient.symptoms && selectedPatient.symptoms.length > 0 ? (
                                        <ul className={styles.detailList}>
                                            {selectedPatient.symptoms.map((s, i) => (
                                                <li key={i}>
                                                    <strong>{s.name}</strong>
                                                    {s.days && <span> — {s.days} day{s.days !== '1' ? 's' : ''}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className={styles.detailEmpty}>No symptoms recorded</p>
                                    )}
                                </div>
                                <div className={styles.detailCard}>
                                    <h4>Prescriptions</h4>
                                    {selectedPatient.prescriptions && selectedPatient.prescriptions.length > 0 ? (
                                        <ul className={styles.detailList}>
                                            {selectedPatient.prescriptions.map((p, i) => (
                                                <li key={i}>
                                                    <strong>{p.name}</strong>
                                                    {p.dosage && <span> — {p.dosage}</span>}
                                                    {p.timesPerDay && <span>, {p.timesPerDay}x/day</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    ) : (
                                        <p className={styles.detailEmpty}>No prescriptions recorded</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
