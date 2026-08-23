import { useEffect, useState } from 'react';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Events from './pages/Events';
import Notifications from './pages/Notifications';
import Places from './pages/Places';
import Installations from './pages/Installations';
import Analytics from './pages/Analytics';
import Sidebar from './components/Sidebar';

const PAGE_TITLES = {
  dashboard: '📊 Live Dashboard',
  events: '🎫 Events',
  notifications: '📣 Notifications',
  places: '📍 Place Suggestions',
  installations: '🗺️ Installations',
  analytics: '📈 Analytics',
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

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex">
      <div className="fixed top-[-10%] left-[20%] w-[400px] h-[400px] rounded-full bg-amber-600/10 blur-[100px] pointer-events-none z-0" />

      <Sidebar active={activePage} setActive={setActivePage} onLogout={handleLogout} />

      <main className="flex-1 ml-64 min-h-screen relative z-10">
        <div className="sticky top-0 z-40 bg-[#0a0a0f]/80 backdrop-blur-xl border-b border-white/[0.06] px-8 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-medium text-white">{PAGE_TITLES[activePage]}</h2>
            <p className="text-xs text-slate-500">Mood Indigo · Festival App Admin</p>
          </div>
        </div>

        <div className="px-8 py-8">
          {activePage === 'dashboard' && <Dashboard />}
          {activePage === 'events' && <Events />}
          {activePage === 'notifications' && <Notifications />}
          {activePage === 'places' && <Places />}
          {activePage === 'installations' && <Installations />}
          {activePage === 'analytics' && <Analytics />}
        </div>
      </main>
    </div>
  );
}
