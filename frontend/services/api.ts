import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { router } from 'expo-router';
import { Platform } from 'react-native';

export const BASE_URL =
  process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/v1`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const storage = {
  setItem: async (key: string, value: string) => {
    if (Platform.OS === 'web') {
      localStorage.setItem(key, value);
    } else {
      await SecureStore.setItemAsync(key, value);
    }
  },
  getItem: async (key: string) => {
    if (Platform.OS === 'web') {
      return localStorage.getItem(key);
    }
    return SecureStore.getItemAsync(key);
  },
  removeItem: async (key: string) => {
    if (Platform.OS === 'web') {
      localStorage.removeItem(key);
    } else {
      await SecureStore.deleteItemAsync(key);
    }
  },
};

api.interceptors.request.use(
  async (config) => {
    const token = await storage.getItem('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const method = error.config?.method?.toUpperCase() || 'GET';
    const url = `${error.config?.baseURL || ''}${error.config?.url || ''}`;
    const status = error.response?.status;
    const data = error.response?.data;

    if (status) {
      console.error(`[API ${status}] ${method} ${url}`, data);
    }

    if (status === 401) {
      await storage.removeItem('userToken');
      await storage.removeItem('userInfo');
      router.replace('/');
    }

    return Promise.reject(error);
  },
);

export const getImageUrl = (url: string | null | undefined) => {
  if (!url) {
    return null;
  }

  if (url.includes('/uploads/')) {
    const path = url.substring(url.indexOf('/uploads/'));
    return `${BASE_URL}${path}`;
  }

  return url;
};

export default api;
