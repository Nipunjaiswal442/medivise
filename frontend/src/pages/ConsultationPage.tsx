import { useState, useEffect, useCallback } from 'react';
import {
    ClockIcon,
    PlusCircleIcon,
    CameraIcon,
    TrashIcon,
    SparklesIcon,
} from '@/components/ui/Icons';
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

    const [symptoms, setSymptoms] = useState<SymptomRow[]>([
        { id: nextId(), name: '', days: '' },
    ]);

    const [prescriptions, setPrescriptions] = useState<PrescriptionRow[]>([
        { id: nextId(), name: '', timesPerDay: '', dosage: '' },
    ]);

    const [aiReview, setAiReview] = useState('');
    const [aiLoading, setAiLoading] = useState(false);

    useEffect(() => {
        if (!running) return;
        const id = setInterval(() => setElapsed((p) => p + 1), 1000);
        return () => clearInterval(id);
    }, [running]);

    const startTimer = () => setRunning(true);
    const stopTimer = () => setRunning(false);

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
        setSymptoms([{ id: nextId(), name: '', days: '' }]);
        setPrescriptions([{ id: nextId(), name: '', timesPerDay: '', dosage: '' }]);
        setAiReview('');
        setElapsed(0);
        setRunning(false);
    };

    const handleNewRecord = () => {
        setSymptoms([{ id: nextId(), name: '', days: '' }]);
        setPrescriptions([{ id: nextId(), name: '', timesPerDay: '', dosage: '' }]);
        setAiReview('');
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

    return (
        <>
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
                                placeholder="Enter patient ID"
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
        </>
    );
}
