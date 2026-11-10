import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import {
  Alert,
  Badge,
  Button,
  Card,
  Field,
  Input,
  SectionTitle,
  Textarea,
  Toggle,
  useFlash,
} from '../components/ui';

// ─────────────────────────────────────────────────────────────────────────────
// Editor for the backend's runtime config (backend/src/config/
// app_config.defaults.js). Every switch here is enforced by the server on the
// next request, so it changes what the already-installed app can do — no app
// rebuild, no Play Store republish.
//
// The form is generated from the config payload itself: whatever groups and
// keys the backend ships, this page can edit. That way adding a setting on the
// server needs no change here.
// ─────────────────────────────────────────────────────────────────────────────

const LABELS = {
  blockApi: 'Also block the app’s API (hard maintenance)',
  enabled: 'Enabled',
  geofenceEnforced: 'Require students to be near the venue',
  geofenceRadiusBonusM: 'Extra geofence slack (metres)',
  maxPerUser: 'Max bookings per student (0 = unlimited)',
  cancelCutoffMinutesBeforeStart: 'Block cancelling within (minutes of start)',
  waitlistPromotionWindowMinutes: 'Waitlist claim window (minutes)',
  prThreshold: 'Points needed to enter PR review',
  spinWheelWeights: 'Spin wheel odds (one weight per slice, in wheel order)',
  spinWheelDailyLimit: 'One spin per day',
  supportEmail: 'Support email',
  title: 'Title',
  message: 'Message',
};

const humanize = (key) =>
  LABELS[key] ??
  key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]+/g, ' ')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();

const isPlainObject = (value) =>
  value !== null && typeof value === 'object' && !Array.isArray(value);

const setPath = (object, path, value) => {
  const next = Array.isArray(object) ? [...object] : { ...object };
  let cursor = next;
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i];
    cursor[key] = Array.isArray(cursor[key]) ? [...cursor[key]] : { ...cursor[key] };
    cursor = cursor[key];
  }
  cursor[path[path.length - 1]] = value;
  return next;
};

/** One leaf control, chosen from the value's own type. */
function Leaf({ path, value, onChange }) {
  const key = path[path.length - 1];
  const label = humanize(key);

  if (typeof value === 'boolean') {
    return (
      <div className="py-2">
        <Toggle checked={value} onChange={(next) => onChange(path, next)} label={label} />
      </div>
    );
  }

  if (typeof value === 'number') {
    return (
      <Field label={label}>
        <Input
          type="number"
          value={value}
          onChange={(next) => onChange(path, next === '' ? 0 : Number(next))}
        />
      </Field>
    );
  }

  if (Array.isArray(value) && value.every((item) => typeof item === 'number')) {
    return (
      <Field
        label={label}
        hint="Comma-separated numbers. The number of values must stay the same."
      >
        <Input
          value={value.join(', ')}
          onChange={(next) =>
            onChange(
              path,
              next
                .split(',')
                .map((part) => Number(part.trim()))
                .filter((n) => Number.isFinite(n))
            )
          }
        />
      </Field>
    );
  }

  if (typeof value === 'string') {
    const long = value.length > 60 || key === 'message';
    return (
      <Field label={label}>
        {long ? (
          <Textarea value={value} onChange={(next) => onChange(path, next)} />
        ) : (
          <Input value={value} onChange={(next) => onChange(path, next)} />
        )}
      </Field>
    );
  }

  // Anything else (arrays of objects, nulls) — raw JSON, so nothing is
  // uneditable just because this page has no widget for it.
  return (
    <Field label={`${label} (JSON)`}>
      <Textarea
        rows={4}
        value={JSON.stringify(value, null, 2)}
        onChange={(next) => {
          try {
            onChange(path, JSON.parse(next));
          } catch {
            /* keep the last valid value until the JSON parses */
          }
        }}
      />
    </Field>
  );
}

