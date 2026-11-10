import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Bookings from './pages/Bookings';
import Waitlist from './pages/Waitlist';
import Notifications from './pages/Notifications';
import Announcements from './pages/Announcements';
import Places from './pages/Places';
import Installations from './pages/Installations';
import Community from './pages/Community';
import Tasks from './pages/Tasks';
import Users from './pages/Users';
import Analytics from './pages/Analytics';
import AppControl from './pages/AppControl';
import Sidebar from './components/Sidebar';

const PAGES = {
  dashboard: { title: '📊 Live Dashboard', component: Dashboard },
  events: { title: '🎫 Events', component: Events },
  bookings: { title: '🪪 Bookings', component: Bookings },
  waitlist: { title: '⏳ Waitlist', component: Waitlist },
  notifications: { title: '📣 Push Notifications', component: Notifications },
  announcements: { title: '🗞️ Announcements', component: Announcements },
  places: { title: '📍 Places to Visit', component: Places },
  installations: { title: '🗺️ Installations', component: Installations },
  community: { title: '💬 Community', component: Community },
  tasks: { title: '✅ Tasks & PR', component: Tasks },
  users: { title: '🎓 Students', component: Users },
  analytics: { title: '📈 Analytics', component: Analytics },
  appcontrol: { title: '⚙️ App Control', component: AppControl },
};

export default function App() {
  const [authed, setAuthed] = useState(() => Boolean(localStorage.getItem('app_admin_token')));
  const [activePage, setActivePage] = useState('dashboard');

  useEffect(() => {
    setAuthed(Boolean(localStorage.getItem('app_admin_token')));
  }, []);

  const handleLogin = () => setAuthed(true);

  const handleLogout = () => {
    localStorage.removeItem('app_admin_token');
    setAuthed(false);
  };

  if (!authed) return <Login onLogin={handleLogin} />;

  const page = PAGES[activePage] ?? PAGES.dashboard;
  const Page = page.component;

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      <div className="fixed top-[-10%] left-[20%] w-[400px] h-[400px] rounded-full bg-amber-600/10 blur-[100px] pointer-events-none z-0" />

      <Sidebar active={activePage} setActive={setActivePage} onLogout={handleLogout} />

      <main className="flex-1 ml-64 min-h-screen relative z-10">
        <div className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06] px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-white">{page.title}</h2>
            <p className="text-xs text-slate-500">Mood Indigo · Festival App Admin</p>
          </div>
        </div>

        <div className="px-8 py-8">
          {/* Remounting on page change keeps each page's filters and fetches
              self-contained — no stale list from the previous screen. */}
          <Page key={activePage} />
        </div>
      </main>
    </div>
  );
}
