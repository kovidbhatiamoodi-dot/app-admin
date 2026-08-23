import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';

export default function Places() {
  const [places, setPlaces] = useState(null);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    api.getPendingPlaces().then(setPlaces).catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const approve = async (id) => {
    setBusyId(id);
    try {
      await api.approvePlace(id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-slate-500">Places students suggested for the map — nothing here shows up until approved.</p>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {places === null ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : places.length === 0 ? (
        <p className="text-slate-500 text-sm">No pending suggestions.</p>
      ) : (
        <div className="space-y-3">
          {places.map((p) => (
            <div key={p._id} className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-white font-semibold">{p.name} <span className="text-xs text-slate-500 font-normal">· {p.category}</span></p>
                {p.description && <p className="text-sm text-slate-400 mt-1">{p.description}</p>}
                <p className="text-xs text-slate-600 mt-2">
                  Suggested by {p.addedBy?.full_name || 'unknown'} ({p.addedBy?.email || '—'})
                  {p.distance && <> · {p.distance}</>}
                </p>
                {p.googleMapsUrl && (
                  <a href={p.googleMapsUrl} target="_blank" rel="noreferrer" className="text-xs text-amber-400 hover:underline mt-1 inline-block">
                    View on Google Maps
                  </a>
                )}
              </div>
              <button
                disabled={busyId === p._id}
                onClick={() => approve(p._id)}
                className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-50"
              >
                {busyId === p._id ? 'Approving…' : 'Approve'}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