function Branch({ path, value, onChange }) {
  if (!isPlainObject(value)) return <Leaf path={path} value={value} onChange={onChange} />;

  return (
    <div className="space-y-3">
      {path.length > 0 && (
        <p className="text-xs uppercase tracking-wide text-slate-500 pt-2">
          {humanize(path[path.length - 1])}
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        {Object.entries(value).map(([key, child]) =>
          isPlainObject(child) ? null : (
            <Leaf key={key} path={[...path, key]} value={child} onChange={onChange} />
          )
        )}
      </div>
      {Object.entries(value)
        .filter(([, child]) => isPlainObject(child))
        .map(([key, child]) => (
          <div key={key} className="border-l border-white/[0.07] pl-4">
            <Branch path={[...path, key]} value={child} onChange={onChange} />
          </div>
        ))}
    </div>
  );
}

export default function AppControl() {
  const [payload, setPayload] = useState(null);
  const [draft, setDraft] = useState({});
  const [activeGroup, setActiveGroup] = useState(null);
  const { error, setError, success, setSuccess, run } = useFlash();
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    const data = await run(() => api.getAppConfig());
    if (!data) return;
    setPayload(data);
    setDraft(data.config);
    setActiveGroup((current) => current ?? data.groups?.[0]?.key ?? null);
  }, [run]);

  useEffect(() => {
    load();
  }, [load]);

  const onChange = (path, value) => setDraft((current) => setPath(current, path, value));

  const dirty = useMemo(() => {
    if (!payload) return {};
    return Object.fromEntries(
      Object.keys(draft).map((key) => [
        key,
        JSON.stringify(draft[key]) !== JSON.stringify(payload.config[key]),
      ])
    );
  }, [draft, payload]);

  const saveGroup = async (key) => {
    setSaving(true);
    const result = await run(
      () => api.saveAppConfigGroup(key, draft[key]),
      'Saved — live for the app on its next request.'
    );
    setSaving(false);
    if (result) await load();
  };

  const resetGroup = async (key) => {
    if (!window.confirm(`Reset "${key}" back to the shipped defaults?`)) return;
    setSaving(true);
    const result = await run(() => api.resetAppConfigGroup(key), 'Reset to defaults.');
    setSaving(false);
    if (result) await load();
  };

  if (!payload) {
    return (
      <div className="space-y-4 max-w-3xl">
        <Alert onDismiss={() => setError('')}>{error}</Alert>
        {!error && <p className="text-slate-500 text-sm">Loading…</p>}
      </div>
    );
  }

  const group = payload.groups.find((g) => g.key === activeGroup) ?? payload.groups[0];
  const maintenanceOn = draft.app?.maintenance?.enabled;
  const offFeatures = Object.entries(draft.features ?? {})
    .filter(([, on]) => on === false)
    .map(([key]) => key);

  return (
    <div className="space-y-5 max-w-5xl">
      <Alert onDismiss={() => setError('')}>{error}</Alert>
      <Alert tone="good" onDismiss={() => setSuccess('')}>
        {success}
      </Alert>

      <Card className="px-5 py-4">
        <p className="text-sm text-slate-300">
          These settings are enforced by the backend, so they change what the installed app can do
          immediately — nothing here needs an app update.
        </p>
        <p className="text-xs text-slate-500 mt-2">
          Anything cosmetic (screen text, colours, which tabs exist) is drawn by the app itself and
          can only change in a new app build.
        </p>
        {(maintenanceOn || offFeatures.length > 0) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {maintenanceOn && <Badge tone="bad">Maintenance mode on</Badge>}
            {offFeatures.map((key) => (
              <Badge key={key} tone="warn">
                {humanize(key)} off
              </Badge>
            ))}
          </div>
        )}
      </Card>

      <div className="flex flex-wrap gap-2">
        {payload.groups.map((g) => (
          <button
            key={g.key}
            onClick={() => setActiveGroup(g.key)}
            className={`px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
              g.key === group.key
                ? 'bg-amber-600/20 border-amber-500/30 text-amber-300'
                : 'bg-white/[0.04] border-white/[0.07] text-slate-400 hover:text-white'
            }`}
          >
            {g.label}
            {dirty[g.key] && <span className="ml-2 text-amber-400">•</span>}
          </button>
        ))}
      </div>

      <Card className="px-6 py-5">
        <SectionTitle hint={group.help}>{group.label}</SectionTitle>

        <Branch path={[group.key]} value={draft[group.key]} onChange={onChange} />

        <div className="flex items-center gap-3 mt-6 pt-4 border-t border-white/[0.07]">
          <Button variant="primary" disabled={saving || !dirty[group.key]} onClick={() => saveGroup(group.key)}>
            {saving ? 'Saving…' : 'Save changes'}
          </Button>
          <Button
            disabled={saving || !dirty[group.key]}
            onClick={() => setDraft((current) => ({ ...current, [group.key]: payload.config[group.key] }))}
          >
            Discard
          </Button>
          <Button variant="danger" disabled={saving} onClick={() => resetGroup(group.key)}>
            Reset to defaults
          </Button>
          {payload.overrides?.[group.key] && (
            <span className="text-xs text-slate-500 ml-auto">
              Last changed by {payload.overrides[group.key].updatedBy} ·{' '}
              {new Date(payload.overrides[group.key].updatedAt).toLocaleString()}
            </span>
          )}
        </div>
      </Card>
    </div>
  );
}
