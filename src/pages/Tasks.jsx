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
  Toggle,
  formatDateTime,
  useFlash,
  STATUS_TONE,
} from '../components/ui';

const LINK_TYPES = ['drive', 'linkedin', 'whatsapp', 'instagram'];

const emptyTask = () => ({
  title: '',
  description: '',
  points: 0,
  points_diff_college: 0,
  club: '',
  pinned: false,
  type: 'standard',
  requiresLink: false,
  linkType: 'drive',
});

function TaskForm({ open, task, clubs, onClose, onSaved, onError }) {
  const [form, setForm] = useState(emptyTask);
  const [saving, setSaving] = useState(false);
  const isEdit = Boolean(task);

  useEffect(() => {
    if (!open) return;
    setForm(
      task
        ? {
            title: task.title ?? '',
            description: task.description ?? '',
            points: task.points ?? 0,
            points_diff_college: task.points_diff_college ?? 0,
            club: task.club?._id ?? '',
            pinned: Boolean(task.pinned),
            type: task.type ?? 'standard',
            requiresLink: Boolean(task.requiresLink),
            linkType: task.linkType ?? 'drive',
          }
        : emptyTask()
    );
  }, [open, task]);

  const set = (key) => (value) => setForm((f) => ({ ...f, [key]: value }));

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        points: Number(form.points) || 0,
        points_diff_college: Number(form.points_diff_college) || 0,
        club: form.club || null,
      };
      if (isEdit) await api.updateTask(task._id, payload);
      else await api.createTask(payload);
      onClose();
      onSaved();
    } catch (err) {
      onError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} wide title={isEdit ? `Edit · ${task.title}` : 'New task'} onClose={onClose}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Title">
          <Input required value={form.title} onChange={set('title')} />
        </Field>
        <Field label="Description">
          <Textarea value={form.description} onChange={set('description')} rows={3} />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Points">
            <Input type="number" min={0} value={form.points} onChange={set('points')} />
          </Field>
          <Field label="Points (different college)" hint="Used for referral-style tasks.">
            <Input
              type="number"
              min={0}
              value={form.points_diff_college}
              onChange={set('points_diff_college')}
            />
          </Field>
          <Field label="Club / genre">
            <Select
              value={form.club}
              onChange={set('club')}
              placeholder="No club"
              options={clubs.map((club) => ({ value: club._id, label: club.name }))}
            />
          </Field>
          <Field label="Type">
            <Select
              value={form.type}
              onChange={set('type')}
              options={[
                { value: 'standard', label: 'Standard' },
                { value: 'referral', label: 'Referral' },
              ]}
            />
          </Field>
          {form.requiresLink && (
            <Field label="Proof link type">
              <Select value={form.linkType} onChange={set('linkType')} options={LINK_TYPES} />
            </Field>
          )}
        </div>

        <div className="space-y-2">
          <Toggle checked={form.pinned} onChange={set('pinned')} label="Pin to the top of the list" />
          <Toggle
            checked={form.requiresLink}
            onChange={set('requiresLink')}
            label="Student must submit a proof link"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="primary" type="submit" disabled={saving}>
            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Create task'}
          </Button>
          <Button onClick={onClose}>Cancel</Button>
        </div>
      </form>
    </Modal>
  );
}

