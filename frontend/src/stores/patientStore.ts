import { convex } from "@/convex/client";

const callQuery = (path: string, args: any) =>
  convex.query(path as any, args);

const callMutation = (path: string, args: any) =>
  convex.mutation(path as any, args);

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
        const patients = await callQuery("functions/patients.getPatients", {});
        return patients.map((p: any) => ({
            id: p._id,
            customId: p.customId,
            name: p.name,
            age: p.age,
            gender: p.gender,
            condition: p.condition,
            lastVisit: p.lastVisit,
            status: p.status,
            consultationDuration: p.consultationDuration,
            symptoms: p.symptoms || [],
            prescriptions: p.prescriptions || [],
            aiReview: p.aiReview || "",
            createdAt: new Date(p.createdAt || 0).toISOString(),
        }));
    } catch (err) {
        console.error('Failed to fetch patients:', err);
        return [];
    }
}

export async function savePatient(patient: Omit<SavedPatient, 'id' | 'createdAt'>): Promise<string> {
    try {
        const res: any = await callMutation("functions/patients.createPatient", {
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
        return res._id;
    } catch (err) {
        console.error('Failed to save patient:', err);
        throw err;
    }
}

export async function deletePatient(id: string): Promise<void> {
    try {
        await callMutation("functions/patients.deletePatient", { id });
    } catch (err) {
        console.error('Failed to delete patient:', err);
        throw err;
    }
}
