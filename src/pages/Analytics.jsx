import { useEffect, useState } from 'react';
import { api } from '../api';

const triggerDownload = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [error, setError] = useState('');
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.getAnalyticsOverview().then(setOverview).catch((e) => setError(e.message));
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await api.exportUsersCsv();
      triggerDownload(blob, `festival_users_${new Date().toISOString().split('T')[0]}.csv`);
    } catch (err) {
      setError(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <button onClick={handleExport} disabled={exporting} className="px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-50">
        {exporting ? 'Preparing…' : 'Export Users CSV'}
      </button>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {overview === null ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : overview.length === 0 ? (
        <p className="text-slate-500 text-sm">No events yet.</p>
      ) : (
        <div className="bg-[#111118] border border-white/[0.07] rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wider text-slate-500 border-b border-white/[0.07]">
                  <th className="px-5 py-3 font-medium">Event</th>
                  <th className="px-5 py-3 font-medium">Venue</th>
                  <th className="px-5 py-3 font-medium">Peak occupancy</th>
                  <th className="px-5 py-3 font-medium">Entries</th>
                  <th className="px-5 py-3 font-medium">Exits</th>
                  <th className="px-5 py-3 font-medium">No-shows</th>
                  <th className="px-5 py-3 font-medium">Bookings</th>
                  <th className="px-5 py-3 font-medium">Waitlist</th>
                </tr>
              </thead>
              <tbody>
                {overview.map((row) => (
                  <tr key={row.event._id} className="border-b border-white/[0.04] last:border-0">
                    <td className="px-5 py-3 text-white font-medium">{row.event.name}</td>
                    <td className="px-5 py-3 text-slate-400">{row.event.venue}</td>
                    <td className="px-5 py-3 text-slate-300">{row.analytics?.peakOccupancy ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-300">{row.analytics?.totalEntries ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-300">{row.analytics?.totalExits ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-300">{row.analytics?.noShows ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-300">{row.analytics?.bookingCount ?? '—'}</td>
                    <td className="px-5 py-3 text-slate-300">{row.analytics?.waitlistCount ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
