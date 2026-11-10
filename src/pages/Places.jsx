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
  Select,
  Table,
  Textarea,
  useFlash,
} from '../components/ui';

const CATEGORIES = ['food', 'monument', 'shopping', 'nature', 'entertainment'];

const emptyForm = () => ({
  name: '',
  description: '',
  category: 'food',
  lat: '',
  lng: '',
  distance: '',
  googleMapsUrl: '',
  imageUrl: '',
  approved: true,
});

const formFromPlace = (place) => ({
  name: place.name ?? '',
  description: place.description ?? '',
  category: place.category ?? 'food',
  lat: String(place.coords?.lat ?? ''),
  lng: String(place.coords?.lng ?? ''),
  distance: place.distance ?? '',
  googleMapsUrl: place.googleMapsUrl ?? '',
  imageUrl: place.imageUrl ?? '',
  approved: Boolean(place.approved),
});

function PlaceForm({ open, place, onClose, onSaved, onError }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(place);

  useEffect(() => {
    if (open) setForm(place ? formFromPlace(place) : emptyForm());
  }, [open, place]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        category: form.category,
        coords: { lat: Number(form.lat), lng: Number(form.lng) },
        distance: form.distance,
        googleMapsUrl: form.googleMapsUrl,
        imageUrl: form.imageUrl.trim() || null,
        approved: form.approved,
      };

      if (isEdit) await api.updatePlace(place._id, payload);
      else await api.createPlace(payload);

      onClose();
      onSaved();
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} wide title={isEdit ? `Edit · ${place.name}` : 'New place'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <Input required value={form.name} onChange={set('name')} />
          </Field>
          <Field label="Category">
            <Select value={form.category} onChange={set('category')} options={CATEGORIES} />
          </Field>
          <Field label="Latitude">
            <Input required type="number" step="any" value={form.lat} onChange={set('lat')} />
          </Field>
          <Field label="Longitude">
            <Input required type="number" step="any" value={form.lng} onChange={set('lng')} />
          </Field>
          <Field label="Distance text" hint='Shown as written, e.g. "2.3 km from IIT Bombay".'>
            <Input value={form.distance} onChange={set('distance')} />
          </Field>
          <Field label="Google Maps link">
            <Input value={form.googleMapsUrl} onChange={set('googleMapsUrl')} />
          </Field>
          <Field label="Image URL">
            <Input value={form.imageUrl} onChange={set('imageUrl')} />
          </Field>
          <Field label="Visible in the app">
            <Select
              value={form.approved ? 'yes' : 'no'}
              onChange={(value) => set('approved')(value === 'yes')}
              options={[
                { value: 'yes', label: 'Published' },
                { value: 'no', label: 'Hidden / pending' },
              ]}
            />
          </Field>
        </div>

        <Field label="Description">
          <Textarea value={form.description} onChange={set('description')} rows={3} />
        </Field>

        <div className="flex gap-3 pt-2">
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create place'}
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Places() {
  const [places, setPlaces] = useState(null);
  const [filter, setFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { error, setError, success, setSuccess, run } = useFlash();

  const load = useCallback(async () => {
    const result = await run(() => api.getPlaces({ approved: filter }));
    if (result) setPlaces(result.places);
  }, [filter, run]);

  useEffect(() => {
    load();
  }, [load]);

  const publish = async (place, approved) => {
    const result = await run(
      () => api.updatePlace(place._id, { approved }),
      approved ? 'Published — students can see it now.' : 'Hidden from the app.'
    );
    if (result) load();
  };

  const remove = async (place) => {
    if (!window.confirm(`Delete "${place.name}"? This cannot be undone.`)) return;
    const result = await run(() => api.deletePlace(place._id), 'Place deleted');
    if (result) load();
  };

  const columns = [
    {
      key: 'name',
      header: 'Place',
      render: (p) => (
        <div>
          <p className="text-white font-medium">{p.name}</p>
          <p className="text-xs text-slate-500">
            {p.category}
            {p.distance ? ` · ${p.distance}` : ''}
          </p>
          {p.description && <p className="text-xs text-slate-500 mt-1 max-w-md">{p.description}</p>}
        </div>
      ),
    },
    {
      key: 'source',
      header: 'Added by',
      render: (p) =>
        p.addedBy ? (
          <span className="text-xs text-slate-400">
            {p.addedBy.full_name}
            <span className="block text-slate-600">{p.addedBy.email}</span>
          </span>
        ) : (
          <span className="text-xs text-slate-500">Admin</span>
        ),
    },
    {
      key: 'approved',
      header: 'Visible',
      render: (p) =>
        p.approved ? <Badge tone="good">Published</Badge> : <Badge tone="warn">Pending</Badge>,
    },
    {
      key: 'map',
      header: 'Map',
      render: (p) =>
        p.googleMapsUrl ? (
          <a
            href={p.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-amber-400 hover:underline"
          >
            Open
          </a>
        ) : (
          '—'
        ),
    },
    {
      key: 'actions',
      header: '',
      render: (p) => (
        <div className="flex gap-2 justify-end">
          {p.approved ? (
            <Button onClick={() => publish(p, false)}>Hide</Button>
          ) : (
            <Button variant="good" onClick={() => publish(p, true)}>
              Publish
            </Button>
          )}
          <Button
            onClick={() => {
              setEditing(p);
              setFormOpen(true);
            }}
          >
            Edit
          </Button>
          <Button variant="danger" onClick={() => remove(p)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        The &ldquo;places to visit&rdquo; list in the app. Students can suggest places; nothing
        shows up until it is published here.
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          + New place
        </Button>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white/[0.06] border border-white/10 text-white rounded-xl px-3 py-2 text-sm [&>option]:bg-[#15151d]"
        >
          <option value="">All places</option>
          <option value="false">Pending only</option>
          <option value="true">Published only</option>
        </select>
        <Button onClick={load}>Refresh</Button>
      </div>

      <Alert onDismiss={() => setError('')}>{error}</Alert>
      <Alert tone="good" onDismiss={() => setSuccess('')}>
        {success}
      </Alert>

      <Card className="px-5 py-3">
        <Table columns={columns} rows={places} empty="No places yet." />
      </Card>

      <PlaceForm
        open={formOpen}
        place={editing}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        onError={setError}
      />
    </div>
  );
}
