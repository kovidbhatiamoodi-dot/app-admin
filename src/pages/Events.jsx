import { useEffect, useState, useCallback } from 'react';
import { api } from '../api';

const CATEGORIES = ['music', 'comedy', 'dance', 'art', 'talk', 'other'];
const STATUSES = ['booking_open', 'booking_closed', 'housefull', 'completed'];

const EMPTY_FORM = {
  name: '', description: '', category: 'music', venue: '',
  lat: '', lng: '', startTime: '', endTime: '', capacity: '', geofenceRadius: '100',
};

function CreateEventForm({ onCreated }) {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [open, setOpen] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.createEvent({
        name: form.name,
        description: form.description,
        category: form.category,
        venue: form.venue,
        coords: { lat: Number(form.lat), lng: Number(form.lng) },
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        capacity: Number(form.capacity),
        geofenceRadius: Number(form.geofenceRadius),
      });
      setForm(EMPTY_FORM);
      setOpen(false);
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="bg-gradient-to-r from-amber-600 to-orange-600 text-white font-semibold rounded-xl px-5 py-2.5 text-sm hover:from-amber-500 hover:to-orange-500 transition-all"
      >
        + New Event
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5 space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <input required value={form.name} onChange={set('name')} placeholder="Event name"
          className="bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60" />
        <select value={form.category} onChange={set('category')}
          className="bg-white/[0.06] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60">
          {CATEGORIES.map((c) => <option key={c} value={c} className="bg-[#111118]">{c}</option>)}
        </select>
        <input required value={form.venue} onChange={set('venue')} placeholder="Venue"
          className="bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60" />
        <input required type="number" value={form.capacity} onChange={set('capacity')} placeholder="Capacity"
          className="bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60" />
        <input required type="number" step="any" value={form.lat} onChange={set('lat')} placeholder="Latitude"
          className="bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60" />
        <input required type="number" step="any" value={form.lng} onChange={set('lng')} placeholder="Longitude"
          className="bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60" />
        <label className="text-xs text-slate-400 flex flex-col gap-1">Booking geofence radius (m)
          <input required type="number" min={1} value={form.geofenceRadius} onChange={set('geofenceRadius')}
            className="bg-white/[0.06] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60" />
        </label>
        <label className="text-xs text-slate-400 flex flex-col gap-1">Start time
          <input required type="datetime-local" value={form.startTime} onChange={set('startTime')}
            className="bg-white/[0.06] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60" />
        </label>
        <label className="text-xs text-slate-400 flex flex-col gap-1">End time
          <input required type="datetime-local" value={form.endTime} onChange={set('endTime')}
            className="bg-white/[0.06] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60" />
        </label>
      </div>
      <textarea value={form.description} onChange={set('description')} placeholder="Description (optional)" rows={2}
        className="w-full bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60 resize-none" />

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-2.5 text-sm">{error}</div>}

      <div className="flex gap-3">
        <button type="button" onClick={() => setOpen(false)} className="px-4 py-2 rounded-xl text-sm text-slate-300 border border-white/10 hover:bg-white/[0.05]">Cancel</button>
        <button type="submit" disabled={submitting} className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-600 to-orange-600 text-white disabled:opacity-60">
          {submitting ? 'Creating…' : 'Create Event'}
        </button>
      </div>
    </form>
  );
}

function EventRow({ event, onChanged }) {
  const [busy, setBusy] = useState(false);
  const [capacityInput, setCapacityInput] = useState('');
  const [waitlistCount, setWaitlistCount] = useState(1);
  const [msg, setMsg] = useState('');

  const run = async (fn) => {
    setBusy(true);
    setMsg('');
    try {
      const result = await fn();
      setMsg(result?.message || 'Done');
      onChanged();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div>
          <p className="text-white font-semibold">{event.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">{event.venue} · {event.category} · {new Date(event.startTime).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full border bg-white/[0.04] text-slate-300 border-white/10 shrink-0">
          {event.remaining}/{event.capacity} left
        </span>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <select
          disabled={busy}
          defaultValue=""
          onChange={(e) => { if (e.target.value) run(() => api.updateEventStatus(event._id, e.target.value)); e.target.value = ''; }}
          className="bg-white/[0.06] border border-white/10 text-white rounded-lg px-3 py-1.5 text-xs focus:outline-none"
        >
          <option value="" className="bg-[#111118]">Set status…</option>
          {STATUSES.map((s) => <option key={s} value={s} className="bg-[#111118]">{s.replace('_', ' ')}</option>)}
        </select>

        <div className="flex items-center gap-1">
          <input
            type="number" placeholder="new cap." value={capacityInput}
            onChange={(e) => setCapacityInput(e.target.value)}
            className="w-24 bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-lg px-2 py-1.5 text-xs focus:outline-none"
          />
          <button
            disabled={busy || !capacityInput}
            onClick={() => run(() => api.updateEventCapacity(event._id, Number(capacityInput)).then(() => setCapacityInput('')))}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/[0.06] border border-white/10 text-slate-300 hover:bg-white/[0.1] disabled:opacity-40"
          >
            Bump cap.
          </button>
        </div>

        <div className="flex items-center gap-1">
          <input
            type="number" min={1} value={waitlistCount}
            onChange={(e) => setWaitlistCount(e.target.value)}
            className="w-16 bg-white/[0.06] border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none"
          />
          <button
            disabled={busy}
            onClick={() => run(() => api.promoteWaitlist(event._id, Number(waitlistCount)))}
            className="text-xs px-3 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-40"
          >
            Promote waitlist
          </button>
        </div>
      </div>

      {msg && <p className="text-xs text-slate-500 mt-2">{msg}</p>}
    </div>
  );
}

export default function Events() {
  const [events, setEvents] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(() => {
    api.getEvents().then(setEvents).catch((e) => setError(e.message));
  }, []);

  useEffect(load, [load]);

  return (
    <div className="space-y-4">
      <CreateEventForm onCreated={load} />

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-3 text-sm">{error}</div>}

      {events === null ? (
        <p className="text-slate-500 text-sm">Loading events…</p>
      ) : events.length === 0 ? (
        <p className="text-slate-500 text-sm">No events yet.</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {events.map((ev) => <EventRow key={ev._id} event={ev} onChanged={load} />)}
        </div>
      )}
    </div>
  );
}
