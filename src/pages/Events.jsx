import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Pager,
  Select,
  Table,
  Textarea,
  formatDateTime,
  fromLocalInput,
  toLocalInput,
  useFlash,
  STATUS_TONE,
} from '../components/ui';

const CATEGORIES = ['music', 'comedy', 'dance', 'art', 'talk', 'other'];
const STATUSES = ['upcoming', 'booking_open', 'booking_closed', 'housefull', 'completed'];

const emptyForm = () => ({
  name: '',
  description: '',
  category: 'music',
  venue: '',
  lat: '',
  lng: '',
  startTime: '',
  endTime: '',
  bookingOpenTime: '',
  bookingCloseTime: '',
  capacity: '',
  geofenceRadius: '300',
  imageUrl: '',
  status: 'booking_open',
});

const formFromEvent = (event) => ({
  name: event.name ?? '',
  description: event.description ?? '',
  category: event.category ?? 'music',
  venue: event.venue ?? '',
  lat: String(event.coords?.lat ?? ''),
  lng: String(event.coords?.lng ?? ''),
  startTime: toLocalInput(event.startTime),
  endTime: toLocalInput(event.endTime),
  bookingOpenTime: toLocalInput(event.bookingOpenTime),
  bookingCloseTime: toLocalInput(event.bookingCloseTime),
  capacity: String(event.capacity ?? ''),
  geofenceRadius: String(event.geofenceRadius ?? 300),
  imageUrl: event.imageUrl ?? '',
  status: event.status ?? 'booking_open',
});

