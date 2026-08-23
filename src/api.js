const getApiBaseUrl = () => {
  const explicit = import.meta.env.VITE_APP_BACKEND_URL?.trim();
  if (explicit) return explicit.replace(/\/$/, '');
  // Same host moodi_app's own ApiConfig.baseUrl defaults to (lib/config/api_config.dart)
  // — the actual domain app/backend is deployed at, not a guess.
  return import.meta.env.DEV ? '' : 'https://haven-brain-test.moodi.org';
};

const API_BASE_URL = getApiBaseUrl();

const getToken = () => localStorage.getItem('app_admin_token');

const headers = (extra = {}) => ({
  'Content-Type': 'application/json',
  ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
  ...extra,
});

const handleResponse = async (res) => {
  if (res.status === 401) {
    localStorage.removeItem('app_admin_token');
    window.location.reload();
    // reload is async; throw so callers' .then() chains don't run against undefined
    throw new Error('Session expired — signing out');
  }

  const contentType = res.headers.get('content-type') || '';

  if (!contentType.includes('application/json')) {
    throw new Error(
      res.status === 0
        ? 'Cannot reach the backend — make sure it is running on port 5058'
        : `Server returned ${res.status} (${res.statusText || 'non-JSON response'})`
    );
  }

  let json;
  try {
    json = await res.json();
  } catch {
    throw new Error('Server returned an invalid response');
  }

  if (!res.ok) throw new Error(json.message || `Request failed (${res.status})`);
  return json.data;
};

const safeFetch = async (url, options) => {
  let res;
  try {
    res = await fetch(url, options);
  } catch {
    throw new Error('Cannot reach the backend — make sure it is running on port 5058');
  }
  return handleResponse(res);
};

const get  = (path) => safeFetch(`${API_BASE_URL}${path}`, { headers: headers() });
const post = (path, body) => safeFetch(`${API_BASE_URL}${path}`, { method: 'POST', headers: headers(), body: JSON.stringify(body) });
const patch = (path, body) => safeFetch(`${API_BASE_URL}${path}`, { method: 'PATCH', headers: headers(), body: JSON.stringify(body) });
const del = (path) => safeFetch(`${API_BASE_URL}${path}`, { method: 'DELETE', headers: headers() });

export const api = {
  // ── Auth (shared login: one App Admin account, full access) ─────────────
  login: (username, password) => post('/api/v1/admin/login', { username, password }),

  // ── Dashboard / live event stats ─────────────────────────────────────────
  getDashboard: () => get('/api/v1/coordinator/dashboard'),
  getEventLive: (eventId) => get(`/api/v1/coordinator/event/${eventId}/live`),

  // ── Events ────────────────────────────────────────────────────────────────
  getEvents: () => get('/api/v1/events'),
  createEvent: (event) => post('/api/v1/coordinator/event', event),
  updateEventStatus: (eventId, status) => post(`/api/v1/coordinator/event/${eventId}/status`, { status }),
  updateEventCapacity: (eventId, newCapacity) => post(`/api/v1/coordinator/event/${eventId}/capacity`, { newCapacity }),

  // ── Waitlist ──────────────────────────────────────────────────────────────
  promoteWaitlist: (eventId, count) => post('/api/v1/coordinator/waitlist/promote', { eventId, count }),

  // ── Notifications ─────────────────────────────────────────────────────────
  notifyNearby: (eventId, title, body, radiusMeters) =>
    post('/api/v1/coordinator/notify/nearby', { eventId, title, body, radiusMeters }),
  notifyCampus: (title, body, emergency) =>
    post('/api/v1/coordinator/notify/campus', { title, body, emergency }),

  // ── Places ────────────────────────────────────────────────────────────────
  getPendingPlaces: () => get('/api/v1/festival-admin/places/pending'),
  approvePlace: (placeId) => post('/api/v1/festival-admin/places/approve', { placeId }),

  // ── Installations ─────────────────────────────────────────────────────────
  getInstallations: () => get('/api/v1/installations'),
  createInstallation: (installation) => post('/api/v1/installations', installation),
  updateInstallation: (id, updates) => patch(`/api/v1/installations/${id}`, updates),
  deleteInstallation: (id) => del(`/api/v1/installations/${id}`),

  // ── Analytics ─────────────────────────────────────────────────────────────
  getAnalyticsOverview: () => get('/api/v1/festival-admin/analytics/overview'),
  getEventAnalytics: (eventId) => get(`/api/v1/festival-admin/analytics/event/${eventId}`),

  // Returns a blob — CSV is built server-side.
  exportUsersCsv: async () => {
    const res = await fetch(`${API_BASE_URL}/api/v1/festival-admin/users/export`, { headers: headers() });
    if (!res.ok) {
      const ct = res.headers.get('content-type') || '';
      if (ct.includes('application/json')) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.message || 'Export failed');
      }
      throw new Error(`Export failed (${res.status})`);
    }
    return res.blob();
  },
};
