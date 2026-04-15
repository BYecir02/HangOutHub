import { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { clearSession, getSession } from '../lib/auth';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/parcours', label: 'Parcours' },
  { to: '/approvals', label: 'Validations' },
  { to: '/categories', label: 'Categories & tags' },
  { to: '/reports', label: 'Signalements' },
  { to: '/users', label: 'Utilisateurs' },
  { to: '/events', label: 'Evenements' },
  { to: '/places', label: 'Lieux' },
  { to: '/settings', label: 'Parametres' },
];

export default function Shell() {
  const navigate = useNavigate();
  const location = useLocation();
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    localStorage.setItem(themeKey, theme);
  }, [theme]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!sidebarOpen) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [sidebarOpen]);

  const toggleLabel = useMemo(
    () => (theme === 'dark' ? 'Mode clair' : 'Mode sombre'),
    [theme],
  );

  const handleLogout = () => {
    clearSession();
    navigate('/login');
  };

  const sidebarContent = (
    <>
      <div>
        <div className="mb-8 flex items-start justify-between gap-3 lg:block">
          <div>
            <img
              src={theme === 'dark' ? '/2.png' : '/1.png'}
              alt="HangOutHub"
              className="h-10 w-auto max-w-[180px] object-contain"
            />
            <p className="mt-2 text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
              HangOutHub
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 dark:text-slate-100">
              Backoffice
            </h1>
          </div>

          <button
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 lg:hidden dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            aria-label="Fermer la navigation"
          >
            Fermer
          </button>
        </div>

        <button
          type="button"
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="mt-0 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
        >
          {toggleLabel}
        </button>

        <nav className="mt-6 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1 lg:gap-0 lg:space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center rounded-xl px-4 py-3 text-sm font-semibold transition ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-soft dark:bg-white dark:text-slate-950'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </div>

      <div className="mt-6 rounded-xl bg-slate-50 p-4 dark:bg-slate-900/60 lg:mt-0">
        <p className="text-xs text-slate-500 dark:text-slate-400">Connecte en tant que</p>
        <p className="mt-2 text-sm font-semibold text-slate-700 dark:text-slate-100">
          {session?.user?.email || 'admin'}
        </p>
        <button
          onClick={handleLogout}
          className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-white dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-950"
        >
          Se deconnecter
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <img
              src={theme === 'dark' ? '/2.png' : '/1.png'}
              alt="HangOutHub"
              className="h-8 w-auto max-w-[120px] object-contain"
            />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                Backoffice
              </p>
              <p className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                {session?.user?.email || 'admin'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="rounded-full border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-200"
            >
              {toggleLabel}
            </button>
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-100"
              aria-label="Ouvrir la navigation"
            >
              <span className="sr-only">Menu</span>
              <span className="space-y-1.5">
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
                <span className="block h-0.5 w-5 rounded-full bg-current" />
              </span>
            </button>
          </div>
        </div>
      </header>

      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Fermer la navigation"
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden"
        />
      ) : null}

      <div className="flex min-h-screen w-full flex-col gap-4 px-3 py-4 sm:px-4 sm:py-6 lg:flex-row lg:items-start lg:px-6">
        <aside
          className={`fixed inset-y-0 left-0 z-40 flex w-[90vw] max-w-sm flex-col justify-between rounded-r-2xl bg-white p-5 shadow-2xl transition-transform duration-300 lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:w-64 lg:max-w-none lg:translate-x-0 lg:rounded-2xl lg:shadow-soft dark:bg-slate-950 dark:shadow-black/30 ${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
          }`}
        >
          {sidebarContent}
        </aside>

        <main className="min-w-0 flex-1 lg:pt-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
