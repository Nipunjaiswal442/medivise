export interface MedicineAdvice {
  id: string;
  name: string;
  description?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  contraindications?: string;
  /** How commonly the medicine is used for the condition (from the seed data), 0-100. */
  confidence: number;
}

export interface PredictionResult {
  predictionId: string;
  /** "ml-service" when the Python service answered, "knowledge-base" for the built-in scorer. */
  source: string;
  disease: {
    id: string;
    name: string;
    /** Symptom-match score 0-100. Not a calibrated probability. */
    confidence: number;
  };
  allPredictions: Array<{
    diseaseId: string;
    diseaseName: string;
    confidence: number;
  }>;
  medicines: MedicineAdvice[];
  matchedSymptoms: string[];
  /** Entered symptoms the knowledge base did not recognise (they did not influence the result). */
  unmatchedSymptoms: string[];
}

export interface PredictionRecord {
  id: string;
  patientId?: string;
  diseaseName: string;
  confidence: number;
  symptoms: string[];
  source: string;
  createdAt: number;
}

export interface HealthPredictionRequest {
  symptoms: string[];
  age: number;
  gender: string;
}
