import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { LogBox } from 'react-native';
import { ActivityIndicator, Text, TextInput, View } from 'react-native';

import { useFonts } from 'expo-font';

const poppinsFonts = {
  Poppins_400Regular: require('../assets/fonts/Poppins_400Regular.ttf'),
  Poppins_500Medium: require('../assets/fonts/Poppins_500Medium.ttf'),
  Poppins_600SemiBold: require('../assets/fonts/Poppins_600SemiBold.ttf'),
};

import '../global.css';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { storage } from '@/services/api';
import {
  getCurrentThemePreference,
  loadAppPreferences,
  subscribeThemePreference,
  syncAppPreferencesFromSettings,
  type StoredThemePreference,
} from '@/services/app-preferences';
import { getMySettings } from '@/services/settings';

export const unstable_settings = {
  anchor: '(tabs)',
};

LogBox.ignoreLogs([
  'SafeAreaView has been deprecated and will be removed in a future release.',
  "Due to changes in Androids permission requirements, Expo Go can no longer provide full access to the media library.",
]);

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();
  const [themePreference, setThemePreference] = useState<StoredThemePreference>(
    getCurrentThemePreference(),
  );

  useEffect(() => {
    const unsubscribe = subscribeThemePreference(setThemePreference);
    void loadAppPreferences();

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (themePreference === 'system') {
      setColorScheme('system');
      return;
    }

    setColorScheme(themePreference);
  }, [setColorScheme, themePreference]);

  const [fontsLoaded] = useFonts(poppinsFonts);

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }

    if (!Text.defaultProps) {
      Text.defaultProps = {};
    }
    Text.defaultProps.style = {
      ...(Text.defaultProps.style || {}),
      fontFamily: 'Poppins_400Regular',
    };

    if (!TextInput.defaultProps) {
      TextInput.defaultProps = {};
    }
    TextInput.defaultProps.style = {
      ...(TextInput.defaultProps.style || {}),
      fontFamily: 'Poppins_400Regular',
    };
  }, [fontsLoaded]);

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

  if (!fontsLoaded) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#4c669f" />
        <Text className="mt-2 text-gray-500 dark:text-gray-400">
          Chargement en cours…
        </Text>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="register" options={{ headerShown: false }} />
          <Stack.Screen
            name="activate-pro"
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
          />
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
            name="notification-settings"
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
          <Stack.Screen name="event-edit/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="event/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="event-booking/[id]" options={{ headerShown: false }} />
          <Stack.Screen
            name="location"
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
          />
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
          <Stack.Screen name="event-scans/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="my-tickets" options={{ headerShown: false }} />
          <Stack.Screen name="my-ticket/[id]" options={{ headerShown: false }} />
          <Stack.Screen name="places" options={{ headerShown: false }} />
          <Stack.Screen name="discover" options={{ headerShown: false }} />
          <Stack.Screen
            name="post"
            options={{ headerShown: false, presentation: 'fullScreenModal' }}
          />
          <Stack.Screen name="organizer" options={{ headerShown: false }} />
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
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
