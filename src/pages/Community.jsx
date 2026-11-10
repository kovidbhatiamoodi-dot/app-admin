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
  useFlash,
  STATUS_TONE,
} from '../components/ui';

// Clubs + their posts live on one page because moderating a post almost always
// means looking at which club it came from.

const emptyClub = () => ({ name: '', description: '', logo: '', club_type: 'community' });

function ClubForm({ open, club, onClose, onSaved, onError }) {
  const [form, setForm] = useState(emptyClub);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(club);

  useEffect(() => {
    if (open) {
      setForm(
        club
          ? {
              name: club.name ?? '',
              description: club.description ?? '',
              logo: club.logo ?? '',
              club_type: club.club_type ?? 'community',
            }
          : emptyClub()
      );
    }
  }, [open, club]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (isEdit) await api.updateClub(club._id, form);
      else await api.createClub(form);
      onClose();
      onSaved();
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={isEdit ? `Edit · ${club.name}` : 'New club'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Name">
          <Input required value={form.name} onChange={set('name')} />
        </Field>
        <Field label="Type" hint="Community clubs have a feed; task clubs group tasks.">
          <Select
            value={form.club_type}
            onChange={set('club_type')}
            options={[
              { value: 'community', label: 'Community' },
              { value: 'task', label: 'Task genre' },
            ]}
          />
        </Field>
        <Field label="Logo URL">
          <Input value={form.logo} onChange={set('logo')} />
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={set('description')} rows={3} />
        </Field>
        <div className="flex gap-3 pt-2">
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create club'}
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

function Clubs({ onError, onSuccess }) {
  const [clubs, setClubs] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      setClubs(await api.getClubs());
    } catch (err) {
      onError(err.message);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (club) => {
    if (
      !window.confirm(
        `Delete "${club.name}"? Its posts and announcements go too, and every member leaves it. This cannot be undone.`
      )
    ) {
      return;
    }
    try {
      await api.deleteClub(club._id, { force: true });
      onSuccess('Club deleted');
      load();
    } catch (err) {
      onError(err.message);
    }
  };

  const columns = [
    {
      key: 'name',
      header: 'Club',
      render: (c) => (
        <div>
          <p className="text-white font-medium">{c.name}</p>
          <p className="text-xs text-slate-500">{c.slug}</p>
        </div>
      ),
    },
    {
      key: 'club_type',
      header: 'Type',
      render: (c) => <Badge tone={c.club_type === 'task' ? 'info' : 'neutral'}>{c.club_type}</Badge>,
    },
    { key: 'memberCount', header: 'Members', render: (c) => c.memberCount ?? 0 },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div className="flex gap-2 justify-end">
          <Button
            onClick={() => {
              setEditing(c);
              setFormOpen(true);
            }}
          >
            Edit
          </Button>
          <Button variant="danger" onClick={() => remove(c)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <Button
          variant="primary"
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
        >
          + New club
        </Button>
        <Button onClick={load}>Refresh</Button>
      </div>

      <Card className="px-5 py-3">
        <Table columns={columns} rows={clubs} empty="No clubs yet." />
      </Card>

      <ClubForm
        open={formOpen}
        club={editing}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        onError={onError}
      />
    </div>
  );
}

function Threads({ onError, onSuccess }) {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ status: 'pending', page: 1 });

  const load = useCallback(async () => {
    try {
      setData(await api.getThreads(filters));
    } catch (err) {
      onError(err.message);
    }
  }, [filters, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const setStatus = async (thread, status) => {
    try {
      await api.updateThreadStatus(thread._id, status);
      onSuccess(`Post ${status}`);
      load();
    } catch (err) {
      onError(err.message);
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Post',
      render: (t) => (
        <div>
          <p className="text-white font-medium">{t.title}</p>
          <p className="text-xs text-slate-500 mt-1 max-w-xl whitespace-pre-wrap">{t.content}</p>
          {t.image?.url && (
            <a
              href={t.image.url}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-amber-400 hover:underline mt-1 inline-block"
            >
              View image
            </a>
          )}
        </div>
      ),
    },
    {
      key: 'author',
      header: 'By',
      render: (t) => (
        <span className="text-xs text-slate-400">
          {t.created_by?.full_name ?? '—'}
          <span className="block text-slate-600">{t.club?.name ?? '—'}</span>
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (t) => <Badge tone={STATUS_TONE[t.status] ?? 'neutral'}>{t.status}</Badge>,
    },
    { key: 'likes_count', header: 'Likes', render: (t) => t.likes_count ?? 0 },
    { key: 'createdAt', header: 'Posted', render: (t) => formatDateTime(t.createdAt) },
    {
      key: 'actions',
      header: '',
      render: (t) => (
        <div className="flex gap-2 justify-end">
          {t.status !== 'approved' && (
            <Button variant="good" onClick={() => setStatus(t, 'approved')}>
              Approve
            </Button>
          )}
          {t.status !== 'rejected' && (
            <Button variant="danger" onClick={() => setStatus(t, 'rejected')}>
              Reject
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value, page: 1 })}
          className="bg-white/[0.06] border border-white/10 text-white rounded-xl px-3 py-2 text-sm [&>option]:bg-[#15151d]"
        >
          <option value="pending">Awaiting review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="">All posts</option>
        </select>
        <Button onClick={load}>Refresh</Button>
        <span className="text-xs text-slate-500 ml-auto">
          {data ? `${data.totalDocs} post(s)` : ''}
        </span>
      </div>

      <Card className="px-5 py-3">
        <Table columns={columns} rows={data?.threads} empty="Nothing to review." />
        <Pager
          page={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          onPage={(page) => setFilters((f) => ({ ...f, page }))}
        />
      </Card>
    </div>
  );
}

export default function Community() {
  const [tab, setTab] = useState('threads');
  const { error, setError, success, setSuccess } = useFlash();

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { id: 'threads', label: 'Post moderation' },
          { id: 'clubs', label: 'Clubs' },
        ].map((item) => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              tab === item.id
                ? 'bg-amber-600/20 border-amber-500/30 text-amber-300'
                : 'bg-white/[0.04] border-white/[0.07] text-slate-400 hover:text-white'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      <Alert onDismiss={() => setError('')}>{error}</Alert>
      <Alert tone="good" onDismiss={() => setSuccess('')}>
        {success}
      </Alert>

      {tab === 'threads' ? (
        <Threads onError={setError} onSuccess={setSuccess} />
      ) : (
        <Clubs onError={setError} onSuccess={setSuccess} />
      )}
    </div>
  );
}
