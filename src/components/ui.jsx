import { useEffect, useState } from 'react';

// ─────────────────────────────────────────────────────────────────────────────
// Shared primitives for the admin pages. Everything here is presentation only
// — no API calls — so pages stay about their data.
// ─────────────────────────────────────────────────────────────────────────────

export function Card({ children, className = '' }) {
  return (
    <div className={`bg-[#111118] border border-white/[0.07] rounded-2xl ${className}`}>
      {children}
    </div>
  );
}

export function SectionTitle({ children, hint }) {
  return (
    <div className="mb-4">
      <h3 className="text-white font-semibold text-sm">{children}</h3>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

const BUTTON_STYLES = {
  primary:
    'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-500/20',
  ghost: 'bg-white/[0.06] border border-white/10 text-slate-200 hover:bg-white/[0.1]',
  good: 'bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30',
  danger: 'bg-red-600/15 border border-red-500/30 text-red-300 hover:bg-red-600/25',
};

export function Button({
  children,
  onClick,
  variant = 'ghost',
  type = 'button',
  disabled,
  className = '',
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${BUTTON_STYLES[variant]} ${className}`}
    >
      {children}
    </button>
  );
}

const FIELD_CLASS =
  'w-full bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60 focus:border-transparent transition-all';

export function Field({ label, hint, children }) {
  return (
    <label className="block">
      {label && <span className="block text-xs font-medium text-slate-400 mb-1.5">{label}</span>}
      {children}
      {hint && <span className="block text-[11px] text-slate-600 mt-1">{hint}</span>}
    </label>
  );
}

export function Input({ value, onChange, type = 'text', placeholder, step, min, required }) {
  return (
    <input
      type={type}
      value={value ?? ''}
      step={step}
      min={min}
      required={required}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={FIELD_CLASS}
    />
  );
}

export function Textarea({ value, onChange, placeholder, rows = 3 }) {
  return (
    <textarea
      rows={rows}
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className={FIELD_CLASS}
    />
  );
}

export function Select({ value, onChange, options, placeholder }) {
  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className={`${FIELD_CLASS} [&>option]:bg-[#15151d]`}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {options.map((opt) => {
        const { value: v, label } = typeof opt === 'string' ? { value: opt, label: opt } : opt;
        return (
          <option key={v} value={v}>
            {label}
          </option>
        );
      })}
    </select>
  );
}

export function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 w-full text-left"
    >
      <span
        className={`relative w-10 h-6 rounded-full transition-colors shrink-0 ${
          checked ? 'bg-emerald-500/80' : 'bg-white/15'
        }`}
      >
        <span
          className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${
            checked ? 'left-5' : 'left-1'
          }`}
        />
      </span>
      <span className="text-sm text-slate-300">{label}</span>
    </button>
  );
}

const BADGE_TONES = {
  neutral: 'bg-white/[0.07] text-slate-300 border-white/10',
  good: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  warn: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  bad: 'bg-red-500/15 text-red-300 border-red-500/30',
  info: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
};

export function Badge({ children, tone = 'neutral' }) {
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-lg text-[11px] font-medium border ${BADGE_TONES[tone]}`}
    >
      {children}
    </span>
  );
}

export function Alert({ children, tone = 'bad', onDismiss }) {
  if (!children) return null;
  const tones = {
    bad: 'bg-red-500/10 border-red-500/30 text-red-400',
    good: 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300',
    info: 'bg-sky-500/10 border-sky-500/30 text-sky-300',
  };
  return (
    <div
      className={`border rounded-xl px-4 py-3 text-sm flex items-start justify-between gap-3 ${tones[tone]}`}
    >
      <span>{children}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="text-xs opacity-70 hover:opacity-100 shrink-0">
          Dismiss
        </button>
      )}
    </div>
  );
}

/** Red/green banner that clears itself, so pages don't each build one. */
export function useFlash() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!success) return;
    const timer = setTimeout(() => setSuccess(''), 4000);
    return () => clearTimeout(timer);
  }, [success]);

  const run = async (action, message) => {
    setError('');
    try {
      const result = await action();
      if (message) setSuccess(message);
      return result;
    } catch (err) {
      setError(err.message || 'Something went wrong');
      return undefined;
    }
  };

  return { error, setError, success, setSuccess, run };
}

export function Modal({ open, title, onClose, children, wide }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm px-4 py-10">
      <div
        className={`w-full ${wide ? 'max-w-4xl' : 'max-w-xl'} bg-[#111118] border border-white/10 rounded-2xl shadow-2xl`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.07]">
          <h3 className="text-white font-semibold text-sm">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white text-lg leading-none">
            ×
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

export function Table({ columns, rows, empty = 'Nothing here yet.', keyOf }) {
  if (!rows) return <p className="text-slate-500 text-sm px-1 py-4">Loading…</p>;
  if (!rows.length) return <p className="text-slate-500 text-sm px-1 py-4">{empty}</p>;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs uppercase tracking-wide text-slate-500 border-b border-white/[0.07]">
            {columns.map((col) => (
              <th key={col.key} className="py-3 pr-4 font-medium whitespace-nowrap">
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={keyOf ? keyOf(row) : (row._id ?? i)}
              className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]"
            >
              {columns.map((col) => (
                <td key={col.key} className="py-3 pr-4 text-slate-300 align-top">
                  {col.render ? col.render(row) : (row[col.key] ?? '—')}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pager({ page, totalPages, onPage }) {
  if (!totalPages || totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-between pt-4">
      <Button disabled={page <= 1} onClick={() => onPage(page - 1)}>
        ← Previous
      </Button>
      <span className="text-xs text-slate-500">
        Page {page} of {totalPages}
      </span>
      <Button disabled={page >= totalPages} onClick={() => onPage(page + 1)}>
        Next →
      </Button>
    </div>
  );
}

export function Stat({ label, value, tone = 'neutral' }) {
  const tones = {
    neutral: 'text-white',
    good: 'text-emerald-300',
    warn: 'text-amber-300',
    bad: 'text-red-300',
  };
  return (
    <Card className="px-5 py-4">
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${tones[tone]}`}>{value}</p>
    </Card>
  );
}

/** Dates in the format `<input type="datetime-local">` wants, in local time. */
export const toLocalInput = (value) => {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
};

export const fromLocalInput = (value) => (value ? new Date(value).toISOString() : undefined);

export const formatDateTime = (value) => {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString([], {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const STATUS_TONE = {
  booking_open: 'good',
  upcoming: 'info',
  booking_closed: 'warn',
  housefull: 'warn',
  completed: 'neutral',
  confirmed: 'good',
  used: 'info',
  cancelled: 'bad',
  hold: 'warn',
  approved: 'good',
  pending: 'warn',
  rejected: 'bad',
  waiting: 'warn',
  promoted: 'good',
  expired: 'neutral',
};
