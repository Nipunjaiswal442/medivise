/**
 * Shared patient data store backed by localStorage.
 * Used by ConsultationPage (writes) and PatientsPage (reads).
 */

export interface ConsultationSymptom {
    name: string;
    days: string;
}

export interface ConsultationPrescription {
    name: string;
    timesPerDay: string;
    dosage: string;
}

export interface SavedPatient {
    id: string;
    name: string;
    age: number;
    gender: string;
    condition: string;
    lastVisit: string;
    status: 'active' | 'discharged' | 'scheduled';
    consultationDuration: number; // seconds
    symptoms: ConsultationSymptom[];
    prescriptions: ConsultationPrescription[];
    aiReview: string;
    createdAt: string;
}

const STORAGE_KEY = 'medivise_patients';

/** Read all saved patients from localStorage */
export function getSavedPatients(): SavedPatient[] {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return [];
        return JSON.parse(raw) as SavedPatient[];
    } catch {
        return [];
    }
}

/** Save a new patient record. Returns the generated ID. */
export function savePatient(patient: Omit<SavedPatient, 'id' | 'createdAt'>): string {
    const existing = getSavedPatients();

    // Generate next ID like P-009, P-010, etc.
    const maxNum = existing.reduce((max, p) => {
        const match = p.id.match(/^P-(\d+)$/);
        return match ? Math.max(max, parseInt(match[1], 10)) : max;
    }, 8); // start after P-008 (last sample patient)

    const newId = 'P-' + String(maxNum + 1).padStart(3, '0');

    const record: SavedPatient = {
        ...patient,
        id: newId,
        createdAt: new Date().toISOString(),
    };

    existing.unshift(record); // newest first
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));

    return newId;
}

/** Delete a patient by ID */
export function deletePatient(id: string): void {
    const existing = getSavedPatients().filter((p) => p.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

/** Clear all saved patients */
export function clearAllPatients(): void {
    localStorage.removeItem(STORAGE_KEY);
}
