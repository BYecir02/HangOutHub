import '../config/react-native-warnings';

import { useEffect, useState } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme as useNativeWindColorScheme } from 'nativewind';
import 'react-native-reanimated';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ActivityIndicator, Image, Text, TextInput, View } from 'react-native';
import type { TextInputProps, TextProps } from 'react-native';

import { useFonts } from 'expo-font';

const poppinsFonts = {
  Poppins_400Regular: require('../assets/fonts/Poppins_400Regular.ttf'),
  Poppins_500Medium: require('../assets/fonts/Poppins_500Medium.ttf'),
  Poppins_600SemiBold: require('../assets/fonts/Poppins_600SemiBold.ttf'),
};

const BOOTSTRAP_LOGO = require('../assets/images/hangouthub-logo-mark-512.png');

import '../global.css';

import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { clearAuthState, isUnauthorizedError, storage } from '@/services/api';
import {
  getCurrentThemePreference,
  loadAppPreferences,
  subscribeThemePreference,
  syncAppPreferencesFromSettings,
  type StoredThemePreference,
} from '@/services/auth/app-preferences';
import { getMySettings } from '@/services/user/settings';
import { AuthBootstrapProvider } from '@/context/auth-bootstrap';
import {
  hasCompletedTasteOnboarding,
  resolveStoredUserSession,
} from '@/services/auth/user-session';
import {
  canAccessOrganizerPanel,
  getOrganizerEntryPath,
  isOrganizerUser,
} from '@/services/organizer/organizer-access';
import UserFlowTracker from '@/features/user/components/UserFlowTracker';
import { subscribeAuthBootstrapReset } from '@/context/auth-bootstrap';

export const unstable_settings = {
  anchor: '(tabs)',
};

const HOME_ROUTE = '/(tabs)/home' as Href;
const BOOTSTRAP_MIN_DISPLAY_MS = __DEV__ ? 350 : 0;

const wait = (duration: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, duration);
  });

function AppBootstrapScreen({ isDark }: { isDark: boolean }) {
  return (
    <View
      className={`flex-1 items-center justify-center px-6 ${
        isDark ? 'bg-[#050816]' : 'bg-[#f7fbff]'
      }`}
    >
      <View className="items-center">
        <View
          className={`items-center justify-center rounded-[36px] border p-5 shadow-sm ${
            isDark
              ? 'border-white/10 bg-white/5'
              : 'border-slate-200 bg-white'
          }`}
        >
          <Image
            source={BOOTSTRAP_LOGO}
            style={{ width: 112, height: 112 }}
            resizeMode="contain"
          />
        </View>

        <Text
          className={`mt-6 text-center text-2xl font-bold ${
            isDark ? 'text-white' : 'text-slate-950'
          }`}
        >
          HangOutHub
        </Text>

        <ActivityIndicator
          size="large"
          color="#4c669f"
          className="mt-6"
        />
        <Text
          className={`mt-3 text-center text-sm ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}
        >
          Verification de la session...
        </Text>
      </View>
    </View>
  );
}

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { setColorScheme } = useNativeWindColorScheme();
  const [themePreference, setThemePreference] = useState<StoredThemePreference>(
    getCurrentThemePreference(),
  );
  const [authState, setAuthState] = useState<{
    status: 'loading' | 'unauthenticated' | 'authenticated';
    targetHref: Href | null;
  }>({
    status: 'loading',
    targetHref: null,
  });

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

    const TextWithDefaults = Text as typeof Text & {
      defaultProps?: TextProps;
    };
    if (!TextWithDefaults.defaultProps) {
      TextWithDefaults.defaultProps = {};
    }
    const currentTextStyle = TextWithDefaults.defaultProps.style;
    TextWithDefaults.defaultProps.style = [
      currentTextStyle,
      { fontFamily: 'Poppins_400Regular' },
    ];

    const TextInputWithDefaults = TextInput as typeof TextInput & {
      defaultProps?: TextInputProps;
    };
    if (!TextInputWithDefaults.defaultProps) {
      TextInputWithDefaults.defaultProps = {};
    }
    const currentTextInputStyle = TextInputWithDefaults.defaultProps.style;
    TextInputWithDefaults.defaultProps.style = [
      currentTextInputStyle,
      { fontFamily: 'Poppins_400Regular' },
    ];
  }, [fontsLoaded]);

  useEffect(() => {
    return subscribeAuthBootstrapReset(() => {
      setAuthState({
        status: 'unauthenticated',
        targetHref: null,
      });
    });
  }, []);

  useEffect(() => {
    let isMounted = true;

    const bootstrapAuth = async () => {
      const bootstrapStartedAt = Date.now();

      const token = await storage.getItem('userToken');

      const ensureMinimumDisplay = async () => {
        const elapsed = Date.now() - bootstrapStartedAt;
        const remaining = BOOTSTRAP_MIN_DISPLAY_MS - elapsed;

        if (remaining > 0) {
          await wait(remaining);
        }
      };

      if (!token) {
        await ensureMinimumDisplay();

        if (isMounted) {
          setAuthState({
            status: 'unauthenticated',
            targetHref: null,
          });
        }

        return;
      }

      try {
        const user = await resolveStoredUserSession();

        if (!isMounted) {
          return;
        }

        if (!user) {
          await ensureMinimumDisplay();

          setAuthState({
            status: 'unauthenticated',
            targetHref: null,
          });
          return;
        }

        if (user.email && !user.emailVerifiedAt) {
          await ensureMinimumDisplay();

          setAuthState({
            status: 'authenticated',
            targetHref: {
              pathname: '/verify-email',
              params: { email: user.email },
            } as Href,
          });
          return;
        }

        let fallbackHref: Href = HOME_ROUTE;
        if (!hasCompletedTasteOnboarding(user)) {
          fallbackHref = { pathname: '/preferences', params: { mode: 'onboarding' } } as Href;
        }
        let nextTargetHref: Href = fallbackHref;
        if (isOrganizerUser(user)) {
          nextTargetHref = getOrganizerEntryPath(user) as Href;
        }

        if (isOrganizerUser(user) && !canAccessOrganizerPanel(user)) {
          await clearAuthState();
          await ensureMinimumDisplay();

          setAuthState({
            status: 'unauthenticated',
            targetHref: null,
          });
          return;
        }

        await ensureMinimumDisplay();

        setAuthState({
          status: 'authenticated',
          targetHref: nextTargetHref,
        });

        void (async () => {
          try {
            const settings = await getMySettings();
            if (isMounted) {
              await syncAppPreferencesFromSettings(settings);
            }
          } catch (error) {
            if (isUnauthorizedError(error)) {
              await clearAuthState();
            }
          }
        })();
      } catch (error) {
        if (isUnauthorizedError(error)) {
          await clearAuthState();
        }

        await ensureMinimumDisplay();

        if (isMounted) {
          setAuthState({
            status: 'unauthenticated',
            targetHref: null,
          });
        }
      }
    };

    void bootstrapAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  if (!fontsLoaded || authState.status === 'loading') {
    return <AppBootstrapScreen isDark={colorScheme === 'dark'} />;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <AuthBootstrapProvider value={authState}>
            <UserFlowTracker />
            <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="register" options={{ headerShown: false }} />
            <Stack.Screen name="verify-email" options={{ headerShown: false }} />
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
          </AuthBootstrapProvider>
          <StatusBar style="auto" />
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
