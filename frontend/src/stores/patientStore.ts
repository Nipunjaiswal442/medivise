import { apiClient } from '@/api/client';

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
    id: string; // our internal UI id
    customId?: string; // from backend
    name: string;
    age: number;
    gender: string;
    condition: string;
    lastVisit: string;
    status: 'active' | 'discharged' | 'scheduled';
    consultationDuration: number;
    symptoms: ConsultationSymptom[];
    prescriptions: ConsultationPrescription[];
    aiReview: string;
    createdAt?: string;
}

export async function getSavedPatients(): Promise<SavedPatient[]> {
    try {
        const res = await apiClient.get('/api/patients');
        // Map backend _id/customId to id
        return res.data.data.map((p: any) => ({
            ...p,
            id: p.customId || p._id,
        }));
    } catch (err) {
        console.error('Failed to fetch patients:', err);
        return [];
    }
}

export async function savePatient(patient: Omit<SavedPatient, 'id' | 'createdAt'>): Promise<string> {
    try {
        const res = await apiClient.post('/api/patients', patient);
        return res.data.data.customId || res.data.data._id;
    } catch (err) {
        console.error('Failed to save patient:', err);
        throw err;
    }
}

export async function deletePatient(id: string): Promise<void> {
    try {
        await apiClient.delete(`/api/patients/${id}`);
    } catch (err) {
        console.error('Failed to delete patient:', err);
        throw err;
    }
}