function EventForm({ open, event, onClose, onSaved, onError }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(event);

  useEffect(() => {
    if (open) setForm(event ? formFromEvent(event) : emptyForm());
  }, [open, event]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
        venue: form.venue,
        coords: { lat: Number(form.lat), lng: Number(form.lng) },
        startTime: fromLocalInput(form.startTime),
        endTime: fromLocalInput(form.endTime),
        capacity: Number(form.capacity),
        geofenceRadius: Number(form.geofenceRadius),
        ...(form.bookingOpenTime ? { bookingOpenTime: fromLocalInput(form.bookingOpenTime) } : {}),
        ...(form.bookingCloseTime
          ? { bookingCloseTime: fromLocalInput(form.bookingCloseTime) }
          : {}),
        // Blank means "no image"; the backend only accepts Cloudinary HTTPS urls.
        imageUrl: form.imageUrl.trim() || null,
      };

      if (isEdit) {
        await api.updateEvent(event._id, { ...payload, status: form.status });
      } else {
        await api.createEvent(payload);
      }
      onClose();
      onSaved();
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} wide title={isEdit ? `Edit · ${event.name}` : 'New event'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Event name">
            <Input required value={form.name} onChange={set('name')} placeholder="Livewire finals" />
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={set('category')} options={CATEGORIES} />
          </Field>
          <Field label="Venue">
            <Input required value={form.venue} onChange={set('venue')} placeholder="OAT" />
          </Field>
          <Field
            label="Capacity"
            hint={isEdit ? 'Can go up or down, but not below seats already booked.' : undefined}
          >
            <Input required type="number" min={1} value={form.capacity} onChange={set('capacity')} />
          </Field>
          <Field label="Latitude">
            <Input required type="number" step="any" value={form.lat} onChange={set('lat')} />
          </Field>
          <Field label="Longitude">
            <Input required type="number" step="any" value={form.lng} onChange={set('lng')} />
          </Field>
          <Field label="Start time">
            <Input
              required
              type="datetime-local"
              value={form.startTime}
              onChange={set('startTime')}
            />
          </Field>
          <Field label="End time">
            <Input required type="datetime-local" value={form.endTime} onChange={set('endTime')} />
          </Field>
          <Field label="Booking opens" hint="Blank = open now.">
            <Input
              type="datetime-local"
              value={form.bookingOpenTime}
              onChange={set('bookingOpenTime')}
            />
          </Field>
          <Field label="Booking closes" hint="Blank = when the event starts.">
            <Input
              type="datetime-local"
              value={form.bookingCloseTime}
              onChange={set('bookingCloseTime')}
            />
          </Field>
          <Field label="Geofence radius (m)" hint="How close a student must be to book.">
            <Input type="number" min={0} value={form.geofenceRadius} onChange={set('geofenceRadius')} />
          </Field>
          {isEdit && (
            <Field label="Status">
              <Select value={form.status} onChange={set('status')} options={STATUSES} />
            </Field>
          )}
        </div>

        <Field label="Image URL" hint="Must be an https://res.cloudinary.com link, or leave blank.">
          <Input value={form.imageUrl} onChange={set('imageUrl')} placeholder="https://res.cloudinary.com/…" />
        </Field>

        <Field label="Description">
          <Textarea value={form.description} onChange={set('description')} rows={3} />
        </Field>

        <div className="flex gap-3 pt-2">
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create event'}
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

function QuickActions({ event, onChanged, onError, onSuccess }) {
  const [busy, setBusy] = useState(false);
  const [promoteCount, setPromoteCount] = useState('1');

  const act = async (fn, message) => {
    setBusy(true);
    try {
      await fn();
      onSuccess(message);
      onChanged();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select
        disabled={busy}
        value=""
        onChange={(e) => {
          const status = e.target.value;
          if (status) act(() => api.updateEventStatus(event._id, status), `Status set to ${status}`);
        }}
        className="bg-white/[0.06] border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs [&>option]:bg-[#15151d]"
      >
        <option value="">Status…</option>
        {STATUSES.filter((s) => s !== 'upcoming').map((s) => (
          <option key={s} value={s}>
            {s.replace(/_/g, ' ')}
          </option>
        ))}
      </select>

      <div className="flex items-center gap-1">
        <input
          type="number"
          min={1}
          value={promoteCount}
          onChange={(e) => setPromoteCount(e.target.value)}
          className="w-14 bg-white/[0.06] border border-white/10 text-white rounded-lg px-2 py-1.5 text-xs"
        />
        <button
          disabled={busy || !event.waitlistCount}
          onClick={() =>
            act(
              () => api.promoteWaitlist(event._id, Number(promoteCount) || 1),
              'Waitlist promoted'
            )
          }
          className="text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600/20 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30 disabled:opacity-40"
        >
          Promote
        </button>
      </div>
    </div>
  );
}

export default function Events() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ q: '', status: '', category: '', page: 1 });
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { error, setError, success, setSuccess, run } = useFlash();

  const load = useCallback(async () => {
    const result = await run(() => api.getEventsAdmin(filters));
    if (result) setData(result);
  }, [filters, run]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (event) => {
    const hasPeople = event.bookingCount > 0 || event.waitlistCount > 0;
    const warning = hasPeople
      ? `"${event.name}" has ${event.bookingCount} booking(s) and ${event.waitlistCount} on the waitlist. Deleting removes those too, and cannot be undone. Continue?`
      : `Delete "${event.name}"? This cannot be undone.`;
    if (!window.confirm(warning)) return;

    const result = await run(
      () => api.deleteEvent(event._id, { force: hasPeople }),
      'Event deleted'
    );
    if (result) load();
  };

  const columns = [
    {
      key: 'name',
      header: 'Event',
      render: (event) => (
        <div>
          <p className="text-white font-medium">{event.name}</p>
          <p className="text-xs text-slate-500 mt-0.5">
            {event.venue} · {event.category} · {formatDateTime(event.startTime)}
          </p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (event) => (
        <Badge tone={STATUS_TONE[event.status] ?? 'neutral'}>
          {String(event.status).replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'seats',
      header: 'Seats',
      render: (event) => (
        <span className="whitespace-nowrap">
          {event.remaining}/{event.capacity} left
          <span className="block text-xs text-slate-500">
            {event.bookingCount} booked · {event.waitlistCount} waiting
          </span>
        </span>
      ),
    },
    {
      key: 'quick',
      header: 'Quick actions',
      render: (event) => (
        <QuickActions
          event={event}
          onChanged={load}
          onError={setError}
          onSuccess={setSuccess}
        />
      ),
    },
    {
      key: 'manage',
      header: '',
      render: (event) => (
        <div className="flex gap-2 justify-end">
          <Button
            onClick={() => {
              setEditing(event);
              setFormOpen(true);
            }}
          >
            Edit
          </Button>
          <Button variant="danger" onClick={() => remove(event)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          + New event
        </Button>
        <input
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))}
          placeholder="Search name or venue"
          className="bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm w-56"
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value, page: 1 }))}
          className="bg-white/[0.06] border border-white/10 text-white rounded-xl px-3 py-2 text-sm [&>option]:bg-[#15151d]"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, ' ')}
            </option>
          ))}
        </select>
        <select
          value={filters.category}
          onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))}
          className="bg-white/[0.06] border border-white/10 text-white rounded-xl px-3 py-2 text-sm [&>option]:bg-[#15151d]"
        >
          <option value="">All categories</option>
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <Button onClick={load}>Refresh</Button>
      </div>

      <Alert onDismiss={() => setError('')}>{error}</Alert>
      <Alert tone="good" onDismiss={() => setSuccess('')}>
        {success}
      </Alert>

      <Card className="px-5 py-3">
        <Table columns={columns} rows={data?.events} empty="No events match these filters." />
        <Pager
          page={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          onPage={(page) => setFilters((f) => ({ ...f, page }))}
        />
      </Card>

      <EventForm
        open={formOpen}
        event={editing}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        onError={setError}
      />
    </div>
  );
}
