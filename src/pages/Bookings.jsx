import { useCallback, useEffect, useState } from 'react';
import { api, saveBlob } from '../api';
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

const STATUSES = ['confirmed', 'used', 'cancelled', 'hold'];

export default function Bookings() {
  const [data, setData] = useState(null);
  const [events, setEvents] = useState([]);
  const [filters, setFilters] = useState({ eventId: '', status: '', q: '', page: 1 });
  const { error, setError, success, setSuccess, run } = useFlash();

  const load = useCallback(async () => {
    const result = await run(() => api.getBookings(filters));
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

  const cancel = async (booking) => {
    if (
      !window.confirm(
        `Cancel ${booking.userId?.full_name ?? 'this student'}'s booking for ${
          booking.eventId?.name ?? 'the event'
        }? The seat goes back to the pool (or to the next person on the waitlist).`
      )
    ) {
      return;
    }
    const result = await run(() => api.cancelBooking(booking._id), 'Booking cancelled');
    if (result) load();
  };

  const checkIn = async (booking) => {
    const result = await run(() => api.checkInBooking(booking._id), 'Checked in');
    if (result) load();
  };

  const exportCsv = async () => {
    const blob = await run(() => api.exportBookingsCsv({ eventId: filters.eventId }));
    if (blob) saveBlob(blob, `bookings_${Date.now()}.csv`);
  };

  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (b) => (
        <div>
          <p className="text-white font-medium">{b.userId?.full_name ?? '— deleted —'}</p>
          <p className="text-xs text-slate-500">
            {b.userId?.email ?? '—'}
            {b.userId?.mi_no ? ` · ${b.userId.mi_no}` : ''}
          </p>
        </div>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      render: (b) => (
        <div>
          <p className="text-slate-200">{b.eventId?.name ?? '—'}</p>
          <p className="text-xs text-slate-500">{formatDateTime(b.eventId?.startTime)}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => <Badge tone={STATUS_TONE[b.status] ?? 'neutral'}>{b.status}</Badge>,
    },
    {
      key: 'qrCode',
      header: 'QR',
      render: (b) => <span className="font-mono text-xs text-slate-400">{b.qrCode}</span>,
    },
    {
      key: 'checkedInAt',
      header: 'Checked in',
      render: (b) => (b.checkedInAt ? formatDateTime(b.checkedInAt) : '—'),
    },
    {
      key: 'actions',
      header: '',
      render: (b) => (
        <div className="flex gap-2 justify-end">
          {!b.checkedInAt && b.status !== 'cancelled' && (
            <Button variant="good" onClick={() => checkIn(b)}>
              Check in
            </Button>
          )}
          {b.status === 'confirmed' && (
            <Button variant="danger" onClick={() => cancel(b)}>
              Cancel
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Every seat booked in the app. Cancelling here frees the seat and promotes the next person on
        the waitlist, exactly like a student cancelling themselves. Check-in is the manual override
        for when a QR won&apos;t scan at the gate.
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
              {ev.name}
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
        <input
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))}
          placeholder="Find by exact QR code"
          className="bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm w-56"
        />
        <Button onClick={load}>Refresh</Button>
        <Button onClick={exportCsv}>Export CSV</Button>
      </div>

      <Alert onDismiss={() => setError('')}>{error}</Alert>
      <Alert tone="good" onDismiss={() => setSuccess('')}>
        {success}
      </Alert>

      <Card className="px-5 py-3">
        <Table columns={columns} rows={data?.bookings} empty="No bookings match these filters." />
        <Pager
          page={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          onPage={(page) => setFilters((f) => ({ ...f, page }))}
        />
      </Card>
    </div>
  );
}
