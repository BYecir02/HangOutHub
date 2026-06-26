import axios, {
  type AxiosError,
  type InternalAxiosRequestConfig,
} from 'axios';

import { API_URL } from '@/config/env';
import { authBus, tokenStore } from './tokens';

type RetryableConfig = InternalAxiosRequestConfig & { _retry?: boolean };

/** Client principal — auth + refresh automatique. */
export const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

/** Client dédié au refresh (sans intercepteurs, pour éviter les boucles). */
const refreshClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
});

const isAuthRoute = (url = '') =>
  url.includes('/auth/login') || url.includes('/auth/refresh');

api.interceptors.request.use((config) => {
  const token = tokenStore.getAccess();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (config.data instanceof FormData) {
    config.headers.delete('Content-Type');
  }
  return config;
});

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = tokenStore.getRefresh();
  if (!refreshToken) return null;

  const { data } = await refreshClient.post<{
    access_token?: string;
    refresh_token?: string;
  }>('/auth/refresh', { refreshToken });

  if (!data.access_token || !data.refresh_token) {
    throw new Error('Réponse de refresh invalide.');
  }

  tokenStore.setAccess(data.access_token);
  tokenStore.setRefresh(data.refresh_token);
  return data.access_token;
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config as RetryableConfig | undefined;

    const shouldRefresh =
      status === 401 &&
      !!original &&
      !original._retry &&
      !isAuthRoute(original.url);

    if (shouldRefresh && original) {
      original._retry = true;
      try {
        if (!refreshInFlight) {
          refreshInFlight = refreshAccessToken().finally(() => {
            refreshInFlight = null;
          });
        }
        const nextToken = await refreshInFlight;
        if (!nextToken) throw new Error('Aucun refresh token disponible.');

        original.headers.Authorization = `Bearer ${nextToken}`;
        return api(original);
      } catch (refreshError) {
        tokenStore.clear();
        authBus.emitForcedLogout();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
