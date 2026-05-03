import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type StoredThemePreference = 'light' | 'dark' | 'system';
export type StoredLanguagePreference = 'fr' | 'en';

type AppPreferencesListener<T> = (value: T) => void;

type AppSettingsLike = {
  theme?: StoredThemePreference;
  language?: StoredLanguagePreference;
  dataSaver?: boolean;
};

const APP_THEME_KEY = 'app_theme_preference';
const APP_LANGUAGE_KEY = 'app_language_preference';
const APP_DATA_SAVER_KEY = 'app_data_saver_preference';

let loaded = false;
let currentThemePreference: StoredThemePreference = 'system';
let currentLanguagePreference: StoredLanguagePreference = 'fr';
let currentDataSaver = false;

const themeListeners = new Set<AppPreferencesListener<StoredThemePreference>>();
const languageListeners =
  new Set<AppPreferencesListener<StoredLanguagePreference>>();
const dataSaverListeners = new Set<AppPreferencesListener<boolean>>();

const getStoredValue = async (key: string) => {
  if (Platform.OS === 'web') {
    return localStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
};

const setStoredValue = async (key: string, value: string) => {
  if (Platform.OS === 'web') {
    localStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
};

const isThemePreference = (value: string | null): value is StoredThemePreference =>
  value === 'light' || value === 'dark' || value === 'system';

const isLanguagePreference = (
  value: string | null,
): value is StoredLanguagePreference => value === 'fr' || value === 'en';

const detectDeviceLanguage = (): StoredLanguagePreference => {
  try {
    const locale = Intl.DateTimeFormat().resolvedOptions().locale || '';
    return locale.toLowerCase().startsWith('en') ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
};

const notifyTheme = () => {
  themeListeners.forEach((listener) => {
    listener(currentThemePreference);
  });
};

const notifyLanguage = () => {
  languageListeners.forEach((listener) => {
    listener(currentLanguagePreference);
  });
};

const notifyDataSaver = () => {
  dataSaverListeners.forEach((listener) => {
    listener(currentDataSaver);
  });
};

export const loadAppPreferences = async (force = false) => {
  if (loaded && !force) {
    return;
  }

  const [storedTheme, storedLanguage, storedDataSaver] = await Promise.all([
    getStoredValue(APP_THEME_KEY),
    getStoredValue(APP_LANGUAGE_KEY),
    getStoredValue(APP_DATA_SAVER_KEY),
  ]);

  if (isThemePreference(storedTheme)) {
    currentThemePreference = storedTheme;
  }

  if (isLanguagePreference(storedLanguage)) {
    currentLanguagePreference = storedLanguage;
  } else {
    currentLanguagePreference = detectDeviceLanguage();
  }

  if (storedDataSaver === 'true' || storedDataSaver === 'false') {
    currentDataSaver = storedDataSaver === 'true';
  }

  loaded = true;
  notifyTheme();
  notifyLanguage();
  notifyDataSaver();
};

export const getCurrentThemePreference = () => currentThemePreference;

export const getCurrentLanguagePreference = () => currentLanguagePreference;

export const getCurrentDataSaver = () => currentDataSaver;

export const setThemePreference = async (value: StoredThemePreference) => {
  currentThemePreference = value;
  await setStoredValue(APP_THEME_KEY, value);
  notifyTheme();
};

export const setLanguagePreference = async (value: StoredLanguagePreference) => {
  currentLanguagePreference = value;
  await setStoredValue(APP_LANGUAGE_KEY, value);
  notifyLanguage();
};

export const setDataSaverPreference = async (value: boolean) => {
  currentDataSaver = value;
  await setStoredValue(APP_DATA_SAVER_KEY, String(value));
  notifyDataSaver();
};

export const syncAppPreferencesFromSettings = async (
  settings: AppSettingsLike,
) => {
  const updates: Promise<void>[] = [];

  if (settings.theme) {
    updates.push(setThemePreference(settings.theme));
  }

  if (settings.language) {
    updates.push(setLanguagePreference(settings.language));
  }

  if (typeof settings.dataSaver === 'boolean') {
    updates.push(setDataSaverPreference(settings.dataSaver));
  }

  if (updates.length > 0) {
    await Promise.all(updates);
  }
};

export const subscribeThemePreference = (
  listener: AppPreferencesListener<StoredThemePreference>,
) => {
  themeListeners.add(listener);
  return () => {
    themeListeners.delete(listener);
  };
};

export const subscribeLanguagePreference = (
  listener: AppPreferencesListener<StoredLanguagePreference>,
) => {
  languageListeners.add(listener);
  return () => {
    languageListeners.delete(listener);
  };
};

export const subscribeDataSaverPreference = (
  listener: AppPreferencesListener<boolean>,
) => {
  dataSaverListeners.add(listener);
  return () => {
    dataSaverListeners.delete(listener);
  };
};