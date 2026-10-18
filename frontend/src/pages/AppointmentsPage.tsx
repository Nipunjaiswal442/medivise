import { useMemo, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { api } from '@/convex/api';
import { errorMessage } from '@/convex/client';
import { useAuth } from '@/context/AuthContext';
import PatientPicker from '@/components/PatientPicker';
import LoadSamplesButton from '@/components/LoadSamplesButton';
import Markdown from '@/components/ui/Markdown';
import { CalendarIcon, ChevronLeftIcon, ChevronRightIcon, PlusCircleIcon, SparklesIcon, XIcon } from '@/components/ui/Icons';
import {
  STATUS_BADGE,
  STATUS_LABEL,
  TYPE_LABEL,
  type AppointmentStatus,
  type AppointmentType,
} from '@/components/appointmentLabels';
import { useAssistantStatus } from '@/hooks/useAssistantStatus';
import { askAssistant } from '@/services/assistant';
import { addDays, fmtDay, fmtTime, isoLocalDate, startOfDay } from '@/lib/time';
import styles from './AppointmentsPage.module.css';

type View = 'day' | 'week';
const DURATIONS = [10, 15, 20, 30, 45, 60, 90];
const TYPES = Object.keys(TYPE_LABEL) as AppointmentType[];
const ACTIVE: AppointmentStatus[] = ['scheduled', 'checked-in', 'in-progress'];

interface Brief {
  title: string;
  text: string;
  loading: boolean;
  error?: string;
}

export default function AppointmentsPage() {
  const [view, setView] = useState<View>('day');
  const [day, setDay] = useState(() => startOfDay());
  const weekStart = useMemo(() => {
    const d = new Date(day);
    const offset = (d.getDay() + 6) % 7; // Monday first
    return addDays(day, -offset);
  }, [day]);
  const from = view === 'day' ? day : weekStart;
  const to = view === 'day' ? addDays(day, 1) : addDays(weekStart, 7);

  const appointments = useQuery(api.functions.appointments.listRange, { from, to });
  const patients = useQuery(api.functions.patients.getPatients, {});
  const setStatus = useMutation(api.functions.appointments.setStatus);
  const remove = useMutation(api.functions.appointments.remove);
  const { token } = useAuth();
  const assistant = useAssistantStatus();

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<NonNullable<typeof appointments>[number] | null>(null);
  const [brief, setBrief] = useState<Brief | null>(null);
  const [actionError, setActionError] = useState('');
  const briefAbort = useRef<AbortController | null>(null);

  const counts = useMemo(() => {
    const list = appointments ?? [];
    return {
      total: list.filter((a) => a.status !== 'cancelled').length,
      completed: list.filter((a) => a.status === 'completed').length,
      remaining: list.filter((a) => ACTIVE.includes(a.status)).length,
      noShows: list.filter((a) => a.status === 'no-show').length,
    };
  }, [appointments]);

  const shift = (n: number) => setDay(addDays(day, view === 'day' ? n : 7 * n));

  const changeStatus = async (id: Id<'appointments'>, status: AppointmentStatus) => {
    setActionError('');
    try {
      await setStatus({ id, status });
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const runBrief = async (title: string, prompt: string, patientId?: string) => {
    if (!token) return;
    briefAbort.current?.abort();
    const controller = new AbortController();
    briefAbort.current = controller;
    setBrief({ title, text: '', loading: true });
    try {
      const text = await askAssistant({
        token,
        messages: [{ role: 'user', content: prompt }],
        patientId,
        signal: controller.signal,
        onText: (t) => setBrief((b) => (b && !controller.signal.aborted ? { ...b, text: t } : b)),
      });
      setBrief((b) => (b ? { ...b, text, loading: false } : b));
    } catch (err) {
      if (controller.signal.aborted) return;
      setBrief((b) => (b ? { ...b, loading: false, error: err instanceof Error ? err.message : 'The assistant failed' } : b));
    }
  };

  const briefFor = (a: NonNullable<typeof appointments>[number]) =>
    runBrief(
      `Pre-visit brief: ${a.patient?.name ?? 'patient'}`,
      `Prepare a pre-visit brief for my ${TYPE_LABEL[a.type].toLowerCase()} with ${a.patient?.name} (${a.patient?.customId}) at ${fmtTime(a.startsAt)} on ${fmtDay(a.startsAt)}. Reason for visit: ${a.reason}. Open their full record, check medications and allergies for problems, and flag anything overdue or abnormal.`,
      a.patient?._id,
    );

  const briefDay = () =>
    runBrief(
      `Clinic summary: ${fmtDay(day)}`,
      `Summarise my clinic for ${fmtDay(day)} (${isoLocalDate(day)}). List each appointment in time order with a one-line clinical focus, and then list the patients who need extra preparation (abnormal results, safety issues with their medicines, overdue items).`,
    );

  const days = view === 'day' ? [day] : Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const llmReady = Boolean(assistant?.llmConfigured && token);

  return (
    <div className={styles.page}>
      <header className="ui-page-header">
        <div>
          <h1 className="ui-title">Appointments</h1>
          <p className="ui-subtitle">
            {view === 'day' ? fmtDay(day) : `Week of ${fmtDay(weekStart)}`}
            {appointments && ` · ${counts.total} booked · ${counts.remaining} remaining · ${counts.completed} completed${counts.noShows ? ` · ${counts.noShows} no-show` : ''}`}
          </p>
        </div>
        <div className={styles.toolbar}>
          <div className={styles.segmented}>
            <button className={view === 'day' ? styles.segActive : ''} onClick={() => setView('day')}>Day</button>
            <button className={view === 'week' ? styles.segActive : ''} onClick={() => setView('week')}>Week</button>
          </div>
          <button className="ui-btn ui-btn-outline ui-btn-sm" onClick={() => shift(-1)} aria-label="Previous">
            <ChevronLeftIcon size={14} />
          </button>
          <button className="ui-btn ui-btn-outline ui-btn-sm" onClick={() => setDay(startOfDay())}>Today</button>
          <button className="ui-btn ui-btn-outline ui-btn-sm" onClick={() => shift(1)} aria-label="Next">
            <ChevronRightIcon size={14} />
          </button>
          <input
            type="date"
            className="ui-input"
            style={{ width: 'auto', padding: '0.35rem 0.5rem' }}
            value={isoLocalDate(day)}
            onChange={(e) => e.target.value && setDay(startOfDay(new Date(`${e.target.value}T00:00:00`)))}
            aria-label="Choose date"
          />
          {view === 'day' && (
            <button
              className="ui-btn ui-btn-outline ui-btn-sm"
              onClick={briefDay}
              disabled={!llmReady || !appointments?.length}
              title={llmReady ? 'Summarise this day with the AI assistant' : 'Configure ANTHROPIC_API_KEY to enable'}
            >
              <SparklesIcon size={14} /> Day summary
            </button>
          )}
          <button className="ui-btn ui-btn-primary ui-btn-sm" onClick={() => { setEditing(null); setShowForm(true); }} disabled={!patients?.length}>
            <PlusCircleIcon size={14} /> New appointment
          </button>
        </div>
      </header>

      {patients && patients.length === 0 && (
        <div className="ui-card" style={{ marginBottom: '1rem' }}>
          <div className="ui-card-title">No patients yet</div>
          <p className="ui-muted" style={{ marginBottom: '0.75rem' }}>
            Appointments are booked for existing patients. Add one from a consultation, or load the sample patients (this also schedules a week of sample appointments).
          </p>
          <LoadSamplesButton />
        </div>
      )}

      {actionError && <div className="ui-alert ui-alert-error" style={{ marginBottom: '1rem' }}>{actionError}</div>}

      <div className={brief ? styles.withPanel : undefined}>
        <div className={view === 'week' ? styles.week : undefined}>
          {days.map((d) => {
            const list = (appointments ?? []).filter((a) => a.startsAt >= d && a.startsAt < addDays(d, 1));
            return (
              <section key={d} className={view === 'week' ? styles.weekDay : undefined}>
                {view === 'week' && (
                  <button className={`${styles.weekHeader} ${d === startOfDay() ? styles.today : ''}`} onClick={() => { setDay(d); setView('day'); }}>
                    {fmtDay(d)} <span className="ui-muted">({list.filter((a) => a.status !== 'cancelled').length})</span>
                  </button>
                )}
                {appointments === undefined ? (
                  <p className="ui-muted">Loading…</p>
                ) : list.length === 0 ? (
                  <p className={view === 'day' ? 'ui-empty' : 'ui-muted'} style={view === 'week' ? { fontSize: '0.78rem', padding: '0.5rem' } : undefined}>
                    {view === 'day' ? 'No appointments on this day.' : 'Free'}
                  </p>
                ) : (
                  <ul className={styles.list}>
                    {list.map((a) =>
                      view === 'week' ? (
                        <li key={a._id} className={`${styles.compact} ${a.status === 'cancelled' ? styles.cancelled : ''}`} onClick={() => { setDay(d); setView('day'); }}>
                          <strong>{fmtTime(a.startsAt)}</strong> {a.patient?.name}
                          <span className="ui-muted">{a.reason}</span>
                        </li>
                      ) : (
                        <li key={a._id} className={`ui-card ${styles.item} ${a.status === 'cancelled' ? styles.cancelled : ''}`}>
                          <div className={styles.timeCol}>
                            <span className={styles.time}>{fmtTime(a.startsAt)}</span>
                            <span className="ui-muted">{a.durationMinutes} min</span>
                          </div>
                          <div className={styles.body}>
                            <div className={styles.titleRow}>
                              <Link to={`/patients?id=${a.patientId}`} className={styles.patient}>
                                {a.patient ? `${a.patient.name}` : 'Unknown patient'}
                              </Link>
                              {a.patient && <span className="ui-muted">{a.patient.customId} · {a.patient.age} {a.patient.gender.charAt(0)}</span>}
                              <span className={STATUS_BADGE[a.status]}>{STATUS_LABEL[a.status]}</span>
                              <span className="ui-badge">{TYPE_LABEL[a.type]}</span>
                              {a.location && <span className="ui-badge ui-badge-gray">{a.location}</span>}
                            </div>
                            <p className={styles.reason}>{a.reason}</p>
                            {a.patient && (a.patient.allergies.length > 0 || a.patient.chronicConditions.length > 0) && (
                              <p className="ui-muted" style={{ fontSize: '0.78rem' }}>
                                {a.patient.allergies.length > 0 && <span className="ui-badge ui-badge-red" style={{ marginRight: 6 }}>Allergies: {a.patient.allergies.join(', ')}</span>}
                                {a.patient.chronicConditions.slice(0, 3).join(' · ')}
                              </p>
                            )}
                            {a.notes && <p className="ui-muted" style={{ fontSize: '0.8rem' }}>Note: {a.notes}</p>}
                            <div className={styles.actions}>
                              {a.status === 'scheduled' && (
                                <button className="ui-btn ui-btn-outline ui-btn-sm" onClick={() => changeStatus(a._id, 'checked-in')}>Check in</button>
                              )}
                              {ACTIVE.includes(a.status) && (
                                <Link
                                  to={`/consultation?appointment=${a._id}`}
                                  className="ui-btn ui-btn-primary ui-btn-sm"
                                  onClick={() => a.status !== 'in-progress' && changeStatus(a._id, 'in-progress')}
                                >
                                  Start consultation
                                </Link>
                              )}
                              <button
                                className="ui-btn ui-btn-outline ui-btn-sm"
                                onClick={() => briefFor(a)}
                                disabled={!llmReady}
                                title={llmReady ? 'Prepare a pre-visit brief with the AI assistant' : 'Configure ANTHROPIC_API_KEY to enable'}
                              >
                                <SparklesIcon size={13} /> AI brief
                              </button>
                              {ACTIVE.includes(a.status) && (
                                <>
                                  <button className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => changeStatus(a._id, 'completed')}>Mark completed</button>
                                  <button className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => changeStatus(a._id, 'no-show')}>No-show</button>
                                  <button className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => changeStatus(a._id, 'cancelled')}>Cancel</button>
                                </>
                              )}
                              {(a.status === 'cancelled' || a.status === 'no-show') && (
                                <button className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => changeStatus(a._id, 'scheduled')}>Restore</button>
                              )}
                              <button className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => { setEditing(a); setShowForm(true); }}>Reschedule / edit</button>
                              <button
                                className="ui-btn ui-btn-ghost ui-btn-sm"
                                onClick={() => {
                                  if (confirm(`Delete the appointment with ${a.patient?.name ?? 'this patient'}?`)) void remove({ id: a._id }).catch((err) => setActionError(errorMessage(err)));
                                }}
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        </li>
                      ),
                    )}
                  </ul>
                )}
              </section>
            );
          })}
        </div>

        {brief && (
          <aside className={`ui-card ${styles.panel}`}>
            <div className="ui-card-title">
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><SparklesIcon size={15} /> {brief.title}</span>
              <span style={{ display: 'flex', gap: 4 }}>
                {!brief.loading && brief.text && (
                  <button className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => navigator.clipboard?.writeText(brief.text)}>Copy</button>
                )}
                <button className="ui-btn ui-btn-ghost ui-btn-sm" onClick={() => { briefAbort.current?.abort(); setBrief(null); }} aria-label="Close">
                  <XIcon size={14} />
                </button>
              </span>
            </div>
            {brief.error && <div className="ui-alert ui-alert-error">{brief.error}</div>}
            {brief.text ? <Markdown>{brief.text}</Markdown> : brief.loading && <p className="ui-muted"><span className="ui-spin" /> Reading the record…</p>}
            <p className="ui-muted" style={{ fontSize: '0.72rem', marginTop: '1rem' }}>
              AI-generated from the patient record. Verify before acting on it.
            </p>
          </aside>
        )}
      </div>

      {showForm && (
        <AppointmentForm
          key={editing?._id ?? 'new'}
          initialDay={day}
          editing={editing}
          onClose={() => setShowForm(false)}
          onSaved={(startsAt) => {
            setShowForm(false);
            setDay(startOfDay(startsAt));
          }}
        />
      )}
    </div>
  );
}

