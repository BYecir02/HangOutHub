import { useEffect, useState } from 'react';

import {
  getCurrentLanguagePreference,
  loadAppPreferences,
  subscribeLanguagePreference,
  type StoredLanguagePreference,
} from '@/services/auth/app-preferences';

export function useAppLanguage(): StoredLanguagePreference {
  const [languagePreference, setLanguagePreference] =
    useState<StoredLanguagePreference>(getCurrentLanguagePreference());

  useEffect(() => {
    const unsubscribe = subscribeLanguagePreference(setLanguagePreference);
    void loadAppPreferences();

    return unsubscribe;
  }, []);

  return languagePreference;
}
