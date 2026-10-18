import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useAction, useMutation, useQuery } from 'convex/react';
import type { Doc } from '../../../convex/_generated/dataModel';
import { api } from '@/convex/api';
import { errorMessage } from '@/convex/client';
import PatientPicker from '@/components/PatientPicker';
import { SparklesIcon, StethoscopeIcon, AlertTriangleIcon, XIcon } from '@/components/ui/Icons';
import styles from './PredictionPage.module.css';

const COMMON_SYMPTOMS = [
  'Fever', 'Cough', 'Shortness of breath', 'Chest pain', 'Fatigue', 'Headache', 'Nausea', 'Vomiting',
  'Diarrhea', 'Abdominal pain', 'Sore throat', 'Runny nose', 'Body aches', 'Joint pain', 'Dizziness',
  'Rash', 'Itching', 'Swelling', 'Weight loss', 'Increased thirst', 'Frequent urination', 'Painful urination',
  'Back pain', 'Blurred vision', 'Heartburn', 'Palpitations', 'Wheezing', 'Night sweats', 'Insomnia', 'Anxiety',
];

function useDebounced<T>(value: T, ms = 200): T {
  const [v, setV] = useState(value);
  const key = JSON.stringify(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ms]);
  return v;
}

const tone = (p: number) => (p >= 60 ? '#16A34A' : p >= 25 ? '#CA8A04' : '#6B7280');

