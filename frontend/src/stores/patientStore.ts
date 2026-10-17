import { getConvex } from '@/convex/client';
import { fn } from '@/convex/functions';

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
    customId?: string;
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
        const patients = await getConvex().query(fn.getPatients, {});
        return patients.map((p) => ({
            id: p._id,
            customId: p.customId,
            name: p.name,
            age: p.age,
            gender: p.gender,
            condition: p.condition,
            lastVisit: p.lastVisit,
            status: p.status,
            consultationDuration: p.consultationDuration,
            symptoms: p.symptoms,
            prescriptions: p.prescriptions,
            aiReview: p.aiReview ?? '',
            createdAt: new Date(p._creationTime).toISOString(),
        }));
    } catch (err) {
        console.error('Failed to fetch patients:', err);
        return [];
    }
}

/** Saves a patient and returns its display ID (P-001, P-002, ...). */
export async function savePatient(patient: Omit<SavedPatient, 'id' | 'createdAt'>): Promise<string> {
    try {
        const { customId } = await getConvex().mutation(fn.createPatient, {
            name: patient.name,
            age: patient.age,
            gender: patient.gender,
            condition: patient.condition,
            lastVisit: patient.lastVisit,
            status: patient.status,
            consultationDuration: patient.consultationDuration,
            symptoms: patient.symptoms,
            prescriptions: patient.prescriptions,
            aiReview: patient.aiReview,
        });
        return customId;
    } catch (err) {
        console.error('Failed to save patient:', err);
        throw err;
    }
}

export async function deletePatient(id: string): Promise<void> {
    try {
        await getConvex().mutation(fn.deletePatient, { id });
    } catch (err) {
        console.error('Failed to delete patient:', err);
        throw err;
    }
}
