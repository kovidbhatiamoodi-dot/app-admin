import { useEffect, useState } from 'react';
import { api } from '../api';

function NearbyForm() {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [radius, setRadius] = useState('');
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => { api.getEvents().then(setEvents).catch(() => {}); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setSending(true);
    try {
      const res = await api.notifyNearby(eventId, title, body, radius ? Number(radius) : undefined);
      setResult(res);
      setTitle('');
      setBody('');
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-white font-semibold text-sm">Nearby (geofenced)</h3>
        <p className="text-xs text-slate-500 mt-0.5">Pushes only to students currently near the venue.</p>
      </div>

      <select required value={eventId} onChange={(e) => setEventId(e.target.value)}
        className="w-full bg-white/[0.06] border border-white/10 text-white rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60">
        <option value="" className="bg-[#111118]">Select event…</option>
        {events.map((ev) => <option key={ev._id} value={ev._id} className="bg-[#111118]">{ev.name}</option>)}
      </select>

      <input required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
        className="w-full bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60" />
      <textarea required value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" rows={2}
        className="w-full bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60 resize-none" />
      <input type="number" value={radius} onChange={(e) => setRadius(e.target.value)} placeholder="Radius in meters (default: event's geofence)"
        className="w-full bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60" />

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-2.5 text-sm">{error}</div>}
      {result && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-2.5 text-sm">Sent — {JSON.stringify(result)}</div>}

      <button type="submit" disabled={sending} className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-600 to-orange-600 text-white disabled:opacity-60">
        {sending ? 'Sending…' : 'Send Nearby Push'}
      </button>
    </form>
  );
}

function CampusForm() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [emergency, setEmergency] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const handleSend = async () => {
    setError('');
    setResult(null);
    setSending(true);
    try {
      const res = await api.notifyCampus(title, body, emergency);
      setResult(res);
      setTitle('');
      setBody('');
      setConfirming(false);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-[#111118] border border-white/[0.07] rounded-2xl p-5 space-y-4">
      <div>
        <h3 className="text-white font-semibold text-sm">Campus-wide broadcast</h3>
        <p className="text-xs text-slate-500 mt-0.5">Reaches every student with the app installed.</p>
      </div>

      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Title"
        className="w-full bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Message" rows={2}
        className="w-full bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500/60 resize-none" />

      <label className="flex items-center gap-2 text-sm text-slate-300">
        <input type="checkbox" checked={emergency} onChange={(e) => { setEmergency(e.target.checked); setConfirming(false); }} className="accent-red-500" />
        Emergency broadcast
      </label>

      {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl px-4 py-2.5 text-sm">{error}</div>}
      {result && <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 rounded-xl px-4 py-2.5 text-sm">Sent — {JSON.stringify(result)}</div>}

      {!confirming ? (
        <button
          disabled={!title || !body}
          onClick={() => setConfirming(true)}
          className={`px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-40 ${
            emergency ? 'bg-red-600 text-white' : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'
          }`}
        >
          {emergency ? 'Review Emergency Broadcast' : 'Review & Send'}
        </button>
      ) : (
        <div className="flex gap-3">
          <button onClick={() => setConfirming(false)} disabled={sending} className="px-4 py-2 rounded-xl text-sm text-slate-300 border border-white/10">Cancel</button>
          <button onClick={handleSend} disabled={sending} className={`px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-60 ${emergency ? 'bg-red-600 text-white' : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white'}`}>
            {sending ? 'Sending…' : emergency ? 'Confirm — send to EVERYONE (emergency)' : 'Confirm — send to everyone'}
          </button>
        </div>
      )}
    </div>
  );
}

export default function Notifications() {
  return (
    <div className="grid gap-4 lg:grid-cols-2 max-w-4xl">
      <NearbyForm />
      <CampusForm />
    </div>
  );
}
