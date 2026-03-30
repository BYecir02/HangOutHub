import type { FormEvent } from 'react';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import Card from '../components/Card';
import FormField from '../components/FormField';
import { setSession } from '../lib/auth';
import { apiPost } from '../lib/api';

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: {
    id: string;
    username?: string | null;
    email?: string | null;
    role?: string | null;
  };
}

export default function LoginPage() {
  const navigate = useNavigate();
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await apiPost<LoginResponse>('/auth/login', {
        email,
        password,
      });

      const role = response.user?.role?.toUpperCase() || 'USER';
      if (role !== 'ADMIN') {
        setError('Acces reserve aux administrateurs.');
        return;
      }

      setSession({
        accessToken: response.access_token,
        refreshToken: response.refresh_token,
        user: response.user,
      });

      navigate('/');
    } catch {
      setError('Email ou mot de passe invalide.');
    } finally {
      setLoading(false);
    }
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem(themeKey, next);
    document.documentElement.classList.toggle('dark', next === 'dark');
  };

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-6 sm:px-6">
      <Card className="w-full max-w-md p-5 sm:p-8">
        <img
          src={theme === 'dark' ? '/2.png' : '/1.png'}
          alt="HangOutHub"
          className="h-12 w-auto max-w-[220px] object-contain"
        />
        <p className="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-gray-400">
          HangOutHub
        </p>
        <h1 className="mt-3 text-xl font-bold text-slate-900 sm:text-2xl">
          Acces Backoffice
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Connecte-toi pour administrer les lieux et evenements.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <FormField label="Email">
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-500"
              placeholder="admin@hangouthub.dev"
              required
            />
          </FormField>
          <FormField label="Mot de passe">
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-700 outline-none focus:border-brand-500"
              placeholder="********"
              required
            />
          </FormField>

          {error ? (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full rounded-xl px-4 py-3 text-sm font-semibold transition hover:bg-brand-600 disabled:opacity-60"
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        </form>
        <button
          onClick={toggleTheme}
          type="button"
          className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
        >
          {toggleLabel}
        </button>
      </Card>
    </div>
  );
}


