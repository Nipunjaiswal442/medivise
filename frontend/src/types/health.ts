export interface PredictionResult {
  predictionId: string;
  disease: {
    id: string;
    name: string;
    confidence: number;
  };
  allPredictions: Array<{
    diseaseId: string;
    diseaseName: string;
    confidence: number;
  }>;
  medicines: Array<{
    id: string;
    name: string;
    description?: string;
    dosage?: string;
    frequency?: string;
    duration?: string;
    contraindications?: string;
    confidence: number;
  }>;
}

export interface HealthPredictionRequest {
  patientId: string;
  symptoms: string[];
  age: number;
  gender: string;
}

export interface MedicineAdvice {
  id: string;
  name: string;
  description?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
  contraindications?: string;
  confidence: number;
}

export interface DiseasePrediction {
  diseaseId: string;
  diseaseName: string;
  confidence: number;
  medicines: MedicineAdvice[];
}
