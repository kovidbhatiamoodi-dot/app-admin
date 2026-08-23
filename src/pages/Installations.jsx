import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';

const EMPTY_FORM = { name: '', description: '', lat: '', lng: '' };

export default function Installations() {
  const [installations, setInstallations] = useState(null);
  const [error, setError] = useState('');
  const [form, setForm] = useState(EMPTY_FORM);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(() => {
    api.getInstallations().then(setInstallations).catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.createInstallation({
        name: form.name,
        description: form.description,
        coords: { lat: Number(form.lat), lng: Number(form.lng) },
      });
      setForm(EMPTY_FORM);
      setOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleActive = async (installation) => {
    setBusyId(installation._id);
    try {
      await api.updateInstallation(installation._id, { active: !installation.active });
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id) => {
    setBusyId(id);
    try {
      await api.deleteInstallation(id);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="max-w-3xl space-y-4">
      <p className="text-sm text-slate-500">Non-bookable map points — art pieces, photo spots, sponsor booths.</p>

      {!open ? (
        <button onClick={() => setOpen(true)} className="bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl px-5 py-2.5 text-sm hover:from-amber-500 hover:to-orange-500 transition-all">
          + New Installation
        </button>
      ) : (
        <form onSubmit={handleCreate} className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <input required value={form.name} onChange={set('name')} placeholder="Name"
              className="bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60" />
            <input required type="number" step="any" value={form.lat} onChange={set('lat')} placeholder="Latitude"
              className="bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60" />
            <input required type="number" step="any" value={form.lng} onChange={set('lng')} placeholder="Longitude"
              className="bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60" />
          </div>
          <textarea value={form.description} onChange={set('description')} placeholder="Description (optional)" rows={2}
            className="w-full bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60 resize-none" />
          {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-2.5 text-sm">{error}</div>}
          <div className="flex gap-3">
            <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl text-sm text-slate-300 border border-white/10">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-600 to-orange-600 text-white disabled:opacity-60">
              {submitting ? 'Creating…' : 'Create'}
            </button>
          </div>
        </form>
      )}

      {error && !open && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {installations === null ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : installations.length === 0 ? (
        <p className="text-slate-500 text-sm">No installations yet.</p>
      ) : (
        <div className="space-y-3">
          {installations.map((i) => (
            <div key={i._id} className="bg-[#111118] border border-white/[0.07] rounded-2xl p-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-white font-semibold text-sm">{i.name}</p>
                {i.description && <p className="text-xs text-slate-500 mt-0.5">{i.description}</p>}
                <p className="text-xs text-slate-600 mt-0.5">{i.coords.lat.toFixed(5)}, {i.coords.lng.toFixed(5)}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${i.active ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' : 'bg-slate-500/15 text-slate-400 border-slate-500/30'}`}>
                  {i.active ? 'active' : 'hidden'}
                </span>
                <button disabled={busyId === i._id} onClick={() => toggleActive(i)} className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-slate-300 hover:bg-white/[0.1] disabled:opacity-40">
                  {i.active ? 'Hide' : 'Show'}
                </button>
                <button disabled={busyId === i._id} onClick={() => remove(i._id)} className="text-xs px-3 py-1.5 rounded-lg bg-red-600/10 border border-red-500/30 text-red-400 hover:bg-red-600/20 disabled:opacity-40">
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