function TaskList({ clubs, onError, onSuccess }) {
  const [tasks, setTasks] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    try {
      setTasks(await api.getTasks());
    } catch (err) {
      onError(err.message);
    }
  }, [onError]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (task) => {
    if (!window.confirm(`Delete "${task.title}"? Students can no longer submit it.`)) return;
    try {
      await api.deleteTask(task._id);
      onSuccess('Task deleted');
      load();
    } catch (err) {
      onError(err.message);
    }
  };

  const columns = [
    {
      key: 'title',
      header: 'Task',
      render: (t) => (
        <div>
          <p className="text-white font-medium">
            {t.pinned && <span className="text-amber-400 mr-1">★</span>}
            {t.title}
          </p>
          <p className="text-xs text-slate-500">{t.club?.name ?? 'No club'}</p>
        </div>
      ),
    },
    {
      key: 'points',
      header: 'Points',
      render: (t) => (
        <span>
          {t.points}
          {t.points_diff_college ? (
            <span className="block text-xs text-slate-500">
              {t.points_diff_college} other college
            </span>
          ) : null}
        </span>
      ),
    },
    { key: 'type', header: 'Type', render: (t) => <Badge tone="neutral">{t.type}</Badge> },
    {
      key: 'requiresLink',
      header: 'Proof',
      render: (t) => (t.requiresLink ? t.linkType : '—'),
    },
    {
      key: 'actions',
      header: '',
      render: (t) => (
        <div className="flex gap-2 justify-end">
          <Button
            onClick={() => {
              setEditing(t);
              setFormOpen(true);
            }}
          >
            Edit
          </Button>
          <Button variant="danger" onClick={() => remove(t)}>
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
          + New task
        </Button>
        <Button onClick={load}>Refresh</Button>
      </div>

      <Card className="px-5 py-3">
        <Table columns={columns} rows={tasks} empty="No tasks yet." />
      </Card>

      <TaskForm
        open={formOpen}
        task={editing}
        clubs={clubs}
        onClose={() => setFormOpen(false)}
        onSaved={load}
        onError={onError}
      />
    </div>
  );
}

function Submissions({ onError, onSuccess }) {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ status: 'pending', page: 1 });

  const load = useCallback(async () => {
    try {
      setData(await api.getTaskSubmissions(filters));
    } catch (err) {
      onError(err.message);
    }
  }, [filters, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const review = async (submission, status) => {
    try {
      await api.updateTaskSubmissionStatus(submission._id, status);
      onSuccess(
        status === 'approved'
          ? 'Approved — points are queued for the student.'
          : `Submission ${status}`
      );
      load();
    } catch (err) {
      onError(err.message);
    }
  };

  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (s) => (
        <div>
          <p className="text-white font-medium">{s.user?.full_name ?? '—'}</p>
          <p className="text-xs text-slate-500">{s.user?.email ?? '—'}</p>
        </div>
      ),
    },
    {
      key: 'task',
      header: 'Task',
      render: (s) => (
        <span>
          {s.task?.title ?? '—'}
          <span className="block text-xs text-slate-500">{s.task?.points ?? 0} points</span>
        </span>
      ),
    },
    {
      key: 'link',
      header: 'Proof',
      render: (s) =>
        s.link ? (
          <a
            href={s.link}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-amber-400 hover:underline break-all"
          >
            Open link
          </a>
        ) : (
          '—'
        ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (s) => <Badge tone={STATUS_TONE[s.status] ?? 'neutral'}>{s.status}</Badge>,
    },
    { key: 'createdAt', header: 'Submitted', render: (s) => formatDateTime(s.createdAt) },
    {
      key: 'actions',
      header: '',
      render: (s) => (
        <div className="flex gap-2 justify-end">
          {s.status !== 'approved' && (
            <Button variant="good" onClick={() => review(s, 'approved')}>
              Approve
            </Button>
          )}
          {s.status !== 'rejected' && (
            <Button variant="danger" onClick={() => review(s, 'rejected')}>
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
          <option value="">All</option>
        </select>
        <Button onClick={load}>Refresh</Button>
      </div>

      <Card className="px-5 py-3">
        <Table columns={columns} rows={data?.submissions} empty="Nothing to review." />
        <Pager
          page={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          onPage={(page) => setFilters((f) => ({ ...f, page }))}
        />
      </Card>
    </div>
  );
}

function PrQueue({ onError, onSuccess }) {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ status: 'pending', page: 1 });

  const load = useCallback(async () => {
    try {
      setData(await api.getPrCandidates(filters));
    } catch (err) {
      onError(err.message);
    }
  }, [filters, onError]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (candidate, status) => {
    try {
      await api.updatePrStatus(candidate._id, status);
      onSuccess(
        status === 'approved'
          ? 'Promoted — the student gets their PR card and email.'
          : `Marked ${status}`
      );
      load();
    } catch (err) {
      onError(err.message);
    }
  };

  const columns = [
    {
      key: 'student',
      header: 'Student',
      render: (c) => (
        <div>
          <p className="text-white font-medium">{c.full_name}</p>
          <p className="text-xs text-slate-500">
            {c.email}
            {c.mi_no ? ` · ${c.mi_no}` : ''}
          </p>
        </div>
      ),
    },
    { key: 'college', header: 'College', render: (c) => c.college ?? '—' },
    { key: 'totalpoints', header: 'Points' },
    {
      key: 'pr_status',
      header: 'Status',
      render: (c) => <Badge tone={STATUS_TONE[c.pr_status] ?? 'neutral'}>{c.pr_status}</Badge>,
    },
    {
      key: 'pr_qualified_at',
      header: 'Qualified',
      render: (c) => formatDateTime(c.pr_qualified_at),
    },
    {
      key: 'actions',
      header: '',
      render: (c) => (
        <div className="flex gap-2 justify-end">
          {c.pr_status !== 'approved' && (
            <Button variant="good" onClick={() => decide(c, 'approved')}>
              Approve
            </Button>
          )}
          {c.pr_status !== 'rejected' && (
            <Button variant="danger" onClick={() => decide(c, 'rejected')}>
              Reject
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-500">
        Students who crossed the PR points threshold. Nobody is promoted automatically — approving
        here is what unlocks their PR status. The threshold itself is under App control → Points
        economy.
      </p>

      <div className="flex items-center gap-3">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ status: e.target.value, page: 1 })}
          className="bg-white/[0.06] border border-white/10 text-white rounded-xl px-3 py-2 text-sm [&>option]:bg-[#15151d]"
        >
          <option value="pending">Awaiting review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
        <Button onClick={load}>Refresh</Button>
        {data?.threshold !== undefined && (
          <span className="text-xs text-slate-500 ml-auto">
            Current threshold: {data.threshold} points
          </span>
        )}
      </div>

      <Card className="px-5 py-3">
        <Table columns={columns} rows={data?.candidates} empty="Nobody in the queue." />
        <Pager
          page={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          onPage={(page) => setFilters((f) => ({ ...f, page }))}
        />
      </Card>
    </div>
  );
}

export default function Tasks() {
  const [tab, setTab] = useState('submissions');
  const [clubs, setClubs] = useState([]);
  const { error, setError, success, setSuccess } = useFlash();

  useEffect(() => {
    api
      .getClubs()
      .then(setClubs)
      .catch(() => setClubs([]));
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {[
          { id: 'submissions', label: 'Submissions' },
          { id: 'tasks', label: 'Tasks' },
          { id: 'pr', label: 'PR queue' },
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

      {tab === 'submissions' && <Submissions onError={setError} onSuccess={setSuccess} />}
      {tab === 'tasks' && <TaskList clubs={clubs} onError={setError} onSuccess={setSuccess} />}
      {tab === 'pr' && <PrQueue onError={setError} onSuccess={setSuccess} />}
    </div>
  );
}
