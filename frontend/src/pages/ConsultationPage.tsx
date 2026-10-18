import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import type { FunctionReturnType } from 'convex/server';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import {
    ClockIcon,
    PlusCircleIcon,
    CameraIcon,
    TrashIcon,
    SparklesIcon,
    AlertTriangleIcon,
    PillIcon,
} from '@/components/ui/Icons';
import PatientPicker from '@/components/PatientPicker';
import Markdown from '@/components/ui/Markdown';
import { api } from '@/convex/api';
import { errorMessage } from '@/convex/client';
import { useAuth } from '@/context/AuthContext';
import { useAssistantStatus } from '@/hooks/useAssistantStatus';
import { askAssistant } from '@/services/assistant';
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

type PredictionView = FunctionReturnType<typeof api.functions.predict.preview>;

let uid = 0;
const nextId = () => 'r' + String(++uid);
const emptySymptom = (): SymptomRow => ({ id: nextId(), name: '', days: '' });
const emptyPrescription = (): PrescriptionRow => ({ id: nextId(), name: '', timesPerDay: '', dosage: '' });

function fmtTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return [h, m, s].map((v) => String(v).padStart(2, '0')).join(':');
}

/** Debounced copy of a value, so live queries do not fire on every keystroke. */
function useDebounced<T>(value: T, ms = 250): T {
    const [debounced, setDebounced] = useState(value);
    const key = JSON.stringify(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), ms);
        return () => clearTimeout(t);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [key, ms]);
    return debounced;
}

