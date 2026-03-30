import { API_URL } from './config';

export interface AuthUser {
  id: string;
  username?: string | null;
  email?: string | null;
  role?: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

interface RefreshResponse {
  access_token: string;
  refresh_token: string;
}

const STORAGE_KEY = 'hangouthub_backoffice_auth';
const SESSION_REFRESH_SAFETY_WINDOW_MS = 60_000;
let refreshPromise: Promise<AuthSession | null> | null = null;

export function getSession(): AuthSession | null {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

function decodeJwtPayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.');
  if (parts.length !== 3) {
    return null;
  }

  try {
    const payload = parts[1]
      .replace(/-/g, '+')
      .replace(/_/g, '/')
      .padEnd(Math.ceil(parts[1].length / 4) * 4, '=');
    const json = atob(payload);
    const parsed = JSON.parse(json) as unknown;
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export function isAccessTokenStale(session: AuthSession | null) {
  if (!session?.accessToken) {
    return true;
  }

  const payload = decodeJwtPayload(session.accessToken);
  const exp = payload?.exp;
  if (typeof exp !== 'number') {
    return true;
  }

  const expiresAtMs = exp * 1000;
  return expiresAtMs - Date.now() <= SESSION_REFRESH_SAFETY_WINDOW_MS;
}

export async function refreshSession(): Promise<AuthSession | null> {
  if (refreshPromise) {
    return refreshPromise;
  }

  refreshPromise = (async () => {
    const session = getSession();
    if (!session?.refreshToken) {
      return null;
    }

    try {
      const response = await fetch(`${API_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refreshToken: session.refreshToken }),
      });

      if (!response.ok) {
        clearSession();
        return null;
      }

      const text = await response.text();
      if (!text) {
        clearSession();
        return null;
      }

      const data = JSON.parse(text) as RefreshResponse;
      const nextSession: AuthSession = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: session.user,
      };

      setSession(nextSession);
      return nextSession;
    } catch {
      clearSession();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}
