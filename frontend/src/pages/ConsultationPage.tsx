import { useState, useEffect, useCallback } from 'react';
import {
    ClockIcon,
    PlusCircleIcon,
    CameraIcon,
    TrashIcon,
    SparklesIcon,
    AlertTriangleIcon,
    PillIcon,
} from '@/components/ui/Icons';
import { savePatient } from '@/stores/patientStore';
import { healthService, type HealthPredictionRequest, type PredictionResult } from '@/services/health.service';
import { errorMessage } from '@/convex/client';
import styles from './ConsultationPage.module.css';

interface SymptomRow {
    id: string;
    name: string;
    days: string;
}

interface PrescriptionRow {
    id: string;
    name: string;
    timesPerDay: string;
    dosage: string;
}

let uid = 0;
const nextId = () => 'r' + String(++uid);

function fmtTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

export default function ConsultationPage() {
    const [elapsed, setElapsed] = useState(0);
    const [running, setRunning] = useState(false);
    const [patientName, setPatientName] = useState('');
    const [patientId, setPatientId] = useState('');
    const [patientAge, setPatientAge] = useState('');
    const [patientGender, setPatientGender] = useState('Male');

    const [symptoms, setSymptoms] = useState<SymptomRow[]>([
        { id: nextId(), name: '', days: '' },
    ]);

    const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([
        { id: nextId(), name: '', timesPerDay: '', dosage: '' },
    ]);

    const [aiReview, setAiReview] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [predictionResult, setPredictionResult] = useState<PredictionResult | null>(null);
    const [predictionLoading, setPredictionLoading] = useState(false);

    useEffect(() => {
        if (!running) return;
        const id = setInterval(() => setElapsed((p) => p + 1), 1000);
        return () => clearInterval(id);
    }, [running]);

    const startTimer = () => setRunning(true);

    // Save patient data & stop timer
    const stopTimer = () => {
        setRunning(false);
        doSavePatient();
    };

    const doSavePatient = async () => {
        if (!patientName.trim()) {
            setSaveMessage('Please enter a patient name before saving.');
            setTimeout(() => setSaveMessage(''), 3000);
            return;
        }

        const filledSymptoms = symptoms.filter((s) => s.name.trim());
        const condition = filledSymptoms.length > 0
            ? filledSymptoms.map((s) => s.name.trim()).join(', ')
            : 'General Consultation';

        const today = new Date().toISOString().split('T')[0];

        try {
            const newId = await savePatient({
                name: patientName.trim(),
                age: parseInt(patientAge, 10) || 0,
                gender: patientGender,
                condition: condition,
                lastVisit: today,
                status: 'active',
                consultationDuration: elapsed,
                symptoms: filledSymptoms.map((s) => ({ name: s.name, days: s.days })),
                prescriptions: prescriptions
                    .filter((p) => p.name.trim())
                    .map((p) => ({ name: p.name, timesPerDay: p.timesPerDay, dosage: p.dosage })),
                aiReview: aiReview,
            });

            setPatientId(newId);
            setSaveMessage('Patient record saved as ' + newId + '!');
        } catch (error) {
            setSaveMessage('Failed to save patient record.');
        } finally {
            setTimeout(() => setSaveMessage(''), 4000);
        }
    };

    const updateSymptom = useCallback(
        (id: string, field: keyof SymptomRow, value: string) => {
            setSymptoms((prev) =>
                prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
            );
        },
        [],
    );

    const addSymptom = () =>
        setSymptoms((p) => [...p, { id: nextId(), name: '', days: '' }]);

    const removeSymptom = (id: string) =>
        setSymptoms((p) => (p.length > 1 ? p.filter((r) => r.id !== id) : p));

    const updatePrescription = useCallback(
        (id: string, field: keyof PrescriptionRow, value: string) => {
            setPrescriptions((prev) =>
                prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)),
            );
        },
        [],
    );

    const addPrescription = () =>
        setPrescriptions((p) => [
            ...p,
            { id: nextId(), name: '', timesPerDay: '', dosage: '' },
        ]);

    const removePrescription = (id: string) =>
        setPrescriptions((p) =>
            p.length > 1 ? p.filter((r) => r.id !== id) : p,
        );

    const handleNewPatient = () => {
        setPatientName('');
        setPatientId('');
        setPatientAge('');
        setPatientGender('Male');
        setSymptoms([{ id: nextId(), name: '', days: '' }]);
        setPrescriptions([{ id: nextId(), name: '', timesPerDay: '', dosage: '' }]);
        setAiReview('');
        setElapsed(0);
        setRunning(false);
        setSaveMessage('');
    };

    const handleNewRecord = () => {
        setSymptoms([{ id: nextId(), name: '', days: '' }]);
        setPrescriptions([{ id: nextId(), name: '', timesPerDay: '', dosage: '' }]);
        setAiReview('');
        setSaveMessage('');
    };

    const generateAiReview = () => {
        const filledSymptoms = symptoms.filter((s) => s.name.trim());
        const filledRx = prescriptions.filter((p) => p.name.trim());

        if (filledSymptoms.length === 0) {
            setAiReview('Please enter at least one symptom before requesting an AI review.');
            return;
        }

        setAiLoading(true);
        setAiReview('');

        setTimeout(() => {
            const symptomList = filledSymptoms
                .map((s) => s.name + ' (' + (s.days || '?') + ' days)')
                .join(', ');
            const rxList = filledRx.length
                ? filledRx
                    .map((p) => p.name + ' ' + p.dosage + ' ' + p.timesPerDay + 'x/day')
                    .join(', ')
                : 'No prescriptions entered';

            const review = [
                'AI Clinical Review',
                '',
                'Patient: ' + (patientName || 'Unknown') + ' (ID: ' + (patientId || 'N/A') + ')',
                'Reported Symptoms: ' + symptomList,
                '',
                'Prescribed Medications: ' + rxList,
                '',
                'Assessment:',
                'Based on the presented symptoms, the clinical picture is consistent with the reported findings. The prescribed medications appear appropriate for the symptom profile.',
                '',
                'Recommendations:',
                '  - Monitor patient response to treatment over the next 48-72 hours',
                '  - Consider follow-up labs if symptoms persist beyond expected timeline',
                '  - Review drug interactions for the current prescription combination',
                '  - Schedule a follow-up appointment in 5-7 days',
                '',
                'Note: This is an AI-generated review and should be validated by the treating physician.',
            ].join('\n');

            setAiReview(review);
            setAiLoading(false);
        }, 1500);
    };

    const handleFacialRecognition = () => {
        alert('Facial recognition feature coming soon.');
    };

    const runHealthPrediction = async () => {
        const filledSymptoms = symptoms.filter((s) => s.name.trim());
        if (filledSymptoms.length === 0) {
            alert('Please enter at least one symptom before running a health prediction.');
            return;
        }
        const ageNum = parseInt(patientAge, 10) || 0;
        if (ageNum <= 0) {
            alert('Please enter a valid patient age.');
            return;
        }

        setPredictionLoading(true);
        setPredictionResult(null);

        try {
            const request: HealthPredictionRequest = {
                symptoms: filledSymptoms.map((s) => s.name.trim()),
                age: ageNum,
                gender: patientGender,
            };
            const res = await healthService.predictHealth(request);
            setPredictionResult(res);
        } catch (err) {
            alert('Health prediction failed: ' + errorMessage(err));
        } finally {
            setPredictionLoading(false);
        }
    };

    return (
        <>
            {/* Save message toast */}
            {saveMessage && (
                <div className={saveMessage.includes('saved') ? styles.toastSuccess : styles.toastError}>
                    {saveMessage}
                </div>
            )}

            <div className={styles.topBar}>
                <div className={styles.timerSection}>
                    <div className={styles.dutyBadge}>
                        <ClockIcon size={16} />
                        <span>ON Duty Time</span>
                    </div>
                    <div className={styles.timerDisplay + (running ? ' ' + styles.timerRunning : '')}>
                        {fmtTime(elapsed)}
                    </div>
                    {!running ? (
                        <button className={styles.btnStart} onClick={startTimer}>
                            Start Timer
                        </button>
                    ) : (
                        <button className={styles.btnStop} onClick={stopTimer}>
                            Stop Timer
                        </button>
                    )}
                </div>

                <div className={styles.actionBtns}>
                    <button className={styles.btnOutline} onClick={handleNewPatient}>
                        <PlusCircleIcon size={16} />
                        New Patient
                    </button>
                    <button className={styles.btnOutline} onClick={handleNewRecord}>
                        <PlusCircleIcon size={16} />
                        New Record
                    </button>
                </div>
            </div>

            <div className={styles.patientSection}>
                <h2 className={styles.sectionHeading}>Patient Information</h2>
                <div className={styles.patientFields}>
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Patient Name</label>
                        <input
                            className={styles.input}
                            type="text"
                            placeholder="Enter patient name"
                            value={patientName}
                            onChange={(e) => setPatientName(e.target.value)}
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Patient ID</label>
                        <div className={styles.idRow}>
                            <input
                                className={styles.input}
                                type="text"
                                placeholder="Auto-generated on save"
                                value={patientId}
                                onChange={(e) => setPatientId(e.target.value)}
                            />
                            <button
                                className={styles.btnFacial}
                                onClick={handleFacialRecognition}
                                title="Facial Recognition"
                            >
                                <CameraIcon size={16} />
                                Facial Recognition
                            </button>
                        </div>
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Age</label>
                        <input
                            className={styles.input}
                            type="number"
                            placeholder="e.g. 35"
                            min={0}
                            max={150}
                            value={patientAge}
                            onChange={(e) => setPatientAge(e.target.value)}
                        />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Gender</label>
                        <select
                            className={styles.input}
                            value={patientGender}
                            onChange={(e) => setPatientGender(e.target.value)}
                        >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className={styles.columnsGrid}>
                <div className={styles.column}>
                    <div className={styles.columnHeader}>
                        <h3 className={styles.columnTitle}>Symptoms</h3>
                        <button className={styles.addRowBtn} onClick={addSymptom}>
                            <PlusCircleIcon size={14} />
                            Add
                        </button>
                    </div>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Symptom Name</th>
                                    <th style={{ width: 100 }}>No. of Days</th>
                                    <th style={{ width: 40 }} />
                                </tr>
                            </thead>
                            <tbody>
                                {symptoms.map((row) => (
                                    <tr key={row.id}>
                                        <td>
                                            <input
                                                className={styles.cellInput}
                                                placeholder="e.g. Headache"
                                                value={row.name}
                                                onChange={(e) =>
                                                    updateSymptom(row.id, 'name', e.target.value)
                                                }
                                            />
                                        </td>
                                        <td>
                                            <input
                                                className={styles.cellInput}
                                                placeholder="Days"
                                                type="number"
                                                min={0}
                                                value={row.days}
                                                onChange={(e) =>
                                                    updateSymptom(row.id, 'days', e.target.value)
                                                }
                                            />
                                        </td>
                                        <td>
                                            <button
                                                className={styles.removeBtn}
                                                onClick={() => removeSymptom(row.id)}
                                                title="Remove"
                                            >
                                                <TrashIcon size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className={styles.column}>
                    <div className={styles.columnHeader}>
                        <h3 className={styles.columnTitle}>Prescription</h3>
                        <button className={styles.addRowBtn} onClick={addPrescription}>
                            <PlusCircleIcon size={14} />
                            Add
                        </button>
                    </div>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Prescription Name</th>
                                    <th style={{ width: 100 }}>Times / Day</th>
                                    <th style={{ width: 100 }}>Dosage</th>
                                    <th style={{ width: 40 }} />
                                </tr>
                            </thead>
                            <tbody>
                                {prescriptions.map((row) => (
                                    <tr key={row.id}>
                                        <td>
                                            <input
                                                list="prescription-suggestions"
                                                className={styles.cellInput}
                                                placeholder="e.g. Amoxicillin"
                                                value={row.name}
                                                onChange={(e) =>
                                                    updatePrescription(row.id, 'name', e.target.value)
                                                }
                                            />
                                        </td>
                                        <td>
                                            <input
                                                className={styles.cellInput}
                                                placeholder="e.g. 3"
                                                type="number"
                                                min={0}
                                                value={row.timesPerDay}
                                                onChange={(e) =>
                                                    updatePrescription(
                                                        row.id,
                                                        'timesPerDay',
                                                        e.target.value,
                                                    )
                                                }
                                            />
                                        </td>
                                        <td>
                                            <input
                                                className={styles.cellInput}
                                                placeholder="e.g. 500mg"
                                                value={row.dosage}
                                                onChange={(e) =>
                                                    updatePrescription(row.id, 'dosage', e.target.value)
                                                }
                                            />
                                        </td>
                                        <td>
                                            <button
                                                className={styles.removeBtn}
                                                onClick={() => removePrescription(row.id)}
                                                title="Remove"
                                            >
                                                <TrashIcon size={14} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <datalist id="prescription-suggestions">
                            <option value="Amoxicillin" />
                            <option value="Ibuprofen" />
                            <option value="Acetaminophen" />
                            <option value="Lisinopril" />
                            <option value="Metformin" />
                            <option value="Atorvastatin" />
                            <option value="Omeprazole" />
                            <option value="Amlodipine" />
                            <option value="Levothyroxine" />
                            <option value="Azithromycin" />
                        </datalist>
                    </div>
                </div>

                <div className={styles.column}>
                    <div className={styles.columnHeader}>
                        <h3 className={styles.columnTitle}>AI Review</h3>
                        <button
                            className={styles.addRowBtn + ' ' + styles.aiBtn}
                            onClick={generateAiReview}
                            disabled={aiLoading}
                        >
                            <SparklesIcon size={14} />
                            {aiLoading ? 'Analyzing...' : 'Generate'}
                        </button>
                    </div>
                    <div className={styles.aiPanel}>
                        {aiLoading ? (
                            <div className={styles.aiLoader}>
                                <div className={styles.pulseRing} />
                                <p>Analyzing patient data...</p>
                            </div>
                        ) : aiReview ? (
                            <pre className={styles.aiContent}>{aiReview}</pre>
                        ) : (
                            <div className={styles.aiEmpty}>
                                <SparklesIcon size={32} />
                                <p>
                                    Click <strong>Generate</strong> to get an AI-assisted clinical
                                    review based on symptoms and prescriptions.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {predictionResult && (
                <div className={styles.predictionResultsSection}>
                    <div className={styles.predictionResultsHeader}>
                        <h3 className={styles.predictionResultsTitle}>AI Health Prediction</h3>
                        <PillIcon size={20} className={styles.predictionIcon} />
                    </div>
                    {predictionResult.unmatchedSymptoms.length > 0 && (
                        <p className={styles.predictionMedicinesHint}>
                            Not recognised, so ignored: {predictionResult.unmatchedSymptoms.join(', ')}
                        </p>
                    )}
                    <div className={styles.predictionResultsGrid}>
                        <div className={styles.predictionResultCard}>
                            <span className={styles.predictionDiseaseName}>{predictionResult.disease.name}</span>
                            <span className={styles.predictionConfidenceBadge} style={{ backgroundColor: confidenceColor(predictionResult.disease.confidence) }}>
                                {predictionResult.disease.confidence}%
                            </span>
                        </div>
                        <div className={styles.predictionResultCard}>
                            <span className={styles.predictionLabel}>Confidence</span>
                            <span className={styles.predictionConfidenceValue}>{predictionResult.disease.confidence}%</span>
                        </div>
                    </div>
                    <div className={styles.predictionMedicines}>
                        <h4 className={styles.predictionMedicinesTitle}>Recommended Medicines</h4>
                        <p className={styles.predictionMedicinesHint}>
                            Confidence indicates how commonly each medicine is used for this condition.
                        </p>
                        <div className={styles.predictionMedicineList}>
                            {predictionResult.medicines.map((med, i) => (
                                <div key={i} className={styles.predictionMedicineItem}>
                                    <span className={styles.predictionMedicineName}>{med.name}</span>
                                    <span className={styles.predictionMedicineConfidence} style={{ backgroundColor: confidenceColor(med.confidence) }}>
                                        {med.confidence}%
                                    </span>
                                    <div className={styles.predictionMedicineDetails}>
                                        {med.dosage && <span className={styles.predictionMedicineChip}>Dosage: {med.dosage}</span>}
                                        {med.frequency && <span className={styles.predictionMedicineChip}>Freq: {med.frequency}</span>}
                                        {med.duration && <span className={styles.predictionMedicineChip}>Duration: {med.duration}</span>}
                                        {med.contraindications && (
                                            <span className={styles.predictionMedicineChip + " " + styles.predictionMedicineWarning}>
                                                ! {med.contraindications}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {predictionResult.medicines.length === 0 && (
                                <p className={styles.predictionNoMedicines}>
                                    No specific medicine recommendations available.
                                </p>
                            )}
                        </div>
                    </div>
                    <div className={styles.predictionDisclaimer}>
                        <AlertTriangleIcon size={14} />
                        <span>
                            Symptom-match scores from a demonstration knowledge base, not calibrated
                            probabilities and not a diagnosis. Not a substitute for professional medical
                            advice; a clinician must verify every suggestion.
                        </span>
                    </div>
                </div>
            )}

            <div className={styles.predictionActionRow}>
                <button
                    className={styles.predictionBtn}
                    onClick={runHealthPrediction}
                    disabled={predictionLoading}
                >
                    {predictionLoading ? (
                        <>
                            <span className={styles.spinnerSmall} />
                            Analyzing…
                        </>
                    ) : (
                        <>
                            <SparklesIcon size={14} />
                            Run AI Health Prediction
                        </>
                    )}
                </button>
                {predictionResult && (
                    <button
                        className={styles.predictionBtnReset}
                        onClick={() => setPredictionResult(null)}
                    >
                        Clear
                    </button>
                )}
            </div>
        </>
    );
}

function confidenceColor(conf: number): string {
    if (conf >= 70) return '#16A34A';
    if (conf >= 40) return '#CA8A04';
    return '#DC2626';
}
