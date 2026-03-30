import { clearSession, getSession, refreshSession } from './auth';
import { API_URL } from './config';

interface ApiError extends Error {
  status?: number;
}

function extractErrorMessage(text: string, status: number) {
  if (!text) {
    return `API error (${status})`;
  }

  try {
    const parsed = JSON.parse(text) as {
      message?: string | string[];
      error?: string;
    };

    if (Array.isArray(parsed.message) && parsed.message.length > 0) {
      return parsed.message.join(', ');
    }

    if (typeof parsed.message === 'string' && parsed.message.trim()) {
      return parsed.message;
    }

    if (typeof parsed.error === 'string' && parsed.error.trim()) {
      return parsed.error;
    }
  } catch {
    // Fall through to raw text below.
  }

  return text.trim() || `API error (${status})`;
}

function isPublicAuthPath(path: string) {
  return (
    path === '/auth/login' ||
    path === '/auth/refresh' ||
    path === '/auth/register' ||
    path === '/auth/register/organizer'
  );
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

function buildRequestInit(
  options: RequestInit & { json?: unknown } = {},
  accessToken?: string,
): RequestInit {
  const headers = new Headers(options.headers);

  if (accessToken) {
    headers.set('Authorization', `Bearer ${accessToken}`);
  }

  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  return {
    ...options,
    headers,
    body:
      options.json !== undefined
        ? JSON.stringify(options.json)
        : options.body,
  };
}

async function request<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
  retryCount = 0,
) {
  const session = getSession();
  const attachAuth = Boolean(session?.accessToken) && !isPublicAuthPath(path);
  const response = await fetch(`${API_URL}${path}`, {
    ...buildRequestInit(options, attachAuth ? session?.accessToken : undefined),
  });

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401 && !isPublicAuthPath(path)) {
      const refreshedSession = await refreshSession();
      if (refreshedSession && retryCount === 0) {
        return request<T>(path, options, retryCount + 1);
      }

      clearSession();
    }
    const error: ApiError = new Error(extractErrorMessage(text, response.status));
    error.status = response.status;
    throw error;
  }

  return parseJson<T>(response);
}

export function apiGet<T>(path: string) {
  return request<T>(path);
}

export function apiPost<T>(path: string, json?: unknown) {
  return request<T>(path, { method: 'POST', json });
}

export function apiPatch<T>(path: string, json?: unknown) {
  return request<T>(path, { method: 'PATCH', json });
}

export function apiDelete<T>(path: string) {
  return request<T>(path, { method: 'DELETE' });
}

export function resolveImageUrl(url?: string | null) {
  if (!url) {
    return null;
  }

  if (url.startsWith('http')) {
    return url;
  }

  const uploadsIndex = url.indexOf('/uploads/');
  if (uploadsIndex >= 0) {
    const path = url.substring(uploadsIndex);
    return `${API_URL}${path}`;
  }

  if (url.startsWith('uploads/')) {
    return `${API_URL}/${url}`;
  }

  return url;
}

export async function apiUpload<T>(
  path: string,
  formData: FormData,
  method: 'POST' | 'PATCH' = 'PATCH',
  retryCount = 0,
) {
  const session = getSession();
  const attachAuth = Boolean(session?.accessToken) && !isPublicAuthPath(path);
  const response = await fetch(
    `${API_URL}${path}`,
    buildRequestInit(
      {
        method,
        body: formData,
      },
      attachAuth ? session?.accessToken : undefined,
    ),
  );

  if (!response.ok) {
    const text = await response.text();
    if (response.status === 401 && !isPublicAuthPath(path)) {
      const refreshedSession = await refreshSession();
      if (refreshedSession && retryCount === 0) {
        return apiUpload<T>(path, formData, method, retryCount + 1);
      }

      clearSession();
    }
    const error: ApiError = new Error(extractErrorMessage(text, response.status));
    error.status = response.status;
    throw error;
  }

  return parseJson<T>(response);
}
