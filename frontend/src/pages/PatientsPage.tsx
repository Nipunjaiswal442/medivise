import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { api } from '@/convex/api';
import { errorMessage } from '@/convex/client';
import { useAuth } from '@/context/AuthContext';
import LoadSamplesButton from '@/components/LoadSamplesButton';
import { STATUS_BADGE, STATUS_LABEL, TYPE_LABEL } from '@/components/appointmentLabels';
import { AlertTriangleIcon, FileIcon, MessageSquareIcon, StethoscopeIcon, TrashIcon, UploadIcon } from '@/components/ui/Icons';
import { useAssistantStatus } from '@/hooks/useAssistantStatus';
import { ACCEPTED_FILES } from '@/lib/extractText';
import { uploadDocument } from '@/services/documents';
import { fmtDate, fmtDay, fmtTime } from '@/lib/time';
import styles from './PatientsPage.module.css';

type StatusFilter = 'all' | 'active' | 'scheduled' | 'discharged';
type Tab = 'overview' | 'results' | 'history' | 'appointments' | 'documents';

const statusClass = (s: string) =>
  s === 'active' ? 'ui-badge ui-badge-green' : s === 'scheduled' ? 'ui-badge ui-badge-blue' : 'ui-badge ui-badge-gray';

export default function PatientsPage() {
  const patients = useQuery(api.functions.patients.getPatients, {});
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const selectedId = params.get('id') as Id<'patients'> | null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return [...(patients ?? [])]
      .sort((a, b) => a.customId.localeCompare(b.customId))
      .filter((p) => status === 'all' || p.status === status)
      .filter(
        (p) =>
          !q ||
          [p.name, p.customId, p.condition, ...(p.chronicConditions ?? []), ...(p.medications ?? []).map((m) => m.name)]
            .join(' ')
            .toLowerCase()
            .includes(q),
      );
  }, [patients, query, status]);

  const select = (id: Id<'patients'> | null) => {
    if (id) setParams({ id });
    else setParams({});
  };

  return (
    <div className={styles.page}>
      <header className="ui-page-header">
        <div>
          <h1 className="ui-title">Patients</h1>
          <p className="ui-subtitle">
            {patients ? `${patients.length} patient${patients.length === 1 ? '' : 's'}` : 'Loading…'} · search by name, ID, condition or medication
          </p>
        </div>
        {patients && patients.length > 0 && <LoadSamplesButton label="Refresh sample patients" className="ui-btn ui-btn-outline ui-btn-sm" />}
      </header>

      {patients && patients.length === 0 ? (
        <div className="ui-card">
          <div className="ui-card-title">No patients yet</div>
          <p className="ui-muted" style={{ marginBottom: '0.75rem' }}>
            Patients are created when you save a consultation. To explore the app, load 20 fictional sample patients with full
            records and a week of appointments.
          </p>
          <LoadSamplesButton />
        </div>
      ) : (
        <div className={selectedId ? styles.split : undefined}>
          <section className={styles.listCol}>
            <div className={styles.filters}>
              <input
                className="ui-input"
                placeholder="Search patients…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search patients"
              />
              <select className="ui-input" style={{ width: 'auto' }} value={status} onChange={(e) => setStatus(e.target.value as StatusFilter)} aria-label="Status">
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="scheduled">Scheduled</option>
                <option value="discharged">Discharged</option>
              </select>
            </div>
            <div className="ui-card" style={{ padding: 0, overflow: 'hidden' }}>
              {filtered.length === 0 ? (
                <p className="ui-empty">{patients === undefined ? 'Loading…' : `No patients match “${query}”.`}</p>
              ) : (
                <ul className={styles.rows}>
                  {filtered.map((p) => (
                    <li key={p._id}>
                      <button className={`${styles.row} ${p._id === selectedId ? styles.rowActive : ''}`} onClick={() => select(p._id)}>
                        <span className={styles.rowId}>{p.customId}</span>
                        <span className={styles.rowMain}>
                          <strong>{p.name}</strong>
                          <span className="ui-muted">{p.age} {p.gender} · {p.condition}</span>
                        </span>
                        {(p.allergies?.length ?? 0) > 0 && <span className="ui-badge ui-badge-red" title={p.allergies!.map((a) => a.substance).join(', ')}>Allergy</span>}
                        <span className={statusClass(p.status)}>{p.status}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {selectedId && <PatientDetail key={selectedId} id={selectedId} onClose={() => select(null)} />}
        </div>
      )}
    </div>
  );
}

function PatientDetail({ id, onClose }: { id: Id<'patients'>; onClose: () => void }) {
  const record = useQuery(api.functions.patients.getPatientRecord, { patient: id });
  const safety = useQuery(api.functions.patients.medicationSafety, { id });
  const documents = useQuery(api.functions.documents.list, { patientId: id });
  const deletePatient = useMutation(api.functions.patients.deletePatient);
  const removeDocument = useMutation(api.functions.documents.remove);
  const [tab, setTab] = useState<Tab>('overview');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  if (record === undefined) return <section className="ui-card">Loading…</section>;
  if (record === null) {
    return (
      <section className="ui-card">
        Patient not found. <button className="ui-btn ui-btn-ghost ui-btn-sm" onClick={onClose}>Close</button>
      </section>
    );
  }
  const p = record.patient as Doc<'patients'>;
  const v = p.vitals;
  const bmi = v && v.heightCm ? Math.round((v.weightKg / (v.heightCm / 100) ** 2) * 10) / 10 : null;

  const onDelete = async () => {
    if (!confirm(`Delete ${p.name} (${p.customId}) with all consultations, predictions and appointments? This cannot be undone.`)) return;
    try {
      await deletePatient({ id: p._id });
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <section className={`ui-card ${styles.detail}`}>
      <div className={styles.detailHeader}>
        <div>
          <h2 className={styles.detailName}>{p.name}</h2>
          <p className="ui-muted">
            {p.customId} · {p.age} y · {p.gender}
            {p.dateOfBirth && ` · born ${fmtDate(p.dateOfBirth)}`}
            {p.bloodType && ` · ${p.bloodType}`} · last visit {fmtDate(p.lastVisit)}
          </p>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
            <span className={statusClass(p.status)}>{p.status}</span>
            {(p.chronicConditions ?? [p.condition]).map((c) => <span key={c} className="ui-badge">{c}</span>)}
          </div>
        </div>
        <button className="ui-btn ui-btn-ghost ui-btn-sm" onClick={onClose} aria-label="Close">✕</button>
      </div>

      {(p.allergies?.length ?? 0) > 0 ? (
        <div className="ui-alert ui-alert-error" style={{ marginTop: '0.75rem' }}>
          <AlertTriangleIcon size={16} />
          <span><strong>Allergies:</strong> {p.allergies!.map((a) => `${a.substance} (${a.reaction}, ${a.severity})`).join('; ')}</span>
        </div>
      ) : (
        <p className="ui-muted" style={{ marginTop: '0.75rem', fontSize: '0.8rem' }}>No allergies recorded.</p>
      )}
      {safety && safety.length > 0 && (
        <div className="ui-alert ui-alert-warning" style={{ marginTop: '0.5rem' }}>
          <AlertTriangleIcon size={16} />
          <span>
            <strong>Medication screen:</strong> {safety.map((w) => w.message).join('; ')}
          </span>
        </div>
      )}

      <div className={styles.actions}>
        <button className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => navigate(`/consultation?patient=${p._id}`)}>
          <StethoscopeIcon size={14} /> Start consultation
        </button>
        <button className="ui-btn ui-btn-outline ui-btn-sm" onClick={() => navigate(`/chat?patient=${p._id}`)}>
          <MessageSquareIcon size={14} /> Ask the assistant
        </button>
        <Link className="ui-btn ui-btn-outline ui-btn-sm" to="/appointments">Book appointment</Link>
        <button className="ui-btn ui-btn-ghost ui-btn-sm" onClick={onDelete}><TrashIcon size={14} /> Delete</button>
      </div>
      {error && <div className="ui-alert ui-alert-error">{error}</div>}

      <nav className={styles.tabs}>
        {(['overview', 'results', 'history', 'appointments', 'documents'] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? styles.tabActive : ''} onClick={() => setTab(t)}>
            {{ overview: 'Overview', results: 'Vitals & labs', history: 'History', appointments: 'Appointments', documents: `Documents${documents?.length ? ` (${documents.length})` : ''}` }[t]}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className={styles.grid}>
          <Block title="Current medications">
            {p.medications?.length ? (
              <ul className={styles.plain}>
                {p.medications.map((m, i) => (
                  <li key={i}><strong>{m.name}</strong> {m.dose} · {m.frequency}{m.indication && <span className="ui-muted"> — {m.indication}</span>}</li>
                ))}
              </ul>
            ) : <p className="ui-muted">None recorded.</p>}
          </Block>
          <Block title="Current presentation">
            {p.symptoms.length ? (
              <ul className={styles.plain}>{p.symptoms.map((s, i) => <li key={i}>{s.name}{s.days && <span className="ui-muted"> — {s.days} days</span>}</li>)}</ul>
            ) : <p className="ui-muted">No current symptoms recorded.</p>}
            {p.prescriptions.length > 0 && (
              <p className="ui-muted" style={{ marginTop: 6 }}>Last prescribed: {p.prescriptions.map((r) => `${r.name} ${r.dosage}`).join(', ')}</p>
            )}
          </Block>
          {p.notes && <Block title="Clinical notes"><p className={styles.text}>{p.notes}</p></Block>}
          <Block title="History">
            {p.socialHistory && <p className={styles.text}><strong>Social:</strong> {p.socialHistory}</p>}
            {p.familyHistory && <p className={styles.text}><strong>Family:</strong> {p.familyHistory}</p>}
            {p.immunizations?.length ? <p className={styles.text}><strong>Immunizations:</strong> {p.immunizations.join('; ')}</p> : null}
            {!p.socialHistory && !p.familyHistory && !p.immunizations?.length && <p className="ui-muted">Not recorded.</p>}
          </Block>
          <Block title="Contact">
            <p className={styles.text}>{[p.phone, p.email].filter(Boolean).join(' · ') || 'Not recorded'}</p>
            {p.address && <p className={styles.text}>{p.address}</p>}
            {p.emergencyContact && <p className={styles.text}><strong>Emergency:</strong> {p.emergencyContact.name} ({p.emergencyContact.relation}) {p.emergencyContact.phone}</p>}
            {p.insurance && <p className={styles.text}><strong>Insurance:</strong> {p.insurance}</p>}
          </Block>
        </div>
      )}

      {tab === 'results' && (
        <>
          {v ? (
            <div className={styles.vitals}>
              {[
                ['BP', `${v.bloodPressure}`],
                ['Heart rate', `${v.heartRate}/min`],
                ['Temp', `${v.temperatureC} °C`],
                ['Resp. rate', `${v.respiratoryRate}/min`],
                ['SpO₂', `${v.spo2}%`],
                ['Weight', `${v.weightKg} kg`],
                ['Height', `${v.heightCm} cm`],
                ['BMI', bmi ? String(bmi) : '–'],
              ].map(([k, val]) => (
                <div key={k} className={styles.vital}><span className="ui-muted">{k}</span><strong>{val}</strong></div>
              ))}
              <span className="ui-muted" style={{ gridColumn: '1 / -1', fontSize: '0.75rem' }}>Recorded {fmtDate(v.recordedOn)}</span>
            </div>
          ) : <p className="ui-muted">No vitals recorded.</p>}
          {p.labResults?.length ? (
            <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
              <table className="ui-table">
                <thead><tr><th>Test</th><th>Result</th><th>Reference</th><th>Date</th><th /></tr></thead>
                <tbody>
                  {[...p.labResults].sort((a, b) => b.date.localeCompare(a.date)).map((l, i) => (
                    <tr key={i}>
                      <td>{l.test}</td>
                      <td><strong>{l.value}</strong> {l.unit}</td>
                      <td className="ui-muted">{l.referenceRange}</td>
                      <td className="ui-muted">{fmtDate(l.date)}</td>
                      <td>{l.flag && <span className={/low/i.test(l.flag) ? 'ui-badge ui-badge-blue' : 'ui-badge ui-badge-red'}>{l.flag}</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <p className="ui-muted" style={{ marginTop: '1rem' }}>No lab results.</p>}
        </>
      )}

      {tab === 'history' && (
        <div className={styles.timeline}>
          {[
            ...(p.visits ?? []).map((visit) => ({ key: `v-${visit.date}-${visit.reason}`, date: visit.date, title: visit.reason, sub: visit.diagnosis, notes: visit.notes })),
            ...record.consultations.map((c) => ({
              key: c._id,
              date: new Date(c.createdAt).toISOString().slice(0, 10),
              title: `Consultation${c.diagnosis ? `: ${c.diagnosis}` : ''}`,
              sub: c.prescriptions.map((r) => `${r.name} ${r.dosage}`).join(', '),
              notes: c.aiReview ? 'AI review attached' : c.notes ?? '',
            })),
          ]
            .sort((a, b) => b.date.localeCompare(a.date))
            .filter((item, i, arr) => !(item.title.startsWith('Consultation') && arr.some((x, j) => j !== i && x.date === item.date && !x.title.startsWith('Consultation'))))
            .map((item) => (
              <div key={item.key} className={styles.timelineItem}>
                <span className={styles.timelineDate}>{fmtDate(item.date)}</span>
                <div>
                  <strong>{item.title}</strong>
                  {item.sub && <p className="ui-muted">{item.sub}</p>}
                  {item.notes && <p className={styles.text}>{item.notes}</p>}
                </div>
              </div>
            ))}
          {!p.visits?.length && record.consultations.length === 0 && <p className="ui-muted">No visits recorded.</p>}
          {record.predictions.length > 0 && (
            <Block title="Recent symptom-model predictions">
              <ul className={styles.plain}>
                {record.predictions.map((x) => (
                  <li key={x._id}>{fmtDate(new Date(x.createdAt).toISOString().slice(0, 10))}: <strong>{x.diseaseName}</strong> ({x.confidence}%) <span className="ui-muted">from {x.symptoms.join(', ')}</span></li>
                ))}
              </ul>
            </Block>
          )}
        </div>
      )}

      {tab === 'appointments' && (
        record.appointments.length ? (
          <ul className={styles.plain}>
            {record.appointments.map((a) => (
              <li key={a._id} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span>{fmtDay(a.startsAt)} {fmtTime(a.startsAt)}</span>
                <span className="ui-badge">{TYPE_LABEL[a.type]}</span>
                <span className={STATUS_BADGE[a.status]}>{STATUS_LABEL[a.status]}</span>
                <span className="ui-muted">{a.reason}</span>
              </li>
            ))}
          </ul>
        ) : <p className="ui-muted">No appointments. Book one from the Appointments page.</p>
      )}

      {tab === 'documents' && (
        <PatientDocuments patientId={p._id} documents={documents} onRemove={(docId) => removeDocument({ id: docId }).catch((err) => setError(errorMessage(err)))} />
      )}
    </section>
  );
}

function PatientDocuments({
  patientId,
  documents,
  onRemove,
}: {
  patientId: Id<'patients'>;
  documents: { _id: Id<'documents'>; name: string; status: string; size: number; createdAt: number; textLength: number }[] | undefined;
  onRemove: (id: Id<'documents'>) => void;
}) {
  const { token } = useAuth();
  const assistant = useAssistantStatus();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => setMessage(''), [patientId]);

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setMessage('');
    for (const file of Array.from(files)) {
      try {
        const result = await uploadDocument({
          file,
          patientId,
          token,
          llmConfigured: Boolean(assistant?.llmConfigured),
          onStage: (stage) => setBusy(`${file.name}: ${stage}…`),
        });
        setMessage(result.note ?? `${file.name} uploaded and indexed${result.truncated ? ' (text truncated at 400,000 characters)' : ''}.`);
      } catch (err) {
        setMessage(err instanceof Error ? err.message : 'Upload failed');
      }
    }
    setBusy('');
    if (input.current) input.current.value = '';
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <button className="ui-btn ui-btn-outline ui-btn-sm" onClick={() => input.current?.click()} disabled={Boolean(busy)}>
          <UploadIcon size={14} /> Upload lab report, letter or image
        </button>
        <input ref={input} type="file" multiple hidden accept={ACCEPTED_FILES} onChange={(e) => upload(e.target.files)} />
        {busy && <span className="ui-muted"><span className="ui-spin" /> {busy}</span>}
        {message && !busy && <span className="ui-muted">{message}</span>}
      </div>
      {documents === undefined ? (
        <p className="ui-muted">Loading…</p>
      ) : documents.length === 0 ? (
        <p className="ui-muted">No documents. Uploaded files are searchable by the AI assistant.</p>
      ) : (
        <ul className={styles.plain}>
          {documents.map((d) => (
            <li key={d._id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <FileIcon size={14} />
              <span style={{ flex: 1 }}>{d.name} <span className="ui-muted">· {(d.size / 1024).toFixed(0)} KB · {new Date(d.createdAt).toLocaleDateString()}</span></span>
              <span className={d.status === 'ready' ? 'ui-badge ui-badge-green' : d.status === 'failed' ? 'ui-badge ui-badge-red' : 'ui-badge ui-badge-amber'}>
                {d.status === 'ready' ? 'Indexed' : d.status === 'failed' ? 'No text' : 'Awaiting transcription'}
              </span>
              <button className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => confirm(`Delete ${d.name}?`) && onRemove(d._id)} aria-label={`Delete ${d.name}`}>
                <TrashIcon size={13} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className={styles.block}>
      <h3 className={styles.blockTitle}>{title}</h3>
      {children}
    </div>
  );
}
