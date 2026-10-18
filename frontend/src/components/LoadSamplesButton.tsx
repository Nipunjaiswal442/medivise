import { useState } from 'react';
import { useMutation } from 'convex/react';
import { api } from '@/convex/api';
import { errorMessage } from '@/convex/client';
import { startOfDay } from '@/lib/time';

/** Creates (or refreshes) the 20 fictional sample patients and a week of appointments. */
export default function LoadSamplesButton({ label = 'Load 20 sample patients', className = 'ui-btn ui-btn-primary' }: { label?: string; className?: string }) {
  const load = useMutation(api.functions.samples.loadSamplePatients);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const run = async () => {
    setBusy(true);
    setMessage('');
    try {
      const r = await load({ todayStart: startOfDay() });
      setMessage(`${r.created} created, ${r.updated} updated, ${r.appointments} appointments scheduled.`);
    } catch (err) {
      setMessage(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <button className={className} onClick={run} disabled={busy}>
        {busy ? <span className="ui-spin" /> : null}
        {busy ? 'Loading…' : label}
      </button>
      {message && <span className="ui-muted">{message}</span>}
    </span>
  );
}
