import axios, { InternalAxiosRequestConfig, isAxiosError } from 'axios';
import Constants from 'expo-constants';
import * as FileSystem from 'expo-file-system/legacy';
import * as SecureStore from 'expo-secure-store';
import { safeReplace } from './navigation';
import { notifyAuthBootstrapReset } from '@/context/auth-bootstrap';
import { Platform } from 'react-native';

import { getCurrentDataSaver } from './app-preferences';

const runtimeApiUrl =
  (Constants.expoConfig?.extra as { apiUrl?: string } | undefined)?.apiUrl ||
  process.env.EXPO_PUBLIC_API_URL ||
  'http://localhost:3000';

export const BASE_URL = runtimeApiUrl.replace(/\/+$/, '');
const API_URL = `${BASE_URL}/api/v1`;
const isNgrokBaseUrl =
  BASE_URL.includes('ngrok-free.app') ||
  BASE_URL.includes('ngrok-free.dev') ||
  BASE_URL.includes('.ngrok.io');
const defaultHeaders: Record<string, string> = {
  'Content-Type': 'application/json',
};

if (isNgrokBaseUrl) {
  defaultHeaders['ngrok-skip-browser-warning'] = 'true';
}

const ACCESS_TOKEN_KEY = 'userToken';
const REFRESH_TOKEN_KEY = 'refreshToken';
const USER_INFO_KEY = 'userInfo';
const AUTH_REDIRECT_REASON_KEY = 'authRedirectReason';

const FILE_STORAGE_PATH = `${FileSystem.documentDirectory || ''}app-storage-v1.json`;
const SECURE_KEYS = new Set([ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY]);

type FileStorageMap = Record<string, string>;

const readFileStorage = async (): Promise<FileStorageMap> => {
  try {
    const raw = await FileSystem.readAsStringAsync(FILE_STORAGE_PATH);
    const parsed = JSON.parse(raw) as unknown;

    if (parsed && typeof parsed === 'object') {
      return parsed as FileStorageMap;
    }
  } catch {
    // Ignore read failures and treat the store as empty.
  }

  return {};
};

const writeFileStorage = async (nextStorage: FileStorageMap) => {
  await FileSystem.writeAsStringAsync(FILE_STORAGE_PATH, JSON.stringify(nextStorage));
};

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

const api = axios.create({
  baseURL: API_URL,
  headers: defaultHeaders,
});

const refreshClient = axios.create({
  baseURL: API_URL,
  headers: defaultHeaders,
});

let refreshInFlight: Promise<string | null> | null = null;

export const storage = {
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
      return;
    }

    if (SECURE_KEYS.has(key) && value.length <= 1800) {
      await SecureStore.setItemAsync(key, value);
      return;
    }

    const nextStorage = await readFileStorage();
    nextStorage[key] = value;
    await writeFileStorage(nextStorage);
  },
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }

    if (SECURE_KEYS.has(key)) {
      const secureValue = await SecureStore.getItemAsync(key);
      if (secureValue !== null) {
        return secureValue;
      }
    }

    const fileStorage = await readFileStorage();
    if (Object.prototype.hasOwnProperty.call(fileStorage, key)) {
      return fileStorage[key];
    }

    return null;
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
      return;
    }

    if (SECURE_KEYS.has(key)) {
      await SecureStore.deleteItemAsync(key);
    } else {
      await SecureStore.deleteItemAsync(key).catch(() => {});
    }

    try {
      const nextStorage = await readFileStorage();
      if (Object.prototype.hasOwnProperty.call(nextStorage, key)) {
        delete nextStorage[key];
        await writeFileStorage(nextStorage);
      }
    } catch {
      // Ignore cleanup failures.
    }
  },
};

