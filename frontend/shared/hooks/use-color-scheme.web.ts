import { useEffect, useState } from 'react';
import { useColorScheme as useRNColorScheme } from 'react-native';

import {
  getCurrentThemePreference,
  loadAppPreferences,
  subscribeThemePreference,
} from '@/services/auth/app-preferences';

/**
 * To support static rendering, this value needs to be re-calculated on the client side for web
 */
export function useColorScheme() {
  const [hasHydrated, setHasHydrated] = useState(false);
  const [themePreference, setThemePreference] = useState(
    getCurrentThemePreference(),
  );

  useEffect(() => {
    setHasHydrated(true);
    const unsubscribe = subscribeThemePreference(setThemePreference);
    void loadAppPreferences();

    return unsubscribe;
  }, []);

  const colorScheme = useRNColorScheme();
  const effectiveColorScheme = colorScheme || 'light';

  if (!hasHydrated) {
    return 'light';
  }

  if (themePreference === 'system') {
    return effectiveColorScheme;
  }

  return themePreference;
}