export default function ConsultationPage() {
    const [params] = useSearchParams();
    const appointmentId = params.get('appointment') as Id<'appointments'> | null;
    const appointment = useQuery(api.functions.appointments.get, appointmentId ? { id: appointmentId } : 'skip');
    const knownSymptoms = useQuery(api.functions.predict.knownSymptoms, {});
    const createPatient = useMutation(api.functions.patients.createPatient);
    const createConsultation = useMutation(api.functions.consultations.createConsultation);
    const predictHealth = useMutation(api.functions.predict.predictHealth);
    const setAppointmentStatus = useMutation(api.functions.appointments.setStatus);
    const { token } = useAuth();
    const assistant = useAssistantStatus();

    const [elapsed, setElapsed] = useState(0);
    const [running, setRunning] = useState(false);
    const [patient, setPatient] = useState<Doc<'patients'> | null>(null);
    const [patientName, setPatientName] = useState('');
    const [patientAge, setPatientAge] = useState('');
    const [patientGender, setPatientGender] = useState('Male');
    const [symptoms, setSymptoms] = useState<SymptomRow[]>([emptySymptom()]);
    const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([emptyPrescription()]);
    const [diagnosis, setDiagnosis] = useState('');
    const [notes, setNotes] = useState('');
    const [aiReview, setAiReview] = useState('');
    const [aiLoading, setAiLoading] = useState(false);
    const [saveMessage, setSaveMessage] = useState('');
    const [saving, setSaving] = useState(false);
    const [savedPrediction, setSavedPrediction] = useState<PredictionView | null>(null);
    const [predictionLoading, setPredictionLoading] = useState(false);

    const choosePatient = (p: Doc<'patients'> | null) => {
        setPatient(p);
        if (p) {
            setPatientName(p.name);
            setPatientAge(String(p.age));
            setPatientGender(p.gender);
        }
    };

    // Arriving from an appointment or a patient page pre-selects the patient
    const patientParam = (appointment?.patientId ?? params.get('patient')) as Id<'patients'> | null;
    const linkedPatient = useQuery(api.functions.patients.getPatientRecord, patientParam && !patient ? { patient: patientParam } : 'skip');
    useEffect(() => {
        if (linkedPatient?.patient && !patient) choosePatient(linkedPatient.patient as Doc<'patients'>);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [linkedPatient]);

    useEffect(() => {
        if (!running) return;
        const id = setInterval(() => setElapsed((p) => p + 1), 1000);
        return () => clearInterval(id);
    }, [running]);

    const filledSymptoms = symptoms.filter((s) => s.name.trim());
    const filledRx = prescriptions.filter((p) => p.name.trim());
    const ageNum = parseInt(patientAge, 10);
    const maxDays = Math.max(0, ...filledSymptoms.map((s) => parseInt(s.days, 10) || 0));

    // Live differential and prescription screen (debounced, read-only queries)
    const liveArgs = useDebounced({
        symptoms: filledSymptoms.map((s) => s.name.trim()),
        age: Number.isFinite(ageNum) ? ageNum : undefined,
        gender: patientGender,
        durationDays: maxDays || undefined,
        patientId: patient?._id,
    });
    const live = useQuery(api.functions.predict.preview, liveArgs.symptoms.length > 0 ? liveArgs : 'skip');
    const proposed = useDebounced(filledRx.map((p) => p.name.trim()));
    const rxSafety = useQuery(api.functions.patients.medicationSafety, patient && proposed.length > 0 ? { id: patient._id, proposed } : 'skip');

    const flash = (message: string, ms = 4000) => {
        setSaveMessage(message);
        setTimeout(() => setSaveMessage(''), ms);
    };

    const startTimer = () => {
        setRunning(true);
        if (appointment && appointment.status !== 'in-progress' && appointment.status !== 'completed') {
            void setAppointmentStatus({ id: appointment._id, status: 'in-progress' });
        }
    };

    const doSave = async () => {
        if (!patient && !patientName.trim()) return flash('Choose a patient or enter a new patient name before saving.', 3000);
        if (!patient && (!Number.isFinite(ageNum) || ageNum < 0)) return flash('Enter the patient age before saving.', 3000);
        setSaving(true);
        try {
            let patientId = patient?._id;
            let customId = patient?.customId;
            const consultationSymptoms = filledSymptoms.map((s) => ({ name: s.name.trim(), days: s.days }));
            const consultationRx = filledRx.map((p) => ({ name: p.name.trim(), timesPerDay: p.timesPerDay, dosage: p.dosage }));
            if (!patientId) {
                const created = await createPatient({
                    name: patientName.trim(),
                    age: ageNum,
                    gender: patientGender,
                    condition: diagnosis.trim() || consultationSymptoms.map((s) => s.name).join(', ') || 'General consultation',
                    lastVisit: new Date().toISOString().slice(0, 10),
                    status: 'active',
                    consultationDuration: elapsed,
                    symptoms: consultationSymptoms,
                    prescriptions: consultationRx,
                });
                patientId = created.id;
                customId = created.customId;
            }
            await createConsultation({
                patientId,
                appointmentId: appointment && appointment.patientId === patientId ? appointment._id : undefined,
                symptoms: consultationSymptoms,
                prescriptions: consultationRx,
                aiReview: aiReview || undefined,
                diagnosis: diagnosis.trim() || undefined,
                notes: notes.trim() || undefined,
                durationSeconds: elapsed,
                predictionId: savedPrediction?.predictionId,
            });
            flash(`Consultation saved to ${customId ?? 'the patient record'}${appointment ? ' and the appointment marked completed' : ''}.`);
            setRunning(false);
        } catch (err) {
            flash('Failed to save: ' + errorMessage(err));
        } finally {
            setSaving(false);
        }
    };

    const stopTimer = () => {
        setRunning(false);
        void doSave();
    };

    const updateSymptom = useCallback((id: string, field: keyof SymptomRow, value: string) => {
        setSymptoms((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    }, []);
    const updatePrescription = useCallback((id: string, field: keyof PrescriptionRow, value: string) => {
        setPrescriptions((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    }, []);

    const resetRecord = () => {
        setSymptoms([emptySymptom()]);
        setPrescriptions([emptyPrescription()]);
        setDiagnosis('');
        setNotes('');
        setAiReview('');
        setSavedPrediction(null);
        setSaveMessage('');
    };

    const handleNewPatient = () => {
        setPatient(null);
        setPatientName('');
        setPatientAge('');
        setPatientGender('Male');
        setElapsed(0);
        setRunning(false);
        resetRecord();
    };

    const llmReady = Boolean(assistant?.llmConfigured && token);

    const generateAiReview = async () => {
        if (filledSymptoms.length === 0) {
            setAiReview('Please enter at least one symptom before requesting an AI review.');
            return;
        }
        setAiLoading(true);
        setAiReview('');
        try {
            if (llmReady && token) {
                const summary = [
                    `Patient: ${patient ? `${patient.customId} ${patient.name}` : `new patient ${patientName || '(unnamed)'}`}, ${patientAge || '?'} y, ${patientGender}.`,
                    `Presenting symptoms: ${filledSymptoms.map((s) => `${s.name}${s.days ? ` (${s.days} days)` : ''}`).join(', ')}.`,
                    `Planned prescriptions: ${filledRx.length ? filledRx.map((p) => `${p.name} ${p.dosage} ${p.timesPerDay}x/day`).join(', ') : 'none yet'}.`,
                    diagnosis && `Working diagnosis: ${diagnosis}.`,
                    notes && `Consultation notes: ${notes}`,
                ].filter(Boolean).join('\n');
                const text = await askAssistant({
                    token,
                    patientId: patient?._id,
                    messages: [{
                        role: 'user',
                        content: `Review this consultation in progress. ${patient ? 'Use the patient record (allergies, medications, labs, history). ' : ''}Run the prediction model on the symptoms, check every planned prescription for allergy conflicts, interactions and contraindications (including pregnancy, renal function and age), and give: 1) differential with red flags, 2) prescription safety, 3) suggested investigations, 4) follow-up plan. Be concise.\n\n${summary}`,
                    }],
                    onText: setAiReview,
                });
                setAiReview(text);
            } else {
                setAiReview(knowledgeBaseReview(live, rxSafety ?? [], filledRx.map((p) => p.name)));
            }
        } catch (err) {
            setAiReview(`The AI review failed: ${err instanceof Error ? err.message : 'unknown error'}`);
        } finally {
            setAiLoading(false);
        }
    };

    const runHealthPrediction = async () => {
        if (filledSymptoms.length === 0) return flash('Enter at least one symptom first.', 3000);
        setPredictionLoading(true);
        try {
            const res = await predictHealth({
                symptoms: filledSymptoms.map((s) => s.name.trim()),
                age: Number.isFinite(ageNum) ? ageNum : undefined,
                gender: patientGender,
                durationDays: maxDays || undefined,
                patientId: patient?._id,
            });
            setSavedPrediction(res);
        } catch (err) {
            flash('Health prediction failed: ' + errorMessage(err));
        } finally {
            setPredictionLoading(false);
        }
    };

    const addMedicine = (name: string, dosage = '') =>
        setPrescriptions((prev) => [...prev.filter((p) => p.name.trim()), { id: nextId(), name, timesPerDay: '', dosage }]);

    const medicineSuggestions = useMemo(
        () => [...new Set([...(live?.medicines ?? []).map((m) => m.name), 'Paracetamol', 'Ibuprofen', 'Amoxicillin', 'Azithromycin', 'Omeprazole', 'Metformin', 'Lisinopril', 'Amlodipine', 'Atorvastatin', 'Cetirizine'])],
        [live],
    );

    return (
        <>
            {saveMessage && (
                <div className={saveMessage.startsWith('Consultation saved') ? styles.toastSuccess : styles.toastError}>{saveMessage}</div>
            )}

            <div className={styles.topBar}>
                <div className={styles.timerSection}>
                    <div className={styles.dutyBadge}>
                        <ClockIcon size={16} />
                        <span>Consultation time</span>
                    </div>
                    <div className={styles.timerDisplay + (running ? ' ' + styles.timerRunning : '')}>{fmtTime(elapsed)}</div>
                    {!running ? (
                        <button className={styles.btnStart} onClick={startTimer}>Start Timer</button>
                    ) : (
                        <button className={styles.btnStop} onClick={stopTimer} disabled={saving}>Stop &amp; Save</button>
                    )}
                </div>
                <div className={styles.actionBtns}>
                    <button className={styles.btnOutline} onClick={doSave} disabled={saving}>{saving ? 'Saving…' : 'Save consultation'}</button>
                    <button className={styles.btnOutline} onClick={handleNewPatient}><PlusCircleIcon size={16} /> New Patient</button>
                    <button className={styles.btnOutline} onClick={resetRecord}><PlusCircleIcon size={16} /> New Record</button>
                </div>
            </div>

            {appointment && (
                <div className="ui-alert ui-alert-info" style={{ marginBottom: '1rem' }}>
                    <span>
                        Appointment: <strong>{appointment.patient?.name}</strong> · {new Date(appointment.startsAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} · {appointment.reason}.{' '}
                        Saving completes the appointment. <Link to="/appointments">Back to schedule</Link>
                    </span>
                </div>
            )}

            <div className={styles.patientSection}>
                <h2 className={styles.sectionHeading}>Patient Information</h2>
                <div className={styles.patientFields}>
                    <div className={styles.fieldGroup} style={{ gridColumn: 'span 2' }}>
                        <label className={styles.fieldLabel} htmlFor="consult-patient">Existing patient</label>
                        <div className={styles.idRow}>
                            <div style={{ flex: 1 }}>
                                <PatientPicker id="consult-patient" value={patient?._id ?? null} onChange={choosePatient} placeholder="Search by name or ID, or leave empty for a new patient" />
                            </div>
                            <button className={styles.btnFacial} onClick={() => alert('Facial recognition is coming soon.')} title="Facial Recognition">
                                <CameraIcon size={16} /> Facial Recognition
                            </button>
                        </div>
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Patient Name</label>
                        <input className={styles.input} type="text" placeholder="Enter patient name" value={patientName} onChange={(e) => setPatientName(e.target.value)} disabled={Boolean(patient)} />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Age</label>
                        <input className={styles.input} type="number" placeholder="e.g. 35" min={0} max={130} value={patientAge} onChange={(e) => setPatientAge(e.target.value)} disabled={Boolean(patient)} />
                    </div>
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Gender</label>
                        <select className={styles.input} value={patientGender} onChange={(e) => setPatientGender(e.target.value)} disabled={Boolean(patient)}>
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                </div>
                {patient && (
                    <div className={styles.patientBanner}>
                        <span><strong>{patient.customId}</strong> · {(patient.chronicConditions ?? [patient.condition]).join(' · ')}</span>
                        {(patient.allergies?.length ?? 0) > 0 ? (
                            <span className="ui-badge ui-badge-red">Allergies: {patient.allergies!.map((a) => a.substance).join(', ')}</span>
                        ) : (
                            <span className="ui-badge ui-badge-gray">No allergies recorded</span>
                        )}
                        {(patient.medications?.length ?? 0) > 0 && (
                            <span className="ui-muted">Current meds: {patient.medications!.map((m) => `${m.name} ${m.dose}`).join(', ')}</span>
                        )}
                        <Link to={`/patients?id=${patient._id}`} className="ui-btn ui-btn-ghost ui-btn-sm">Open record</Link>
                    </div>
                )}
            </div>

            <div className={styles.columnsGrid}>
                <div className={styles.column}>
                    <div className={styles.columnHeader}>
                        <h3 className={styles.columnTitle}>Symptoms</h3>
                        <button className={styles.addRowBtn} onClick={() => setSymptoms((p) => [...p, emptySymptom()])}><PlusCircleIcon size={14} /> Add</button>
                    </div>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr><th>Symptom Name</th><th style={{ width: 100 }}>No. of Days</th><th style={{ width: 40 }} /></tr>
                            </thead>
                            <tbody>
                                {symptoms.map((row) => (
                                    <tr key={row.id}>
                                        <td>
                                            <input list="symptom-suggestions" className={styles.cellInput} placeholder="e.g. Headache" value={row.name} onChange={(e) => updateSymptom(row.id, 'name', e.target.value)} />
                                        </td>
                                        <td>
                                            <input className={styles.cellInput} placeholder="Days" type="number" min={0} value={row.days} onChange={(e) => updateSymptom(row.id, 'days', e.target.value)} />
                                        </td>
                                        <td>
                                            <button className={styles.removeBtn} onClick={() => setSymptoms((p) => (p.length > 1 ? p.filter((r) => r.id !== row.id) : p))} title="Remove"><TrashIcon size={14} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <datalist id="symptom-suggestions">{(knownSymptoms ?? []).map((s) => <option key={s} value={s} />)}</datalist>
                    </div>

                    {live && live.ranking.length > 0 && (
                        <div className={styles.liveDx}>
                            <div className={styles.liveDxTitle}>Live differential <span className="ui-muted">(knowledge base, updates as you type)</span></div>
                            {live.redFlags.map((f) => (
                                <div key={f.id} className="ui-alert ui-alert-error" style={{ padding: '0.4rem 0.6rem', fontSize: '0.78rem' }}>
                                    <AlertTriangleIcon size={14} /> <span><strong>{f.title}.</strong> {f.advice}</span>
                                </div>
                            ))}
                            {live.ranking.slice(0, 4).map((r) => (
                                <div key={r.name} className={styles.dxItem}>
                                    <span>{r.name}{r.urgent && <span className="ui-badge ui-badge-red" style={{ marginLeft: 6 }}>urgent</span>}</span>
                                    <span className={styles.dxBar}><span style={{ width: `${Math.max(3, r.probability)}%` }} /></span>
                                    <span className={styles.dxPct}>{r.probability}%</span>
                                </div>
                            ))}
                            {live.ranking[0].askAbout.length > 0 && (
                                <p className="ui-muted" style={{ fontSize: '0.75rem' }}>Ask about: {live.ranking[0].askAbout.join(', ')}</p>
                            )}
                            {live.unmatchedSymptoms.length > 0 && (
                                <p className="ui-muted" style={{ fontSize: '0.75rem' }}>
                                    Not recognised: {live.unmatchedSymptoms.map((u) => `${u}${live.suggestions[u]?.length ? ` (did you mean ${live.suggestions[u].join(', ')}?)` : ''}`).join('; ')}
                                </p>
                            )}
                        </div>
                    )}
                </div>

                <div className={styles.column}>
                    <div className={styles.columnHeader}>
                        <h3 className={styles.columnTitle}>Prescription</h3>
                        <button className={styles.addRowBtn} onClick={() => setPrescriptions((p) => [...p, emptyPrescription()])}><PlusCircleIcon size={14} /> Add</button>
                    </div>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr><th>Prescription Name</th><th style={{ width: 90 }}>Times / Day</th><th style={{ width: 100 }}>Dosage</th><th style={{ width: 40 }} /></tr>
                            </thead>
                            <tbody>
                                {prescriptions.map((row) => (
                                    <tr key={row.id}>
                                        <td><input list="prescription-suggestions" className={styles.cellInput} placeholder="e.g. Amoxicillin" value={row.name} onChange={(e) => updatePrescription(row.id, 'name', e.target.value)} /></td>
                                        <td><input className={styles.cellInput} placeholder="e.g. 3" type="number" min={0} value={row.timesPerDay} onChange={(e) => updatePrescription(row.id, 'timesPerDay', e.target.value)} /></td>
                                        <td><input className={styles.cellInput} placeholder="e.g. 500mg" value={row.dosage} onChange={(e) => updatePrescription(row.id, 'dosage', e.target.value)} /></td>
                                        <td><button className={styles.removeBtn} onClick={() => setPrescriptions((p) => (p.length > 1 ? p.filter((r) => r.id !== row.id) : p))} title="Remove"><TrashIcon size={14} /></button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <datalist id="prescription-suggestions">{medicineSuggestions.map((m) => <option key={m} value={m} />)}</datalist>
                    </div>
                    {patient && rxSafety && rxSafety.length > 0 && (
                        <div className="ui-alert ui-alert-error" style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>
                            <AlertTriangleIcon size={14} />
                            <span><strong>Safety check:</strong> {rxSafety.map((w) => w.message).join('; ')}</span>
                        </div>
                    )}
                    {patient && rxSafety && rxSafety.length === 0 && proposed.length > 0 && (
                        <p className="ui-muted" style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
                            No allergy, interaction, pregnancy or kidney-function warnings in Medivise's screening tables. These tables are limited: no warning does not mean the combination is safe.
                        </p>
                    )}
                    <div className={styles.notesSection}>
                        <label className={styles.fieldLabel} htmlFor="consult-dx">Working diagnosis</label>
                        <input id="consult-dx" className={styles.input} value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Acute bronchitis" list="dx-suggestions" />
                        <datalist id="dx-suggestions">{(live?.ranking ?? []).map((r) => <option key={r.name} value={r.name} />)}</datalist>
                        <label className={styles.fieldLabel} htmlFor="consult-notes" style={{ marginTop: '0.6rem' }}>Notes</label>
                        <textarea id="consult-notes" className={styles.input} rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Examination findings, plan, advice given…" />
                    </div>
                </div>

                <div className={styles.column}>
                    <div className={styles.columnHeader}>
                        <h3 className={styles.columnTitle}>AI Review</h3>
                        <button className={styles.addRowBtn + ' ' + styles.aiBtn} onClick={generateAiReview} disabled={aiLoading}>
                            <SparklesIcon size={14} /> {aiLoading ? 'Analyzing...' : 'Generate'}
                        </button>
                    </div>
                    <div className={styles.aiPanel}>
                        {aiLoading && !aiReview ? (
                            <div className={styles.aiLoader}>
                                <div className={styles.pulseRing} />
                                <p>{llmReady ? 'The assistant is reading the record…' : 'Analyzing patient data...'}</p>
                            </div>
                        ) : aiReview ? (
                            <div className={styles.aiContent}><Markdown>{aiReview}</Markdown></div>
                        ) : (
                            <div className={styles.aiEmpty}>
                                <SparklesIcon size={32} />
                                <p>
                                    Click <strong>Generate</strong> for a clinical review of the symptoms and prescriptions
                                    {llmReady ? ' by the AI assistant (uses the patient record).' : '. The AI assistant is not configured, so this uses the built-in knowledge base.'}
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {savedPrediction && (
                <div className={styles.predictionResultsSection}>
                    <div className={styles.predictionResultsHeader}>
                        <h3 className={styles.predictionResultsTitle}>Saved Health Prediction</h3>
                        <PillIcon size={20} className={styles.predictionIcon} />
                    </div>
                    {savedPrediction.unmatchedSymptoms.length > 0 && (
                        <p className={styles.predictionMedicinesHint}>Not recognised, so ignored: {savedPrediction.unmatchedSymptoms.join(', ')}</p>
                    )}
                    <div className={styles.predictionResultsGrid}>
                        {savedPrediction.ranking.slice(0, 3).map((r) => (
                            <div key={r.name} className={styles.predictionResultCard}>
                                <span className={styles.predictionDiseaseName}>{r.name}</span>
                                <span className={styles.predictionConfidenceBadge} style={{ backgroundColor: confidenceColor(r.probability) }}>{r.probability}%</span>
                            </div>
                        ))}
                    </div>
                    <div className={styles.predictionMedicines}>
                        <h4 className={styles.predictionMedicinesTitle}>Treatment options for {savedPrediction.ranking[0]?.name}</h4>
                        <p className={styles.predictionMedicinesHint}>"Usage" is how commonly each medicine is used for this condition in the knowledge base. Click one to add it to the prescription.</p>
                        <div className={styles.predictionMedicineList}>
                            {savedPrediction.medicines.map((med) => (
                                <button key={med.name} type="button" className={styles.predictionMedicineItem} onClick={() => addMedicine(med.name, med.dosage ?? '')} style={{ textAlign: 'left' }}>
                                    <span className={styles.predictionMedicineName}>{med.name}</span>
                                    <span className={styles.predictionMedicineConfidence} style={{ backgroundColor: confidenceColor(med.confidence) }}>{med.confidence}%</span>
                                    <div className={styles.predictionMedicineDetails}>
                                        {med.dosage && <span className={styles.predictionMedicineChip}>Dosage: {med.dosage}</span>}
                                        {med.frequency && <span className={styles.predictionMedicineChip}>Freq: {med.frequency}</span>}
                                        {med.contraindications && <span className={styles.predictionMedicineChip + ' ' + styles.predictionMedicineWarning}>! {med.contraindications}</span>}
                                        {med.warnings.map((w) => <span key={w} className={styles.predictionMedicineChip + ' ' + styles.predictionMedicineWarning}>⚠ {w}</span>)}
                                    </div>
                                </button>
                            ))}
                            {savedPrediction.medicines.length === 0 && (
                                <p className={styles.predictionNoMedicines}>{savedPrediction.treatmentNotes.join(' ') || 'No specific medicine recommendations available.'}</p>
                            )}
                        </div>
                    </div>
                    <div className={styles.predictionDisclaimer}>
                        <AlertTriangleIcon size={14} />
                        <span>
                            Probabilities are relative to a demonstration knowledge base, not calibrated clinical probabilities and not a
                            diagnosis. A clinician must verify every suggestion.
                        </span>
                    </div>
                </div>
            )}

            <div className={styles.predictionActionRow}>
                <button className={styles.predictionBtn} onClick={runHealthPrediction} disabled={predictionLoading}>
                    {predictionLoading ? <><span className={styles.spinnerSmall} /> Analyzing…</> : <><SparklesIcon size={14} /> Save Health Prediction</>}
                </button>
                {savedPrediction && <button className={styles.predictionBtnReset} onClick={() => setSavedPrediction(null)}>Clear</button>}
            </div>
        </>
    );
}

/** Review built from the knowledge base when no LLM is configured. */
function knowledgeBaseReview(
    live: PredictionView | undefined,
    safety: { message: string }[],
    prescriptions: string[],
): string {
    const lines = ['**Knowledge-base review** (the AI assistant is not configured, so this is rule-based)', ''];
    if (!live || live.ranking.length === 0) {
        lines.push('No condition in the knowledge base matches these symptoms.', '');
    } else {
        if (live.redFlags.length) lines.push('**Red flags**', ...live.redFlags.map((f) => `- ${f.title}: ${f.advice}`), '');
        lines.push(
            '**Differential**',
            ...live.ranking.slice(0, 4).map((r) => `- ${r.name} - ${r.probability}% (explains ${r.matchedSymptoms.join(', ')})${r.askAbout.length ? `; ask about ${r.askAbout.join(', ')}` : ''}`),
            '',
        );
    }
    lines.push('**Prescriptions**');
    if (prescriptions.length === 0) lines.push('- None entered.');
    else if (safety.length) lines.push(...safety.map((w) => `- ⚠ ${w.message}`));
    else lines.push(`- ${prescriptions.join(', ')}: no warnings in the limited screening table.`);
    lines.push('', '_Decision support only - verify against the full record and current guidelines._');
    return lines.join('\n');
}

function confidenceColor(conf: number): string {
    if (conf >= 70) return '#16A34A';
    if (conf >= 40) return '#CA8A04';
    return '#DC2626';
}
