import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import {
  Alert,
  Badge,
  Button,
  Card,
  Pager,
  Table,
  formatDateTime,
  useFlash,
  STATUS_TONE,
} from '../components/ui';

const STATUSES = ['waiting', 'promoted', 'expired', 'cancelled'];

export default function Waitlist() {
  const [data, setData] = useState(null);
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState({ eventId: '', status: 'waiting', page: 1 });
  const [promoteCount, setPromoteCount] = useState('1');
  const { error, setError, success, setSuccess, run } = useFlash();

  const load = useCallback(async () => {
    const result = await run(() => api.getWaitlist(filters));
    if (result) setData(result);
  }, [filters, run]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .getEventsAdmin({ limit: 200 })
      .then((res) => setEvents(res.events ?? []))
      .catch(() => setEvents([]));
  }, []);

  const promote = async () => {
    if (!filters.eventId) {
      setError('Pick an event first — promotion always applies to one event.');
      return;
    }
    const result = await run(
      () => api.promoteWaitlist(filters.eventId, Number(promoteCount) || 1),
      'Promoted — the students have their seat and a claim window to confirm.'
    );
    if (result) load();
  };

  const remove = async (entry) => {
    if (!window.confirm(`Remove ${entry.userId?.full_name ?? 'this student'} from the waitlist?`)) {
      return;
    }
    const result = await run(() => api.removeWaitlistEntry(entry._id), 'Entry removed');
    if (result) load();
  };

  const columns = [
    { key: 'position', header: '#', render: (e) => e.position ?? '—' },
    {
      key: 'student',
      header: 'Student',
      render: (e) => (
        <div>
          <p className="text-white font-medium">{e.userId?.full_name ?? '— deleted —'}</p>
          <p className="text-xs text-slate-500">{e.userId?.email ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      render: (e) => (
        <div>
          <p className="text-slate-200">{e.eventId?.name ?? '—'}</p>
          <p className="text-xs text-slate-500">{formatDateTime(e.eventId?.startTime)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => <Badge tone={STATUS_TONE[e.status] ?? 'neutral'}>{e.status}</Badge>,
    },
    {
      key: 'promotionExpiresAt',
      header: 'Claim expires',
      render: (e) => (e.promotionExpiresAt ? formatDateTime(e.promotionExpiresAt) : '—'),
    },
    {
      key: 'actions',
      header: '',
      render: (e) => (
        <div className="flex justify-end">
          <Button variant="danger" onClick={() => remove(e)}>
            Remove
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Who is waiting for a seat. Promoting hands out seats in queue order and starts each
        student&apos;s claim window — its length is set under App control → Booking rules.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <select
          value={filters.eventId}
          onChange={(e) => setFilters((f) => ({ ...f, eventId: e.target.value, page: 1 }))}
          className="bg-white/[0.06] border border-white/10 text-white rounded-xl px-3 py-2 text-sm [&>option]:bg-[#15151d] max-w-xs"
        >
          <option value="">All events</option>
          {events.map((ev) => (
            <option key={ev._id} value={ev._id}>
              {ev.name} · {ev.waitlistCount ?? 0} waiting
            </option>
          ))}
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
          className="bg-white/[0.06] border border-white/10 text-white rounded-xl px-3 py-2 text-sm [&>option]:bg-[#15151d]"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>

        <div className="flex items-center gap-2 ml-auto">
          <input
            type="number"
            min={1}
            value={promoteCount}
            onChange={(e) => setPromoteCount(e.target.value)}
            className="w-16 bg-white/[0.06] border border-white/10 text-white rounded-xl px-3 py-2 text-sm"
          />
          <Button variant="good" onClick={promote}>
            Promote next
          </Button>
          <Button onClick={load}>Refresh</Button>
        </div>
      </div>

      <Alert onDismiss={() => setError('')}>{error}</Alert>
      <Alert tone="good" onDismiss={() => setSuccess('')}>
        {success}
      </Alert>

      <Card className="px-5 py-3">
        <Table columns={columns} rows={data?.entries} empty="Nobody is on this waitlist." />
        <Pager
          page={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          onPage={(page) => setFilters((f) => ({ ...f, page }))}
        />
      </Card>
    </div>
  );
}
