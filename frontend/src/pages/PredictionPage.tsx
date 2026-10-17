import { useState, FormEvent } from "react";
import { healthService, type HealthPredictionRequest, type PredictionResult } from "@/services/health.service";
import { errorMessage } from "@/convex/client";
import { SparklesIcon, StethoscopeIcon, AlertTriangleIcon } from "@/components/ui/Icons";
import styles from "./PredictionPage.module.css";

export default function PredictionPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<PredictionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [symptoms, setSymptoms] = useState<string[]>([""]);
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("Male");
  const [patientName, setPatientName] = useState("");

  const COMMON_SYMPTOMS = [
    "Fever", "Cough", "Shortness of breath", "Chest pain", "Fatigue",
    "Headache", "Nausea", "Vomiting", "Diarrhea", "Abdominal pain",
    "Sore throat", "Runny nose", "Nasal congestion", "Sneezing",
    "Body aches", "Joint pain", "Muscle weakness", "Dizziness",
    "Rash", "Itching", "Swelling", "Weight loss", "Weight gain",
    "Increased thirst", "Frequent urination", "Painful urination",
    "Back pain", "Neck pain", "Blurred vision", "Hearing loss",
    "Hoarseness", "Difficulty swallowing", "Heartburn", "Bloating",
    "Jaundice", "Pale skin", "Night sweats", "Insomnia",
    "Memory loss", "Confusion", "Anxiety", "Depression",
    "Irritability", "Tremors", "Numbness", "Tingling", "Weakness",
    "Palpitations", "Swollen ankles", "Wheezing", "Snoring",
  ];

  const handleSymptomChange = (index: number, value: string) => {
    const next = [...symptoms];
    next[index] = value;
    setSymptoms(next);
  };

  const addSymptom = () => setSymptoms([...symptoms, ""]);

  const removeSymptom = (index: number) => {
    if (symptoms.length > 1) {
      setSymptoms(symptoms.filter((_, i) => i !== index));
    }
  };

  const handleSelectSymptom = (symptom: string) => {
    const filled = symptoms.filter((s) => s.trim());
    setSymptoms([...filled, symptom]);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);
    setIsLoading(true);

    const filledSymptoms = symptoms.filter((s) => s.trim());
    if (filledSymptoms.length === 0) {
      setError("Please enter at least one symptom.");
      setIsLoading(false);
      return;
    }

    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 0 || ageNum > 120) {
      setError("Please enter a valid age (0-120).");
      setIsLoading(false);
      return;
    }

    try {
      const request: HealthPredictionRequest = {
        symptoms: filledSymptoms,
        age: ageNum,
        gender,
      };
      const res = await healthService.predictHealth(request);
      setResult(res);
    } catch (err) {
      setError(errorMessage(err, "Prediction failed. Please try again."));
    } finally {
      setIsLoading(false);
    }
  };

  const confidenceColor = (conf: number) => {
    if (conf >= 70) return "#16A34A";
    if (conf >= 40) return "#CA8A04";
    return "#DC2626";
  };

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <div className={styles.headerContent}>
          <StethoscopeIcon size={32} className={styles.headerIcon} />
          <div>
            <h1 className={styles.title}>Health Prediction</h1>
            <p className={styles.subtitle}>
              Enter patient symptoms to get AI-powered disease prediction
              and medicine advice with confidence scores.
            </p>
          </div>
        </div>
      </header>

      {error && (
        <div className={styles.errorAlert}>
          <AlertTriangleIcon size={16} />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className={styles.formCard}>
        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Patient Information</h2>
          <div className={styles.formGrid}>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Patient Name</label>
              <input
                type="text"
                placeholder="Patient name"
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                className={styles.input}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Age</label>
              <input
                type="number"
                min={0}
                max={120}
                placeholder="Age"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className={styles.input}
              />
            </div>
            <div className={styles.fieldGroup}>
              <label className={styles.fieldLabel}>Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className={styles.input}
              >
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>
        </div>

        <div className={styles.formSection}>
          <h2 className={styles.sectionTitle}>Symptoms</h2>
          <p className={styles.sectionHint}>
            Select or type symptoms.
          </p>

          <div className={styles.symptomChips}>
            {COMMON_SYMPTOMS.map((s) => (
              <button
                key={s}
                type="button"
                className={styles.chip}
                onClick={() => handleSelectSymptom(s)}
              >
                {s}
              </button>
            ))}
          </div>

          <div className={styles.symptomList}>
            {symptoms.map((symptom, index) => (
              <div key={index} className={styles.symptomRow}>
                <input
                  type="text"
                  placeholder={`Symptom ${index + 1} (e.g. Headache)`}
                  value={symptom}
                  onChange={(e) => handleSymptomChange(index, e.target.value)}
                  className={styles.symptomInput}
                />
                <button
                  type="button"
                  className={styles.removeBtn}
                  onClick={() => removeSymptom(index)}
                  aria-label={`Remove symptom ${index + 1}`}
                >
                  &times;
                </button>
              </div>
            ))}
            <button
              type="button"
              className={styles.addBtn}
              onClick={addSymptom}
            >
              + Add Symptom
            </button>
          </div>
        </div>

        <div className={styles.formActions}>
          <button
            type="submit"
            disabled={isLoading}
            className={styles.predictBtn}
          >
            {isLoading ? (
              <>
                <span className={styles.spinner} />
                Analyzing…
              </>
            ) : (
              <>
                <SparklesIcon size={16} />
                Generate Prediction
              </>
            )}
          </button>
        </div>
      </form>

      {result && (
        <div className={styles.resultsCard}>
          <div className={styles.resultsHeader}>
            <h2 className={styles.resultsTitle}>Prediction Results</h2>
            <p className={styles.patientInfo}>
              {patientName || "Patient"} &bull; {age} years &bull; {gender}
            </p>
          </div>

          {result.unmatchedSymptoms.length > 0 && (
            <p className={styles.confidenceText}>
              Not recognised, so ignored: {result.unmatchedSymptoms.join(", ")}
            </p>
          )}

          <div className={styles.primaryPrediction}>
            <div className={styles.diseaseBadge}>
              <span className={styles.diseaseName}>{result.disease.name}</span>
              <span className={styles.confidenceBadge} style={{ backgroundColor: confidenceColor(result.disease.confidence) }}>
                {result.disease.confidence}%
              </span>
            </div>
            <p className={styles.confidenceText}>
              Confidence: {result.disease.confidence}%
            </p>
            <div className={styles.confidenceBar}>
              <div
                className={styles.confidenceFill}
                style={{ width: `${result.disease.confidence}%`, backgroundColor: confidenceColor(result.disease.confidence) }}
              />
            </div>
          </div>

          <div className={styles.allPredictions}>
            <h3 className={styles.subsectionTitle}>All Predictions</h3>
            <div className={styles.predictionsList}>
              {result.allPredictions.map((p: { diseaseName: string; diseaseId: string; confidence: number }, i: number) => (
                <div key={i} className={styles.predictionItem}>
                  <span className={styles.predictionDisease}>{p.diseaseName || p.diseaseId}</span>
                  <span className={styles.predictionConfidence}>{p.confidence}%</span>
                  <div className={styles.miniConfidenceBar}>
                    <div
                      className={styles.miniConfidenceFill}
                      style={{ width: `${p.confidence}%`, backgroundColor: confidenceColor(p.confidence) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.medicineAdvice}>
            <h3 className={styles.subsectionTitle}>Recommended Medicines</h3>
            <p className={styles.medicineDisclaimer}>
              Confidence scores indicate how commonly each medicine is used for
              this condition. Always consult a licensed physician before
              starting any medication.
            </p>
            <div className={styles.medicineList}>
              {result.medicines.map((med: { name: string; confidence: number; dosage?: string; frequency?: string; duration?: string; contraindications?: string }, i: number) => (
                <div key={i} className={styles.medicineItem}>
                  <div className={styles.medicineInfo}>
                    <span className={styles.medicineName}>{med.name}</span>
                    <span className={styles.medicineConfidence} style={{ backgroundColor: confidenceColor(med.confidence) }}>
                      {med.confidence}%
                    </span>
                  </div>
                  <div className={styles.medicineDetails}>
                    {med.dosage && <span className={styles.detailChip}>Dosage: {med.dosage}</span>}
                    {med.frequency && <span className={styles.detailChip}>Frequency: {med.frequency}</span>}
                    {med.duration && <span className={styles.detailChip}>Duration: {med.duration}</span>}
                    {med.contraindications && (
                      <span className={styles.detailChip + " " + styles.detailWarning}>
                        ! {med.contraindications}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {result.medicines.length === 0 && (
                <p className={styles.noMedicines}>
                  No specific medicine recommendations available for this
                  condition. Please consult a physician.
                </p>
              )}
            </div>
          </div>

          <div className={styles.medicalDisclaimer}>
            <AlertTriangleIcon size={16} />
            <p>
              <strong>Medical Disclaimer:</strong> Scores are symptom-match
              estimates from a demonstration knowledge base, not calibrated
              probabilities, and age and gender are not yet used. This is not a
              diagnosis and is no substitute for professional medical advice,
              diagnosis, or treatment. A qualified clinician must verify every
              suggestion.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
