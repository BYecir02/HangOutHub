import { useMemo, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { clearSession, getSession } from '../lib/auth';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/approvals', label: 'Validations' },
  { to: '/categories', label: 'Categories & tags' },
  { to: '/reports', label: 'Signalements' },
  { to: '/users', label: 'Utilisateurs' },
  { to: '/events', label: 'Evenements' },
  { to: '/places', label: 'Lieux' },
];

export default function Shell() {
  const navigate = useNavigate();
  const session = getSession();
  const themeKey = 'hangouthub_backoffice_theme';
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const stored = localStorage.getItem(themeKey);
    if (stored === 'dark' || stored === 'light') {
      return stored;
    }
    const prefersDark = window.matchMedia?.('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  });

  const toggleLabel = useMemo(
    () => (theme === 'dark' ? 'Mode clair' : 'Mode sombre'),
    [theme],
  );

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(themeKey, next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto flex min-h-screen w-full max-w-[1400px] flex-col gap-6 px-4 py-6 lg:flex-row lg:items-start lg:px-6">
        <aside className="flex w-full flex-col justify-between rounded-2xl bg-white p-6 shadow-soft lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-64">
          <div>
            <div className="mb-8">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
                HangOutHub
              </p>
              <h1 className="mt-2 text-2xl font-bold text-slate-900">
                Backoffice
              </h1>
              <button
                onClick={toggleTheme}
                className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                {toggleLabel}
              </button>
            </div>

            <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1 lg:space-y-2 lg:gap-0">
              {navItems.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
                      isActive
                        ? 'bg-slate-900 text-white shadow-soft'
                        : 'text-slate-600 hover:bg-slate-100'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </nav>
          </div>

          <div className="mt-6 rounded-xl bg-slate-50 p-4 lg:mt-0">
            <p className="text-xs text-slate-500">Connecte en tant que</p>
            <p className="mt-2 text-sm font-semibold text-slate-700">
              {session?.user?.email || 'admin'}
            </p>
            <button
              onClick={handleLogout}
              className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white"
            >
              Se deconnecter
            </button>
          </div>
        </aside>

        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

