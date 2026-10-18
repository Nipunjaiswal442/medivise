import { Link } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { useAuth } from '@/context/AuthContext';
import { api } from '@/convex/api';
import LoadSamplesButton from '@/components/LoadSamplesButton';
import { STATUS_BADGE, STATUS_LABEL, TYPE_LABEL } from '@/components/appointmentLabels';
import { useAssistantStatus } from '@/hooks/useAssistantStatus';
import { addDays, fmtDate, fmtDay, fmtTime, minuteNow, startOfDay } from '@/lib/time';
import styles from './DashboardPage.module.css';

function greeting() {
  const h = new Date().getHours();
  return h < 12 ? 'Good morning,' : h < 18 ? 'Good afternoon,' : 'Good evening,';
}

export default function DashboardPage() {
  const { user } = useAuth();
  const dayStart = startOfDay();
  const summary = useQuery(api.functions.dashboard.summary, { dayStart, dayEnd: addDays(dayStart, 1), now: minuteNow() });
  const assistant = useAssistantStatus();

  const next = summary?.today.next;
  return (
    <>
      <div className={styles.banner}>
        <p className={styles.bannerGreeting}>{greeting()}</p>
        <h1 className={styles.bannerName}>{user?.name}</h1>
        <p className={styles.bannerSubtext}>
          {new Date().toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' })}
          {summary && ` · ${summary.today.total} appointment${summary.today.total === 1 ? '' : 's'} today`}
          {next?.patient && ` · next: ${next.patient.name} at ${fmtTime(next.startsAt)}`}
        </p>
        <div className={styles.bannerActions}>
          <Link to="/appointments" className={styles.bannerBtn}>Open schedule</Link>
          <Link to="/chat" className={styles.bannerBtnGhost}>
            Ask the assistant{assistant && !assistant.llmConfigured ? ' (not configured)' : ''}
          </Link>
        </div>
      </div>

      {summary && summary.patients.total === 0 && (
        <div className="ui-card" style={{ marginBottom: '1.5rem' }}>
          <div className="ui-card-title">Your patient list is empty</div>
          <p className="ui-muted" style={{ marginBottom: '0.75rem' }}>
            Load 20 fictional sample patients with full records (medications, allergies, labs, visit history) and a
            week of appointments to explore Medivise and the AI assistant.
          </p>
          <LoadSamplesButton />
        </div>
      )}

      <div className={styles.statsGrid}>
        <Stat label="Patients" value={summary?.patients.total} hint={summary ? `${summary.patients.active} active` : undefined} />
        <Stat label="Appointments today" value={summary?.today.total} hint={summary ? `${summary.today.remaining} remaining · ${summary.today.completed} done` : undefined} />
        <Stat label="Predictions (7 days)" value={summary?.predictionsThisWeek} hint="symptom model runs" />
        <Stat label="Documents" value={summary?.documents} hint="indexed for the assistant" />
      </div>

      <div className={styles.columns}>
        <section className="ui-card">
          <div className="ui-card-title">
            Today's schedule
            <Link to="/appointments" className="ui-btn ui-btn-ghost ui-btn-sm">View all</Link>
          </div>
          {!summary ? (
            <p className="ui-muted">Loading…</p>
          ) : summary.today.appointments.length === 0 ? (
            <p className="ui-empty">No appointments today.</p>
          ) : (
            <ul className={styles.schedule}>
              {summary.today.appointments.map((a) => (
                <li key={a._id} className={styles.scheduleItem}>
                  <span className={styles.time}>{fmtTime(a.startsAt)}</span>
                  <span className={styles.who}>
                    <strong>{a.patient?.name ?? 'Unknown patient'}</strong>
                    <span className="ui-muted">{TYPE_LABEL[a.type]} · {a.reason}</span>
                  </span>
                  <span className={STATUS_BADGE[a.status]}>{STATUS_LABEL[a.status]}</span>
                  {a.status !== 'completed' && a.status !== 'cancelled' && a.status !== 'no-show' && (
                    <Link to={`/consultation?appointment=${a._id}`} className="ui-btn ui-btn-outline ui-btn-sm">Start</Link>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <div className={styles.side}>
          <section className="ui-card">
            <div className="ui-card-title">Abnormal results</div>
            {!summary ? (
              <p className="ui-muted">Loading…</p>
            ) : summary.flaggedLabs.length === 0 ? (
              <p className="ui-muted">No flagged lab results.</p>
            ) : (
              <ul className={styles.list}>
                {summary.flaggedLabs.map((l, i) => (
                  <li key={i}>
                    <Link to={`/patients?id=${l.patientId}`}><strong>{l.name}</strong></Link>{' '}
                    <span className="ui-muted">{l.test} {l.value}</span>{' '}
                    <span className={/low/i.test(l.flag) ? 'ui-badge ui-badge-blue' : 'ui-badge ui-badge-red'}>{l.flag}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="ui-card">
            <div className="ui-card-title">Coming up</div>
            {!summary ? (
              <p className="ui-muted">Loading…</p>
            ) : summary.upcoming.length === 0 ? (
              <p className="ui-muted">Nothing scheduled for the next 7 days.</p>
            ) : (
              <ul className={styles.list}>
                {summary.upcoming.map((a) => (
                  <li key={a._id}>
                    <span className="ui-muted">{fmtDay(a.startsAt)} {fmtTime(a.startsAt)}</span> <strong>{a.patient?.name}</strong>{' '}
                    <span className="ui-muted">· {a.reason}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="ui-card">
            <div className="ui-card-title">Recently updated patients</div>
            {summary?.recentPatients.length ? (
              <ul className={styles.list}>
                {summary.recentPatients.map((p) => (
                  <li key={p._id}>
                    <Link to={`/patients?id=${p._id}`}><strong>{p.customId} {p.name}</strong></Link>{' '}
                    <span className="ui-muted">· {p.condition} · last visit {fmtDate(p.lastVisit)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="ui-muted">{summary ? 'No patients yet.' : 'Loading…'}</p>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, hint }: { label: string; value?: number; hint?: string }) {
  return (
    <div className={styles.statCard}>
      <div className={styles.statValue}>{value ?? '–'}</div>
      <div className={styles.statLabel}>{label}</div>
      {hint && <div className={styles.statHint}>{hint}</div>}
    </div>
  );
}
