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
  formatDateTime,
  useFlash,
} from '../components/ui';

const emptyForm = () => ({ title: '', content: '', type: 'global', clubId: '' });

const formFrom = (announcement) => ({
  title: announcement.title ?? '',
  content: announcement.content ?? '',
  type: announcement.type ?? 'global',
  clubId: announcement.club?._id ?? '',
});

function AnnouncementForm({ open, announcement, clubs, onClose, onSaved, onError }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(announcement);

  useEffect(() => {
    if (open) setForm(announcement ? formFrom(announcement) : emptyForm());
  }, [open, announcement]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        content: form.content,
        type: form.type,
        ...(form.type === 'club' ? { clubId: form.clubId } : {}),
      };
      if (isEdit) await api.updateAnnouncement(announcement._id, payload);
      else await api.createAnnouncement(payload);
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
      title={isEdit ? 'Edit announcement' : 'New announcement'}
      onClose={onClose}
    >
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title">
          <Input required value={form.title} onChange={set('title')} />
        </Field>
        <Field label="Message">
          <Textarea value={form.content} onChange={set('content')} rows={5} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Audience">
            <Select
              value={form.type}
              onChange={set('type')}
              options={[
                { value: 'global', label: 'Everyone' },
                { value: 'club', label: 'One club' },
              ]}
            />
          </Field>
          {form.type === 'club' && (
            <Field label="Club">
              <Select
                value={form.clubId}
                onChange={set('clubId')}
                placeholder="Pick a club"
                options={clubs.map((club) => ({ value: club._id, label: club.name }))}
              />
            </Field>
          )}
        </div>

        <p className="text-xs text-slate-500">
          This posts to the announcements list inside the app. It does not send a push notification
          — use the Notifications page for that.
        </p>

        <div className="flex gap-3 pt-2">
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Publish'}
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

export default function Announcements() {
  const [rows, setRows] = useState(null);
  const [clubs, setClubs] = useState([]);
  const [filter, setFilter] = useState('');
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const { error, setError, success, setSuccess, run } = useFlash();

  const load = useCallback(async () => {
    const result = await run(() => api.getAnnouncements({ type: filter }));
    if (result) setRows(result);
  }, [filter, run]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .getClubs()
      .then(setClubs)
      .catch(() => setClubs([]));
  }, []);

  const remove = async (announcement) => {
    if (!window.confirm(`Delete "${announcement.title}"?`)) return;
    const result = await run(() => api.deleteAnnouncement(announcement._id), 'Deleted');
    if (result) load();
  };

  const columns = [
    {
      key: 'title',
      header: 'Announcement',
      render: (a) => (
        <div>
          <p className="text-white font-medium">{a.title}</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xl whitespace-pre-wrap">{a.content}</p>
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Audience',
      render: (a) =>
        a.type === 'global' ? (
          <Badge tone="info">Everyone</Badge>
        ) : (
          <Badge tone="neutral">{a.club?.name ?? 'Club'}</Badge>
        ),
    },
    { key: 'createdAt', header: 'Posted', render: (a) => formatDateTime(a.createdAt) },
    {
      key: 'actions',
      header: '',
      render: (a) => (
        <div className="flex gap-2 justify-end">
          <Button
            onClick={() => {
              setEditing(a);
              setFormOpen(true);
            }}
          >
            Edit
          </Button>
          <Button variant="danger" onClick={() => remove(a)}>
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
          + New announcement
        </Button>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-white/[0.06] border border-white/10 text-white rounded-xl px-3 py-2 text-sm [&>option]:bg-[#15151d]"
        >
          <option value="">All announcements</option>
          <option value="global">Everyone</option>
          <option value="club">Club only</option>
        </select>
        <Button onClick={load}>Refresh</Button>
      </div>

      <Alert onDismiss={() => setError('')}>{error}</Alert>
      <Alert tone="good" onDismiss={() => setSuccess('')}>
        {success}
      </Alert>

      <Card className="px-5 py-3">
        <Table columns={columns} rows={rows} empty="Nothing announced yet." />
      </Card>

      <AnnouncementForm
        open={formOpen}
        announcement={editing}
        clubs={clubs}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        onError={setError}
      />
    </div>
  );
}
