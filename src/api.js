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

// Drops empty/undefined params so callers can pass their whole filter state.
const qs = (params = {}) => {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    search.set(key, String(value));
  }
  const str = search.toString();
  return str ? `?${str}` : '';
};

const get = (path) => safeFetch(`${API_BASE_URL}${path}`, { headers: headers() });
const post = (path, body) =>
  safeFetch(`${API_BASE_URL}${path}`, {
    method: 'POST',
    headers: headers(),
    body: JSON.stringify(body ?? {}),
  });
const patch = (path, body) =>
  safeFetch(`${API_BASE_URL}${path}`, {
    method: 'PATCH',
    headers: headers(),
    body: JSON.stringify(body ?? {}),
  });
const put = (path, body) =>
  safeFetch(`${API_BASE_URL}${path}`, {
    method: 'PUT',
    headers: headers(),
    body: JSON.stringify(body ?? {}),
  });
const del = (path) =>
  safeFetch(`${API_BASE_URL}${path}`, { method: 'DELETE', headers: headers() });

// Shared by the CSV exports, which return a blob rather than JSON.
const downloadBlob = async (path) => {
  const res = await fetch(`${API_BASE_URL}${path}`, { headers: headers() });
  if (!res.ok) {
    const ct = res.headers.get('content-type') || '';
    if (ct.includes('application/json')) {
      const json = await res.json().catch(() => ({}));
      throw new Error(json.message || 'Export failed');
    }
    throw new Error(`Export failed (${res.status})`);
  }
  return res.blob();
};

