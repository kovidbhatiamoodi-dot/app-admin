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
  Table,
  Textarea,
  useFlash,
} from '../components/ui';

const emptyForm = () => ({ name: '', description: '', lat: '', lng: '', active: true });

const formFrom = (installation) => ({
  name: installation.name ?? '',
  description: installation.description ?? '',
  lat: String(installation.coords?.lat ?? ''),
  lng: String(installation.coords?.lng ?? ''),
  active: installation.active !== false,
});

function InstallationForm({ open, installation, onClose, onSaved, onError }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(installation);

  useEffect(() => {
    if (open) setForm(installation ? formFrom(installation) : emptyForm());
  }, [open, installation]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        name: form.name,
        description: form.description,
        coords: { lat: Number(form.lat), lng: Number(form.lng) },
        active: form.active,
      };
      if (isEdit) await api.updateInstallation(installation._id, payload);
      else await api.createInstallation(payload);
      onClose();
      onSaved();
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      title={isEdit ? `Edit · ${installation.name}` : 'New installation'}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <Input required value={form.name} onChange={set('name')} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Latitude">
            <Input required type="number" step="any" value={form.lat} onChange={set('lat')} />
          </Field>
          <Field label="Longitude">
            <Input required type="number" step="any" value={form.lng} onChange={set('lng')} />
          </Field>
        </div>
        <Field label="Description">
          <Textarea value={form.description} onChange={set('description')} rows={3} />
        </Field>
        <div className="flex gap-3 pt-2">
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create'}
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Installations() {
  const [installations, setInstallations] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { error, setError, success, setSuccess, run } = useFlash();

  const load = useCallback(async () => {
    const result = await run(() => api.getInstallations());
    if (result) setInstallations(result);
  }, [run]);

  useEffect(() => {
    load();
  }, [load]);

  const toggle = async (installation) => {
    const result = await run(
      () => api.updateInstallation(installation._id, { active: !installation.active }),
      installation.active ? 'Hidden from the map.' : 'Visible on the map.'
    );
    if (result) load();
  };

  const remove = async (installation) => {
    if (!window.confirm(`Delete "${installation.name}"? This cannot be undone.`)) return;
    const result = await run(() => api.deleteInstallation(installation._id), 'Deleted');
    if (result) load();
  };

  const columns = [
    {
      key: 'name',
      header: 'Installation',
      render: (i) => (
        <div>
          <p className="text-white font-medium">{i.name}</p>
          {i.description && <p className="text-xs text-slate-500 mt-0.5">{i.description}</p>}
          <p className="text-xs text-slate-600 mt-0.5">
            {Number(i.coords?.lat).toFixed(5)}, {Number(i.coords?.lng).toFixed(5)}
          </p>
        </div>
      ),
    },
    {
      key: 'active',
      header: 'On the map',
      render: (i) =>
        i.active ? <Badge tone="good">Visible</Badge> : <Badge tone="neutral">Hidden</Badge>,
    },
    {
      key: 'actions',
      header: '',
      render: (i) => (
        <div className="flex gap-2 justify-end">
          <Button onClick={() => toggle(i)}>{i.active ? 'Hide' : 'Show'}</Button>
          <Button
            onClick={() => {
              setEditing(i);
              setFormOpen(true);
            }}
          >
            Edit
          </Button>
          <Button variant="danger" onClick={() => remove(i)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Non-bookable map points — art pieces, photo spots, sponsor booths. Hidden ones stay on
        record but disappear from the app&apos;s map.
      </p>

      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          + New installation
        </Button>
        <Button onClick={load}>Refresh</Button>
      </div>

      <Alert onDismiss={() => setError('')}>{error}</Alert>
      <Alert tone="good" onDismiss={() => setSuccess('')}>
        {success}
      </Alert>

      <Card className="px-5 py-3">
        <Table columns={columns} rows={installations} empty="No installations yet." />
      </Card>

      <InstallationForm
        open={formOpen}
        installation={editing}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        onError={setError}
      />
    </div>
  );
}