api.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem(ACCESS_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export const clearAuthState = async () => {
  await storage.removeItem(ACCESS_TOKEN_KEY);
  await storage.removeItem(REFRESH_TOKEN_KEY);
  await storage.removeItem(USER_INFO_KEY);

  try {
    const { disconnectDirectChatSocket } = await import('./direct-chat-realtime');
    disconnectDirectChatSocket();
  } catch {
    // Ignore socket cleanup failures during auth teardown.
  }

  try {
    const { disconnectPostsSocket } = await import('./post-realtime');
    disconnectPostsSocket();
  } catch {
    // Ignore socket cleanup failures during auth teardown.
  }

  notifyAuthBootstrapReset();
};

const isAuthRoute = (url: string) =>
  url.includes('/auth/login') ||
  url.includes('/auth/register') ||
  url.includes('/auth/refresh');

const isSilentUnauthorizedEndpoint = (url: string) =>
  url.includes('/notifications/organizer/unread-count') ||
  url.includes('/notifications/unread-count') ||
  url.includes('/events/my-bookings') ||
  url.includes('/friendships/mine') ||
  url.includes('/outings/invitations') ||
  url.includes('/users/me') ||
  url.includes('/users/me/settings');

const refreshAccessToken = async (): Promise<string | null> => {
  const refreshToken = await storage.getItem(REFRESH_TOKEN_KEY);

  if (!refreshToken) {
    return null;
  }

  const response = await refreshClient.post<{
    access_token?: string;
    refresh_token?: string;
  }>('/auth/refresh', {
    refreshToken,
  });

  const nextAccessToken = response.data.access_token;
  const nextRefreshToken = response.data.refresh_token;

  if (!nextAccessToken || !nextRefreshToken) {
    throw new Error('Reponse refresh invalide.');
  }

  await storage.setItem(ACCESS_TOKEN_KEY, nextAccessToken);
  await storage.setItem(REFRESH_TOKEN_KEY, nextRefreshToken);

  return nextAccessToken;
};

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const method = error.config?.method?.toUpperCase() || 'GET';
    const requestUrl = `${error.config?.baseURL || ''}${error.config?.url || ''}`;
    const status = error.response?.status;
    const data = error.response?.data;
    const originalRequest = error.config as RetryableRequestConfig | undefined;
    const requestPath = error.config?.url || '';
    const isSilent401 = status === 401 && isSilentUnauthorizedEndpoint(requestPath);

    if (status && !isSilent401 && status >= 500) {
      console.error(`[API ${status}] ${method} ${requestUrl}`, data);
    }

    const shouldTryRefresh =
      status === 401 &&
      !!originalRequest &&
      !originalRequest._retry &&
      !isAuthRoute(originalRequest.url || '');

    if (shouldTryRefresh && originalRequest) {
      originalRequest._retry = true;

      try {
        if (!refreshInFlight) {
          refreshInFlight = refreshAccessToken().finally(() => {
            refreshInFlight = null;
          });
        }

        const nextToken = await refreshInFlight;

        if (!nextToken) {
          throw new Error('Aucun refresh token disponible.');
        }

        originalRequest.headers = originalRequest.headers || {};
        originalRequest.headers.Authorization = `Bearer ${nextToken}`;

        return api(originalRequest);
      } catch (refreshError) {
        await storage.setItem(AUTH_REDIRECT_REASON_KEY, 'session_expired');
        await clearAuthState();
        safeReplace('/');
        return Promise.reject(refreshError);
      }
    }

    if (status === 401 && isAuthRoute(error.config?.url || '')) {
      await clearAuthState();
      safeReplace('/');
    }

    return Promise.reject(error);
  },
);

export const getApiErrorMessage = (
  error: unknown,
  fallback = 'Une erreur inattendue est survenue.',
) => {
  if (!isAxiosError(error)) {
    return fallback;
  }

  if (!error.response) {
    return 'Connexion impossible. Verifie internet ou l\'URL API.';
  }

  const message =
    (error.response.data as { message?: string | string[] } | undefined)
      ?.message || fallback;

  if (Array.isArray(message)) {
    return message[0] || fallback;
  }

  if (typeof message === 'string') {
    return message;
  }

  return fallback;
};

export const isApiNetworkError = (error: unknown) => {
  if (!isAxiosError(error)) {
    return false;
  }

  return !error.response;
};

export const getImageUrl = (url: string | null | undefined) => {
  if (!url) {
    return null;
  }

  const applyDataSaverOnRemoteUrl = (value: string) => {
    if (!getCurrentDataSaver()) {
      return value;
    }

    try {
      const parsed = new URL(value);

      if (parsed.hostname.includes('images.unsplash.com')) {
        const currentWidth = Number(parsed.searchParams.get('w') || 0);

        if (!currentWidth || currentWidth > 720) {
          parsed.searchParams.set('w', '720');
        }

        parsed.searchParams.set('q', '60');
        parsed.searchParams.set('auto', 'format');
        return parsed.toString();
      }
    } catch {
      return value;
    }

    return value;
  };

  if (url.includes('/uploads/')) {
    const path = url.substring(url.indexOf('/uploads/'));
    return `${BASE_URL}${path}`;
  }

  return applyDataSaverOnRemoteUrl(url);
};

export default api;
