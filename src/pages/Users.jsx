import { useCallback, useEffect, useState } from 'react';
import { api, saveBlob } from '../api';
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  Modal,
  Pager,
  SectionTitle,
  Select,
  Table,
  formatDateTime,
  useFlash,
  STATUS_TONE,
} from '../components/ui';

const ROLES = ['user', 'moderator', 'admin', 'superadmin'];
const PR_STATUSES = ['none', 'pending', 'approved', 'rejected'];

function UserDetail({ userId, onClose, onChanged, onError, onSuccess }) {
  const [detail, setDetail] = useState(null);
  const [points, setPoints] = useState('');
  const [role, setRole] = useState('user');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.getUser(userId);
      setDetail(data);
      setPoints(String(data.user.totalpoints ?? 0));
      setRole(data.user.role ?? 'user');
    } catch (err) {
      onError(err.message);
      onClose();
    }
  }, [userId, onError, onClose]);

  useEffect(() => {
    load();
  }, [load]);

  const savePoints = async () => {
    setBusy(true);
    try {
      await api.updateUserPoints(userId, { points: Number(points) });
      onSuccess('Points updated — the change is logged against this student.');
      await load();
      onChanged();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const saveRole = async () => {
    setBusy(true);
    try {
      await api.updateUserRole(userId, role);
      onSuccess('Role updated');
      onChanged();
    } catch (err) {
      onError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const user = detail?.user;

  return (
    <Modal open wide title={user ? user.full_name : 'Student'} onClose={onClose}>
      {!detail ? (
        <p className="text-slate-500 text-sm">Loading…</p>
      ) : (
        <div className="space-y-6">
          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <p className="text-slate-400">
              Email <span className="text-slate-200 block">{user.email}</span>
            </p>
            <p className="text-slate-400">
              MI number <span className="text-slate-200 block">{user.mi_no ?? '—'}</span>
            </p>
            <p className="text-slate-400">
              College <span className="text-slate-200 block">{user.college ?? '—'}</span>
            </p>
            <p className="text-slate-400">
              Referral code{' '}
              <span className="text-slate-200 block font-mono">{user.referral_code ?? '—'}</span>
            </p>
            <p className="text-slate-400">
              Joined <span className="text-slate-200 block">{formatDateTime(user.createdAt)}</span>
            </p>
            <p className="text-slate-400">
              PR status{' '}
              <span className="block mt-1">
                <Badge tone={STATUS_TONE[user.pr_status] ?? 'neutral'}>
                  {user.pr_status ?? 'none'}
                </Badge>
              </span>
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Card className="px-4 py-4 space-y-3">
              <SectionTitle hint="Sets the total outright; the difference is written to the points log.">
                Points
              </SectionTitle>
              <div className="flex gap-2">
                <Input type="number" min={0} value={points} onChange={setPoints} />
                <Button variant="primary" disabled={busy} onClick={savePoints}>
                  Save
                </Button>
              </div>
            </Card>

            <Card className="px-4 py-4 space-y-3">
              <SectionTitle hint="Only affects backend permissions, not what the app shows.">
                Role
              </SectionTitle>
              <div className="flex gap-2">
                <Select value={role} onChange={setRole} options={ROLES} />
                <Button variant="primary" disabled={busy} onClick={saveRole}>
                  Save
                </Button>
              </div>
            </Card>
          </div>

          <div>
            <SectionTitle>Bookings ({detail.bookings.length})</SectionTitle>
            <Table
              columns={[
                { key: 'event', header: 'Event', render: (b) => b.eventId?.name ?? '—' },
                {
                  key: 'when',
                  header: 'Starts',
                  render: (b) => formatDateTime(b.eventId?.startTime),
                },
                {
                  key: 'status',
                  header: 'Status',
                  render: (b) => (
                    <Badge tone={STATUS_TONE[b.status] ?? 'neutral'}>{b.status}</Badge>
                  ),
                },
              ]}
              rows={detail.bookings}
              empty="No bookings."
            />
          </div>

          <div>
            <SectionTitle>Waitlist ({detail.waitlist.length})</SectionTitle>
            <Table
              columns={[
                { key: 'event', header: 'Event', render: (w) => w.eventId?.name ?? '—' },
                { key: 'position', header: 'Position', render: (w) => w.position ?? '—' },
                {
                  key: 'status',
                  header: 'Status',
                  render: (w) => (
                    <Badge tone={STATUS_TONE[w.status] ?? 'neutral'}>{w.status}</Badge>
                  ),
                },
              ]}
              rows={detail.waitlist}
              empty="Not on any waitlist."
            />
          </div>

          <div>
            <SectionTitle>Recent points activity</SectionTitle>
            <Table
              columns={[
                { key: 'reason', header: 'Reason' },
                {
                  key: 'change_amount',
                  header: 'Change',
                  render: (row) => (
                    <span className={row.change_amount >= 0 ? 'text-emerald-300' : 'text-red-300'}>
                      {row.change_amount >= 0 ? '+' : ''}
                      {row.change_amount}
                    </span>
                  ),
                },
                { key: 'final_points', header: 'Total after' },
                { key: 'createdAt', header: 'When', render: (row) => formatDateTime(row.createdAt) },
              ]}
              rows={detail.pointsLog}
              empty="No points activity."
            />
          </div>
        </div>
      )}
    </Modal>
  );
}

export default function Users() {
  const [data, setData] = useState(null);
  const [filters, setFilters] = useState({ q: '', pr_status: '', page: 1 });
  const [openUserId, setOpenUserId] = useState(null);
  const { error, setError, success, setSuccess, run } = useFlash();

  const load = useCallback(async () => {
    const result = await run(() => api.getUsers(filters));
    if (result) setData(result);
  }, [filters, run]);

  useEffect(() => {
    load();
  }, [load]);

  const remove = async (user) => {
    if (
      !window.confirm(
        `Delete ${user.full_name} (${user.email})? Their bookings are cancelled (seats go back to the pool) and the account is removed. This cannot be undone.`
      )
    ) {
      return;
    }
    const result = await run(() => api.deleteUser(user._id), 'Account deleted');
    if (result) load();
  };

  const exportCsv = async () => {
    const blob = await run(() => api.exportUsersCsv());
    if (blob) saveBlob(blob, `festival_users_${Date.now()}.csv`);
  };

  const columns = [
    {
      key: 'full_name',
      header: 'Student',
      render: (u) => (
        <div>
          <p className="text-white font-medium">{u.full_name}</p>
          <p className="text-xs text-slate-500">
            {u.email}
            {u.mi_no ? ` · ${u.mi_no}` : ''}
          </p>
        </div>
      ),
    },
    { key: 'college', header: 'College', render: (u) => u.college ?? '—' },
    { key: 'totalpoints', header: 'Points', render: (u) => u.totalpoints ?? 0 },
    { key: 'bookingCount', header: 'Bookings', render: (u) => u.bookingCount ?? 0 },
    {
      key: 'pr_status',
      header: 'PR',
      render: (u) => (
        <Badge tone={STATUS_TONE[u.pr_status] ?? 'neutral'}>{u.pr_status ?? 'none'}</Badge>
      ),
    },
    { key: 'createdAt', header: 'Joined', render: (u) => formatDateTime(u.createdAt) },
    {
      key: 'actions',
      header: '',
      render: (u) => (
        <div className="flex gap-2 justify-end">
          <Button onClick={() => setOpenUserId(u._id)}>Open</Button>
          <Button variant="danger" onClick={() => remove(u)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={filters.q}
          onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value, page: 1 }))}
          placeholder="Search name, email, MI no, referral code"
          className="bg-white/[0.06] border border-white/10 text-white placeholder-slate-500 rounded-xl px-3 py-2 text-sm w-72"
        />
        <select
          value={filters.pr_status}
          onChange={(e) => setFilters((f) => ({ ...f, pr_status: e.target.value, page: 1 }))}
          className="bg-white/[0.06] border border-white/10 text-white rounded-xl px-3 py-2 text-sm [&>option]:bg-[#15151d]"
        >
          <option value="">Any PR status</option>
          {PR_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <Button onClick={load}>Refresh</Button>
        <Button onClick={exportCsv}>Export CSV</Button>
        <span className="text-xs text-slate-500 ml-auto">
          {data ? `${data.totalDocs} student(s)` : ''}
        </span>
      </div>

      <Alert onDismiss={() => setError('')}>{error}</Alert>
      <Alert tone="good" onDismiss={() => setSuccess('')}>
        {success}
      </Alert>

      <Card className="px-5 py-3">
        <Table columns={columns} rows={data?.users} empty="No students match this search." />
        <Pager
          page={data?.page ?? 1}
          totalPages={data?.totalPages ?? 1}
          onPage={(page) => setFilters((f) => ({ ...f, page }))}
        />
      </Card>

      {openUserId && (
        <UserDetail
          userId={openUserId}
          onClose={() => setOpenUserId(null)}
          onChanged={load}
          onError={setError}
          onSuccess={setSuccess}
        />
      )}
    </div>
  );
}
