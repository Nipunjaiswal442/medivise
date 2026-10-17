import { makeFunctionReference } from 'convex/server';
import type { PredictionRecord, PredictionResult } from '@/types/health';

type Role = 'physician' | 'nurse' | 'admin' | 'pharmacist';
type Status = 'active' | 'discharged' | 'scheduled';
type SymptomEntry = { name: string; days: string };
type PrescriptionEntry = { name: string; timesPerDay: string; dosage: string };

export interface ServerUser {
  _id: string;
  firebaseUid: string;
  email: string;
  name: string;
  role: Role;
  specialty?: string;
  licenseNumber?: string;
}

export interface ServerPatient {
  _id: string;
  _creationTime: number;
  customId: string;
  name: string;
  age: number;
  gender: string;
  condition: string;
  lastVisit: string;
  status: Status;
  consultationDuration: number;
  symptoms: SymptomEntry[];
  prescriptions: PrescriptionEntry[];
  aiReview?: string;
}

export type CreatePatientArgs = Omit<ServerPatient, '_id' | '_creationTime' | 'customId'>;

/**
 * Typed references to the functions in /convex. (The generated `api` object lives outside the
 * frontend package, which Vercel builds on its own, so the names are spelled out here.
 * Format: "<file under convex/>:<export>".)
 */
export const fn = {
  getCurrentUser: makeFunctionReference<'query', Record<string, never>, ServerUser | null>(
    'functions/auth:getCurrentUser',
  ),
  upsertCurrentUser: makeFunctionReference<
    'mutation',
    { name: string; role: Role; specialty?: string; licenseNumber?: string },
    string
  >('functions/auth:upsertCurrentUser'),
  getPatients: makeFunctionReference<'query', Record<string, never>, ServerPatient[]>(
    'functions/patients:getPatients',
  ),
  createPatient: makeFunctionReference<
    'mutation',
    CreatePatientArgs,
    { id: string; customId: string }
  >('functions/patients:createPatient'),
  deletePatient: makeFunctionReference<'mutation', { id: string }, { success: boolean }>(
    'functions/patients:deletePatient',
  ),
  predictHealth: makeFunctionReference<
    'action',
    { patientId?: string; symptoms: string[]; age: number; gender: string },
    PredictionResult
  >('functions/predict:predictHealth'),
  getPredictions: makeFunctionReference<'query', Record<string, never>, PredictionRecord[]>(
    'functions/predict:getPredictions',
  ),
};