function AppointmentForm({
  initialDay,
  editing,
  onClose,
  onSaved,
}: {
  initialDay: number;
  editing: (Doc<'appointments'> & { patient: { _id: Id<'patients'>; name: string } | null }) | null;
  onClose: () => void;
  onSaved: (startsAt: number) => void;
}) {
  const create = useMutation(api.functions.appointments.create);
  const update = useMutation(api.functions.appointments.update);
  const [patientId, setPatientId] = useState<Id<'patients'> | null>(editing?.patientId ?? null);
  const [date, setDate] = useState(isoLocalDate(editing?.startsAt ?? initialDay));
  const [time, setTime] = useState(editing ? fmtTime(editing.startsAt) : '09:00');
  const [duration, setDuration] = useState(editing?.durationMinutes ?? 20);
  const [type, setType] = useState<AppointmentType>(editing?.type ?? 'follow-up');
  const [reason, setReason] = useState(editing?.reason ?? '');
  const [location, setLocation] = useState(editing?.location ?? '');
  const [notes, setNotes] = useState(editing?.notes ?? '');
  const [allowOverlap, setAllowOverlap] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    if (!patientId) return setError('Choose a patient');
    if (!reason.trim()) return setError('Add a reason for the visit');
    const startsAt = new Date(`${date}T${time}:00`).getTime();
    if (Number.isNaN(startsAt)) return setError('Choose a valid date and time');
    setSaving(true);
    try {
      if (editing) {
        await update({ id: editing._id, startsAt, durationMinutes: duration, type, reason, location: location || undefined, notes: notes || undefined, allowOverlap });
      } else {
        await create({ patientId, startsAt, durationMinutes: duration, type, reason, location: location || undefined, notes: notes || undefined, allowOverlap });
      }
      onSaved(startsAt);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.modalBackdrop} onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <form className={`ui-card ${styles.modal}`} onSubmit={submit}>
        <div className="ui-card-title">
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><CalendarIcon size={16} /> {editing ? 'Edit appointment' : 'New appointment'}</span>
          <button type="button" className="ui-btn ui-btn-ghost ui-btn-sm" onClick={onClose} aria-label="Close"><XIcon size={14} /></button>
        </div>
        <div className={styles.formGrid}>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="ui-label" htmlFor="appt-patient">Patient</label>
            {editing ? (
              <input id="appt-patient" className="ui-input" value={editing.patient?.name ?? ''} disabled />
            ) : (
              <PatientPicker id="appt-patient" value={patientId} onChange={(p) => setPatientId(p?._id ?? null)} allowClear={false} />
            )}
          </div>
          <div>
            <label className="ui-label" htmlFor="appt-date">Date</label>
            <input id="appt-date" type="date" className="ui-input" value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>
          <div>
            <label className="ui-label" htmlFor="appt-time">Time</label>
            <input id="appt-time" type="time" className="ui-input" value={time} onChange={(e) => setTime(e.target.value)} step={300} required />
          </div>
          <div>
            <label className="ui-label" htmlFor="appt-duration">Duration</label>
            <select id="appt-duration" className="ui-input" value={duration} onChange={(e) => setDuration(Number(e.target.value))}>
              {DURATIONS.map((d) => <option key={d} value={d}>{d} minutes</option>)}
            </select>
          </div>
          <div>
            <label className="ui-label" htmlFor="appt-type">Type</label>
            <select id="appt-type" className="ui-input" value={type} onChange={(e) => setType(e.target.value as AppointmentType)}>
              {TYPES.map((t) => <option key={t} value={t}>{TYPE_LABEL[t]}</option>)}
            </select>
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label className="ui-label" htmlFor="appt-reason">Reason for visit</label>
            <input id="appt-reason" className="ui-input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Blood pressure follow-up" />
          </div>
          <div>
            <label className="ui-label" htmlFor="appt-location">Room / location</label>
            <input id="appt-location" className="ui-input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Room 1, Video…" />
          </div>
          <div>
            <label className="ui-label" htmlFor="appt-notes">Notes</label>
            <input id="appt-notes" className="ui-input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
          </div>
        </div>
        {error && (
          <div className="ui-alert ui-alert-error" style={{ marginTop: '0.75rem' }}>
            <span>
              {error}
              {/Overlaps|overlaps/.test(error) && (
                <label style={{ display: 'flex', gap: 6, marginTop: 6, alignItems: 'center' }}>
                  <input type="checkbox" checked={allowOverlap} onChange={(e) => setAllowOverlap(e.target.checked)} /> Allow double-booking
                </label>
              )}
            </span>
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: '1rem' }}>
          <button type="button" className="ui-btn ui-btn-outline" onClick={onClose}>Cancel</button>
          <button type="submit" className="ui-btn ui-btn-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Book appointment'}</button>
        </div>
      </form>
    </div>
  );
}
