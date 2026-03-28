import { clearSession, getSession } from './auth';

const API_URL =
  import.meta.env.VITE_API_URL?.toString().replace(/\/$/, '') ||
  'http://localhost:3000';

interface ApiError extends Error {
  status?: number;
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

async function request<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
) {
  const session = getSession();
  const headers = new Headers(options.headers);

  if (session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }

  if (options.json !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers,
    body: options.json !== undefined ? JSON.stringify(options.json) : options.body,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }
    const error: ApiError = new Error('API error');
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
) {
  const session = getSession();
  const headers = new Headers();

  if (session?.accessToken) {
    headers.set('Authorization', `Bearer ${session.accessToken}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: formData,
  });

  if (!response.ok) {
    if (response.status === 401) {
      clearSession();
    }
    const error: ApiError = new Error('API error');
    error.status = response.status;
    throw error;
  }

  return parseJson<T>(response);
}
