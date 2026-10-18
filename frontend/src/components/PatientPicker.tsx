import { useMemo, useState } from 'react';
import { useQuery } from 'convex/react';
import type { Doc, Id } from '../../../convex/_generated/dataModel';
import { api } from '@/convex/api';

interface Props {
  value: Id<'patients'> | null;
  onChange: (patient: Doc<'patients'> | null) => void;
  placeholder?: string;
  allowClear?: boolean;
  id?: string;
}

/** Searchable select over the clinician's patients (by name, ID or condition). */
export default function PatientPicker({ value, onChange, placeholder = 'Search patients…', allowClear = true, id }: Props) {
  const patients = useQuery(api.functions.patients.getPatients, {});
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const selected = patients?.find((p) => p._id === value) ?? null;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = [...(patients ?? [])].sort((a, b) => a.customId.localeCompare(b.customId));
    return (q ? list.filter((p) => `${p.name} ${p.customId} ${p.condition}`.toLowerCase().includes(q)) : list).slice(0, 30);
  }, [patients, query]);

  return (
    <div style={{ position: 'relative' }}>
      <input
        id={id}
        className="ui-input"
        value={open ? query : selected ? `${selected.customId} · ${selected.name}` : query}
        placeholder={patients === undefined ? 'Loading patients…' : placeholder}
        onFocus={() => {
          setOpen(true);
          setQuery('');
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onChange={(e) => setQuery(e.target.value)}
        autoComplete="off"
      />
      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute', zIndex: 20, top: '100%', left: 0, right: 0, marginTop: 4, maxHeight: 280, overflowY: 'auto',
            background: 'var(--color-white)', border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', boxShadow: 'var(--shadow-lg)',
          }}
        >
          {allowClear && selected && (
            <button type="button" className="ui-btn ui-btn-ghost" style={{ width: '100%', justifyContent: 'flex-start' }} onMouseDown={() => onChange(null)}>
              Clear selection
            </button>
          )}
          {matches.map((p) => (
            <button
              key={p._id}
              type="button"
              role="option"
              aria-selected={p._id === value}
              onMouseDown={() => {
                onChange(p);
                setOpen(false);
              }}
              style={{
                display: 'flex', width: '100%', gap: 8, padding: '0.5rem 0.75rem', textAlign: 'left', fontSize: '0.85rem',
                background: p._id === value ? 'var(--color-primary-bg)' : 'transparent', color: 'var(--color-gray-800)',
              }}
            >
              <span style={{ fontWeight: 600, minWidth: 48 }}>{p.customId}</span>
              <span style={{ flex: 1 }}>{p.name}</span>
              <span className="ui-muted" style={{ fontSize: '0.75rem' }}>{p.age} {p.gender.charAt(0)} · {p.condition}</span>
            </button>
          ))}
          {patients && matches.length === 0 && <div className="ui-empty" style={{ padding: '1rem' }}>No matching patients</div>}
        </div>
      )}
    </div>
  );
}
