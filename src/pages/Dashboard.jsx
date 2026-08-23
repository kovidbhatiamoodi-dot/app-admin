import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';

const STATUS_STYLES = {
  upcoming: 'bg-slate-500/15 text-slate-300 border-slate-500/30',
  booking_open: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  booking_closed: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  housefull: 'bg-red-500/15 text-red-300 border-red-500/30',
  completed: 'bg-slate-600/15 text-slate-400 border-slate-600/30',
};

function StatChip({ label, value }) {
  return (
    <div className="text-center">
      <p className="text-lg font-bold text-white">{value}</p>
      <p className="text-[10px] uppercase tracking-wider text-slate-500">{label}</p>
    </div>
  );
}

export default function Dashboard() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    api.getDashboard()
      .then(setEvents)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
    // Festival-day ops screen — refresh on a short interval rather than
    // requiring a manual reload while watching occupancy live.
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  if (loading) return <p className="text-slate-500 text-sm">Loading dashboard…</p>;
  if (error) return <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>;
  if (!events?.length) return <p className="text-slate-500 text-sm">No events yet — create one from the Events tab.</p>;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {events.map((ev) => (
        <div key={ev.eventId} className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5">
          <div className="flex items-start justify-between gap-3 mb-4">
            <p className="text-white font-semibold">{ev.eventName}</p>
            <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border shrink-0 ${STATUS_STYLES[ev.status] || STATUS_STYLES.upcoming}`}>
              {ev.status.replace('_', ' ')}
            </span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <StatChip label="Occupancy" value={ev.currentOccupancy} />
            <StatChip label="Remaining" value={`${ev.remaining}/${ev.capacity}`} />
            <StatChip label="Waitlist" value={ev.waitlistCount} />
          </div>
          <div className="flex items-center gap-4 text-xs text-slate-500 border-t border-white/[0.06] pt-3">
            <span>In: <span className="text-slate-300 font-medium">{ev.checkedIn}</span></span>
            <span>Out: <span className="text-slate-300 font-medium">{ev.checkedOut}</span></span>
            <span>Confirmed: <span className="text-slate-300 font-medium">{ev.confirmedBookings}</span></span>
            {ev.noShows > 0 && <span>No-shows: <span className="text-slate-300 font-medium">{ev.noShows}</span></span>}
          </div>
        </div>
      ))}
    </div>
  );
}
