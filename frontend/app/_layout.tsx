import { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { storage } from '@/services/api';
import {
  loadAppPreferences,
  syncAppPreferencesFromSettings,
} from '@/services/app-preferences';
import { getMySettings } from '@/services/settings';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();

  useEffect(() => {
    setColorScheme(colorScheme === 'dark' ? 'dark' : 'light');
  }, [colorScheme, setColorScheme]);

  useEffect(() => {
    let isMounted = true;

    const bootstrapPreferences = async () => {
      await loadAppPreferences();

      const token = await storage.getItem('userToken');

      if (!token || !isMounted) {
        return;
      }

      try {
        const settings = await getMySettings();

        if (isMounted) {
          await syncAppPreferencesFromSettings(settings);
        }
      } catch {
        // Ignore l'erreur: l'app continue sur les preferences locales.
      }
    };

    void bootstrapPreferences();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="edit-profile" options={{ headerShown: false }} />
          <Stack.Screen name="preferences" options={{ headerShown: false }} />
          <Stack.Screen
            name="settings"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="help-support"
            options={{
              headerShown: false,
            }}
          />
          <Stack.Screen
            name="create-modal"
            options={{
              presentation: 'transparentModal',
              headerShown: false,
              animation: 'none',
            }}
          />
          <Stack.Screen
            name="event"
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
          />
          <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="outing"
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
          />
          <Stack.Screen name="outing/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="place"
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
          />
          <Stack.Screen name="place/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="category/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="events" options={{ headerShown: false }} />
          <Stack.Screen name="places" options={{ headerShown: false }} />
          <Stack.Screen name="discover" options={{ headerShown: false }} />
          <Stack.Screen
            name="post"
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="organizer/create-place"
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
          />
          <Stack.Screen
            name="comments"
            options={{
              presentation: 'transparentModal',
              headerShown: false,
              animation: 'fade',
            }}
          />
          <Stack.Screen name="search" options={{ headerShown: false }} />
          <Stack.Screen name="notifications" options={{ headerShown: false }} />
          <Stack.Screen name="friend-requests" options={{ headerShown: false }} />
          <Stack.Screen
            name="outing-invitations"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="connections" options={{ headerShown: false }} />
          <Stack.Screen name="messages" options={{ headerShown: false }} />
          <Stack.Screen
            name="outing-chat/[id]"
            options={{ headerShown: false }}
          />
          <Stack.Screen name="user/[id]" options={{ headerShown: false }} />
        </Stack>
        <StatusBar style="auto" />
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