export default function PredictionPage() {
  const known = useQuery(api.functions.predict.knownSymptoms, {});
  const ml = useQuery(api.functions.predict.mlStatus, {});
  const recent = useQuery(api.functions.predict.getPredictions, { limit: 8 });
  const save = useMutation(api.functions.predict.predictHealth);
  const askMl = useAction(api.functions.predict.predictWithMlService);

  const [patient, setPatient] = useState<Doc<'patients'> | null>(null);
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [days, setDays] = useState('');
  const [symptoms, setSymptoms] = useState<string[]>([]);
  const [draft, setDraft] = useState('');
  const [message, setMessage] = useState<{ kind: 'success' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [mlResult, setMlResult] = useState<{ name: string; probability: number }[] | null>(null);

  const ageNum = parseInt(age, 10);
  const args = useDebounced({
    symptoms,
    age: Number.isFinite(ageNum) ? ageNum : undefined,
    gender,
    durationDays: parseInt(days, 10) || undefined,
    patientId: patient?._id,
  });
  const result = useQuery(api.functions.predict.preview, args.symptoms.length ? args : 'skip');

  const add = (raw: string) => {
    const parts = raw.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
    setSymptoms((prev) => [...prev, ...parts.filter((p) => !prev.some((x) => x.toLowerCase() === p.toLowerCase()))].slice(0, 30));
    setDraft('');
    setMlResult(null);
  };
  const remove = (s: string) => {
    setSymptoms((prev) => prev.filter((x) => x !== s));
    setMlResult(null);
  };
  const replace = (from: string, to: string) => setSymptoms((prev) => prev.map((x) => (x === from ? to : x)));
  const toggle = (s: string) => (symptoms.includes(s) ? remove(s) : add(s));

  const choosePatient = (p: Doc<'patients'> | null) => {
    setPatient(p);
    if (p) {
      setAge(String(p.age));
      setGender(p.gender);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (draft.trim()) add(draft);
  };

  const record = async () => {
    setBusy(true);
    setMessage(null);
    try {
      await save({ ...args, symptoms });
      setMessage({ kind: 'success', text: `Prediction saved${patient ? ` to ${patient.name}'s record` : ''}.` });
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const compareMl = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const r = await askMl({ ...args, symptoms });
      setMlResult(r.ranking.map((x) => ({ name: x.name, probability: x.probability })));
      if (r.source !== 'ml-service') setMessage({ kind: 'error', text: 'The ML service did not answer; the built-in model was used.' });
    } catch (err) {
      setMessage({ kind: 'error', text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  };

  const top = result?.ranking[0];
  const suggestionsFor = useMemo(() => result?.suggestions ?? {}, [result]);

  return (
    <div className={styles.container}>
      <header className={styles.pageHeader}>
        <StethoscopeIcon size={30} className={styles.headerIcon} />
        <div>
          <h1 className="ui-title">Health Prediction</h1>
          <p className="ui-subtitle">
            Results update instantly as you add symptoms. Age, sex and duration are taken into account; red flags are shown first.
          </p>
        </div>
      </header>

      <div className={styles.layout}>
        <form className="ui-card" onSubmit={onSubmit}>
          <h2 className={styles.sectionTitle}>Patient</h2>
          <PatientPicker value={patient?._id ?? null} onChange={choosePatient} placeholder="Optional: use an existing patient (age, sex, allergies)" />
          <div className={styles.formGrid}>
            <div>
              <label className="ui-label" htmlFor="pred-age">Age</label>
              <input id="pred-age" className="ui-input" type="number" min={0} max={130} value={age} onChange={(e) => setAge(e.target.value)} placeholder="Years" />
            </div>
            <div>
              <label className="ui-label" htmlFor="pred-gender">Sex</label>
              <select id="pred-gender" className="ui-input" value={gender} onChange={(e) => setGender(e.target.value)}>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Other">Other / not stated</option>
              </select>
            </div>
            <div>
              <label className="ui-label" htmlFor="pred-days">Duration (days)</label>
              <input id="pred-days" className="ui-input" type="number" min={0} value={days} onChange={(e) => setDays(e.target.value)} placeholder="Optional" />
            </div>
          </div>

          <h2 className={styles.sectionTitle} style={{ marginTop: '1.25rem' }}>Symptoms</h2>
          <div className={styles.addRow}>
            <input
              className="ui-input"
              list="known-symptoms"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type a symptom (lay terms work: 'throwing up', 'SOB') and press Enter"
              aria-label="Add symptom"
            />
            <button type="submit" className="ui-btn ui-btn-primary" disabled={!draft.trim()}>Add</button>
            <datalist id="known-symptoms">{(known ?? []).map((s) => <option key={s} value={s} />)}</datalist>
          </div>
          {symptoms.length > 0 && (
            <div className={styles.selected}>
              {symptoms.map((s) => (
                <span key={s} className={styles.selectedChip}>
                  {s}
                  <button type="button" onClick={() => remove(s)} aria-label={`Remove ${s}`}><XIcon size={12} /></button>
                </span>
              ))}
              <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => setSymptoms([])}>Clear all</button>
            </div>
          )}
          <p className="ui-muted" style={{ margin: '0.75rem 0 0.4rem', fontSize: '0.78rem' }}>Common symptoms</p>
          <div className={styles.chips}>
            {COMMON_SYMPTOMS.map((s) => (
              <button key={s} type="button" className={`${styles.chip} ${symptoms.includes(s) ? styles.chipActive : ''}`} onClick={() => toggle(s)}>
                {s}
              </button>
            ))}
          </div>
        </form>

        <section className="ui-card">
          {symptoms.length === 0 ? (
            <div className="ui-empty">
              <SparklesIcon size={28} style={{ margin: '0 auto 0.5rem' }} />
              Add symptoms to see a ranked differential.
            </div>
          ) : !result ? (
            <p className="ui-muted"><span className="ui-spin" /> Calculating…</p>
          ) : (
            <>
              {result.redFlags.map((f) => (
                <div key={f.id} className="ui-alert ui-alert-error" style={{ marginBottom: '0.5rem' }}>
                  <AlertTriangleIcon size={16} />
                  <span><strong>{f.title}.</strong> {f.advice}</span>
                </div>
              ))}
              {result.unmatchedSymptoms.length > 0 && (
                <div className="ui-alert ui-alert-warning" style={{ marginBottom: '0.75rem' }}>
                  <span>
                    Not recognised (ignored):{' '}
                    {result.unmatchedSymptoms.map((u) => (
                      <span key={u} style={{ marginRight: 8 }}>
                        <strong>{u}</strong>
                        {suggestionsFor[u]?.length ? (
                          <> - did you mean{' '}
                            {suggestionsFor[u].map((s) => (
                              <button key={s} type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => replace(u, s)}>{s}</button>
                            ))}
                          </>
                        ) : null}
                      </span>
                    ))}
                  </span>
                </div>
              )}
              {result.negated.length > 0 && <p className="ui-muted" style={{ fontSize: '0.78rem' }}>Treated as absent: {result.negated.join(', ')}</p>}

              {top ? (
                <>
                  <div className={styles.top}>
                    <div>
                      <span className="ui-muted" style={{ fontSize: '0.75rem' }}>Most likely in the knowledge base</span>
                      <h2 className={styles.topName}>{top.name} {top.urgent && <span className="ui-badge ui-badge-red">urgent</span>}</h2>
                      <p className="ui-muted">{top.description} · {top.category}</p>
                    </div>
                    <span className={styles.topPct} style={{ color: tone(top.probability) }}>{top.probability}%</span>
                  </div>
                  <table className="ui-table" style={{ marginTop: '1rem' }}>
                    <thead><tr><th>Condition</th><th style={{ width: '38%' }}>Probability</th><th>Explains</th><th>Ask about</th></tr></thead>
                    <tbody>
                      {result.ranking.map((r) => (
                        <tr key={r.name}>
                          <td><strong>{r.name}</strong>{r.urgent && <span className="ui-badge ui-badge-red" style={{ marginLeft: 4 }}>urgent</span>}</td>
                          <td>
                            <div className={styles.bar}><span style={{ width: `${Math.max(2, r.probability)}%`, background: tone(r.probability) }} /></div>
                            <span className="ui-muted" style={{ fontSize: '0.75rem' }}>{r.probability}% · covers {r.coverage}% of its profile</span>
                          </td>
                          <td className="ui-muted">{r.matchedSymptoms.join(', ')}</td>
                          <td className="ui-muted">{r.askAbout.join(', ') || '–'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  <h3 className={styles.sectionTitle} style={{ marginTop: '1.25rem' }}>Treatment options for {top.name}</h3>
                  {result.safetyWarnings.length > 0 && (
                    <div className="ui-alert ui-alert-error" style={{ marginBottom: '0.5rem' }}>
                      <AlertTriangleIcon size={16} />
                      <span>{result.safetyWarnings.map((w) => w.message).join('; ')}</span>
                    </div>
                  )}
                  {result.medicines.length === 0 ? (
                    <p className="ui-muted">{result.treatmentNotes.join(' ') || 'No medicine recommendations in the knowledge base.'}</p>
                  ) : (
                    <ul className={styles.meds}>
                      {result.medicines.map((m) => (
                        <li key={m.name} className={m.warnings.length ? styles.medWarn : undefined}>
                          <div className={styles.medHead}>
                            <strong>{m.name}</strong>
                            <span className="ui-badge" title="How commonly it is used for this condition in the knowledge base">usage {m.confidence}%</span>
                          </div>
                          <span className="ui-muted" style={{ fontSize: '0.78rem' }}>
                            {[m.dosage, m.frequency, m.duration].filter(Boolean).join(' · ') || 'Dosage not specified in the knowledge base'}
                          </span>
                          {m.contraindications && <span style={{ fontSize: '0.75rem', color: 'var(--color-warning)' }}>Contraindications: {m.contraindications}</span>}
                          {m.warnings.map((w) => <span key={w} style={{ fontSize: '0.75rem', color: 'var(--color-error)', fontWeight: 600 }}>⚠ {w}</span>)}
                        </li>
                      ))}
                    </ul>
                  )}
                  {result.treatmentNotes.length > 0 && result.medicines.length > 0 && <p className="ui-muted" style={{ marginTop: 6 }}>{result.treatmentNotes.join(' ')}</p>}

                  <div className={styles.actions}>
                    <button className="ui-btn ui-btn-primary" onClick={record} disabled={busy}>
                      <SparklesIcon size={14} /> Save prediction{patient ? ' to record' : ''}
                    </button>
                    {ml?.configured && (
                      <button className="ui-btn ui-btn-outline" onClick={compareMl} disabled={busy}>Compare with ML service</button>
                    )}
                    {busy && <span className="ui-spin" />}
                    {message && <span className={message.kind === 'success' ? 'ui-badge ui-badge-green' : 'ui-badge ui-badge-red'}>{message.text}</span>}
                  </div>
                  {mlResult && (
                    <p className="ui-muted" style={{ marginTop: '0.5rem' }}>
                      ML service: {mlResult.map((r) => `${r.name} ${r.probability}%`).join(' · ')}
                    </p>
                  )}
                </>
              ) : (
                <p className="ui-empty">No condition in the knowledge base matches these symptoms.</p>
              )}

              <div className={styles.disclaimer}>
                <AlertTriangleIcon size={14} />
                <p>
                  Model {result.model}: naive-Bayes ranking over a demonstration knowledge base. Probabilities are relative to that
                  knowledge base, not calibrated clinical probabilities, and this is not a diagnosis. A clinician must verify every suggestion.
                </p>
              </div>
            </>
          )}
        </section>
      </div>

      {recent && recent.length > 0 && (
        <section className="ui-card" style={{ marginTop: '1rem' }}>
          <div className="ui-card-title">Recent saved predictions</div>
          <table className="ui-table">
            <thead><tr><th>When</th><th>Top condition</th><th>Symptoms</th><th>Source</th></tr></thead>
            <tbody>
              {recent.map((p) => (
                <tr key={p.id}>
                  <td className="ui-muted">{new Date(p.createdAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td><strong>{p.diseaseName}</strong> <span className="ui-muted">{p.confidence}%</span></td>
                  <td className="ui-muted">{p.symptoms.join(', ')}</td>
                  <td><span className="ui-badge">{p.source}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}
    </div>
  );
}