export const api = {
  // ── Auth (shared login: one App Admin account, full access) ─────────────
  login: (username, password) => post('/api/v1/admin/login', { username, password }),

  // ── Dashboard / live event stats ─────────────────────────────────────────
  getDashboard: () => get('/api/v1/coordinator/dashboard'),
  getEventLive: (eventId) => get(`/api/v1/coordinator/event/${eventId}/live`),
  getStats: () => get('/api/v1/admin/stats'),

  // ── Events ────────────────────────────────────────────────────────────────
  // Public list (what the app itself sees) and the richer admin table.
  getEvents: () => get('/api/v1/events'),
  getEventsAdmin: (filters) => get(`/api/v1/festival-admin/events${qs(filters)}`),
  createEvent: (event) => post('/api/v1/coordinator/event', event),
  updateEvent: (eventId, updates) => patch(`/api/v1/festival-admin/events/${eventId}`, updates),
  deleteEvent: (eventId, { force = false } = {}) =>
    del(`/api/v1/festival-admin/events/${eventId}${qs({ force: force || undefined })}`),
  updateEventStatus: (eventId, status) =>
    post(`/api/v1/coordinator/event/${eventId}/status`, { status }),
  updateEventCapacity: (eventId, newCapacity) =>
    post(`/api/v1/coordinator/event/${eventId}/capacity`, { newCapacity }),

  // ── Bookings ──────────────────────────────────────────────────────────────
  getBookings: (filters) => get(`/api/v1/festival-admin/bookings${qs(filters)}`),
  cancelBooking: (bookingId) => post(`/api/v1/festival-admin/bookings/${bookingId}/cancel`),
  checkInBooking: (bookingId) => post(`/api/v1/festival-admin/bookings/${bookingId}/check-in`),
  exportBookingsCsv: (filters) =>
    downloadBlob(`/api/v1/festival-admin/bookings/export${qs(filters)}`),

  // ── Waitlist ──────────────────────────────────────────────────────────────
  getWaitlist: (filters) => get(`/api/v1/festival-admin/waitlist${qs(filters)}`),
  removeWaitlistEntry: (entryId) => del(`/api/v1/festival-admin/waitlist/${entryId}`),
  promoteWaitlist: (eventId, count) =>
    post('/api/v1/coordinator/waitlist/promote', { eventId, count }),

  // ── Notifications ─────────────────────────────────────────────────────────
  notifyNearby: (eventId, title, body, radiusMeters) =>
    post('/api/v1/coordinator/notify/nearby', { eventId, title, body, radiusMeters }),
  notifyCampus: (title, body, emergency) =>
    post('/api/v1/coordinator/notify/campus', { title, body, emergency }),

  // ── Places ────────────────────────────────────────────────────────────────
  getPlaces: (filters) => get(`/api/v1/festival-admin/places${qs(filters)}`),
  getPendingPlaces: () => get('/api/v1/festival-admin/places/pending'),
  createPlace: (place) => post('/api/v1/festival-admin/places', place),
  updatePlace: (placeId, updates) => patch(`/api/v1/festival-admin/places/${placeId}`, updates),
  approvePlace: (placeId) => post('/api/v1/festival-admin/places/approve', { placeId }),
  deletePlace: (placeId) => del(`/api/v1/festival-admin/places/${placeId}`),

  // ── Installations ─────────────────────────────────────────────────────────
  getInstallations: () => get('/api/v1/festival-admin/installations'),
  createInstallation: (installation) => post('/api/v1/installations', installation),
  updateInstallation: (id, updates) => patch(`/api/v1/installations/${id}`, updates),
  deleteInstallation: (id) => del(`/api/v1/installations/${id}`),

  // ── Announcements ─────────────────────────────────────────────────────────
  getAnnouncements: (filters) => get(`/api/v1/festival-admin/announcements${qs(filters)}`),
  createAnnouncement: (payload) => post('/api/v1/festival-admin/announcements', payload),
  updateAnnouncement: (id, updates) =>
    patch(`/api/v1/festival-admin/announcements/${id}`, updates),
  deleteAnnouncement: (id) => del(`/api/v1/festival-admin/announcements/${id}`),

  // ── Clubs ─────────────────────────────────────────────────────────────────
  getClubs: () => get('/api/v1/festival-admin/clubs'),
  createClub: (payload) => post('/api/v1/festival-admin/clubs', payload),
  updateClub: (id, updates) => patch(`/api/v1/festival-admin/clubs/${id}`, updates),
  deleteClub: (id, { force = false } = {}) =>
    del(`/api/v1/festival-admin/clubs/${id}${qs({ force: force || undefined })}`),

  // ── Users ─────────────────────────────────────────────────────────────────
  getUsers: (filters) => get(`/api/v1/festival-admin/users${qs(filters)}`),
  getUser: (userId) => get(`/api/v1/festival-admin/users/${userId}`),
  updateUserRole: (userId, role) =>
    patch(`/api/v1/festival-admin/users/${userId}/role`, { role }),
  deleteUser: (userId) => del(`/api/v1/festival-admin/users/${userId}`),
  // Points live on the CCP admin router (same token).
  updateUserPoints: (userId, payload) => patch(`/api/v1/admin/users/${userId}/points`, payload),
  getUserPointsLog: (userId) => get(`/api/v1/admin/users/${userId}/points-log`),
  exportUsersCsv: () => downloadBlob('/api/v1/festival-admin/users/export'),

  // ── Community moderation (CCP admin router, same token) ──────────────────
  getThreads: (filters) => get(`/api/v1/admin/threads${qs(filters)}`),
  getPendingThreads: (filters) => get(`/api/v1/admin/threads/pending${qs(filters)}`),
  updateThreadStatus: (id, status) => patch(`/api/v1/admin/threads/${id}/status`, { status }),

  // ── Tasks + submissions (CCP admin router, same token) ───────────────────
  getTasks: () => get('/api/v1/admin/tasks'),
  getTaskGenres: () => get('/api/v1/admin/tasks/genres'),
  createTask: (payload) => post('/api/v1/admin/tasks', payload),
  updateTask: (id, updates) => patch(`/api/v1/admin/tasks/${id}`, updates),
  deleteTask: (id) => del(`/api/v1/admin/tasks/${id}`),
  getTaskSubmissions: (filters) => get(`/api/v1/admin/task-submissions${qs(filters)}`),
  updateTaskSubmissionStatus: (id, status) =>
    patch(`/api/v1/admin/task-submissions/${id}/status`, { status }),

  // ── PR representative queue ──────────────────────────────────────────────
  getPrCandidates: (filters) => get(`/api/v1/admin/pr-candidates${qs(filters)}`),
  updatePrStatus: (id, status) => patch(`/api/v1/admin/pr-candidates/${id}/status`, { status }),

  // ── Analytics ─────────────────────────────────────────────────────────────
  getAnalyticsOverview: () => get('/api/v1/festival-admin/analytics/overview'),
  getEventAnalytics: (eventId) => get(`/api/v1/festival-admin/analytics/event/${eventId}`),

  // ── App control (server-enforced runtime config) ──────────────────────────
  getAppConfig: () => get('/api/v1/app-config/admin'),
  saveAppConfigGroup: (key, value) => put(`/api/v1/app-config/${key}`, { value }),
  saveAppConfigBulk: (config) => patch('/api/v1/app-config', { config }),
  resetAppConfigGroup: (key) => post(`/api/v1/app-config/${key}/reset`),
};

// Triggers a browser download for a blob the API returned.
export const saveBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};
