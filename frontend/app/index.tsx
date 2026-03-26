import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, type Href } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import AuthTextField from '@/components/auth/AuthTextField';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import api, { getApiErrorMessage, storage } from '@/services/api';
import {
  canAccessOrganizerPanel,
  getOrganizerAccessDenialReason,
  getOrganizerEntryPath,
  isOrganizerUser,
} from '@/services/organizer-access';
import {
  clearStoredUserSession,
  resolveStoredUserSession,
  setStoredUserSession,
  type StoredUserSession,
} from '@/services/user-session';

const LOGIN_HIGHLIGHTS = [
  { icon: 'musical-notes-outline', labelKey: 'loginHighlightEventsLive' },
  { icon: 'wine-outline', labelKey: 'loginHighlightRooftops' },
  { icon: 'location-outline', labelKey: 'loginHighlightCotonouSpots' },
] as const;

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useI18n();

  const clearSession = async () => {
    await storage.removeItem('userToken');
    await storage.removeItem('refreshToken');
    await clearStoredUserSession();
  };

  const showOrganizerDeniedAlert = (user: StoredUserSession) => {
    const reason = getOrganizerAccessDenialReason(user);

    if (reason === 'PENDING') {
      Alert.alert(t('loginPendingValidationTitle'), t('loginPendingValidationMessage'));
      return;
    }

    if (reason === 'REJECTED') {
      Alert.alert(t('loginOrganizerRejectedTitle'), t('loginOrganizerRejectedMessage'));
      return;
    }

    if (reason === 'SUSPENDED') {
      Alert.alert(t('loginOrganizerSuspendedTitle'), t('loginOrganizerSuspendedMessage'));
    }
  };

  useEffect(() => {
    const restoreAuthNotice = async () => {
      const reason = await storage.getItem('authRedirectReason');

      if (reason === 'session_expired') {
        setAuthNotice(t('loginSessionExpiredNotice'));
      }

      if (reason) {
        await storage.removeItem('authRedirectReason');
      }
    };

    void restoreAuthNotice();

    const checkLogin = async () => {
    
      try {
        const token = await storage.getItem('userToken');

        if (!token) {
          return;
        }

        const user = await resolveStoredUserSession();

        if (!user) {
          await clearSession();
          return;
        }

        if (isOrganizerUser(user)) {
          if (!canAccessOrganizerPanel(user)) {
            await clearSession();
            return;
          }

          router.replace(getOrganizerEntryPath(user) as Href);
          return;
        }

        router.replace('/(tabs)/home');
      } catch {
        console.log('Pas de session active');
      }
    };

    void checkLogin();
  }, [router, t]);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert(t('commonErrorTitle'), t('loginMissingFields'));
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', { email, password });
      const { access_token, refresh_token, user } = response.data as {
        access_token: string;
        refresh_token: string;
        user: StoredUserSession;
      };

      await storage.setItem('userToken', access_token);
      await storage.setItem('refreshToken', refresh_token);
      const persistedUser = await setStoredUserSession(user);

      if (!isOrganizerUser(persistedUser)) {
        router.replace('/(tabs)/home');
        return;
      }

      if (!canAccessOrganizerPanel(persistedUser)) {
        showOrganizerDeniedAlert(persistedUser);
        await clearSession();
        return;
      }

      router.replace(getOrganizerEntryPath(persistedUser) as Href);
    } catch (error) {
      Alert.alert(
        'Oups',
        getApiErrorMessage(
          error,
          t('loginUnavailableFallback'),
        ),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-[#08111f]">
      <LinearGradient
        colors={
          isDark
            ? ['#08111f', '#12233f', '#24122a']
            : ['#fff3e4', '#eef4ff', '#ffffff']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />

      <View className="absolute -left-16 top-16 h-48 w-48 rounded-full bg-[#ff7a451f]" />
      <View className="absolute right-[-32px] top-36 h-56 w-56 rounded-full bg-[#4c669f26]" />
      <View className="absolute bottom-24 left-8 h-32 w-32 rounded-full bg-[#2ecc7122]" />

      <SafeAreaView className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 28 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View className="pt-6">
              <View className="self-start rounded-full border border-white/20 bg-white/10 px-4 py-2">
                <Text
                  className={`text-xs font-semibold uppercase tracking-[0.28em] ${
                    isDark ? 'text-white' : 'text-slate-700'
                  }`}
                >
                  HangOutHub
                </Text>
              </View>

              <Text
                className={`mt-6 text-[40px] font-black leading-[44px] ${
                  isDark ? 'text-white' : 'text-slate-950'
                }`}
              >
                {t('loginHeroTitle')}
              </Text>

              <Text
                className={`mt-4 max-w-[92%] text-base leading-7 ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {t('loginHeroSubtitle')}
              </Text>

              <View className="mt-6 flex-row flex-wrap">
                {LOGIN_HIGHLIGHTS.map((item) => (
                  <View
                    key={item.labelKey}
                    className={`mb-3 mr-3 flex-row items-center rounded-full px-4 py-2 ${
                      isDark ? 'bg-white/10' : 'bg-white/80'
                    }`}
                  >
                    <Ionicons
                      name={item.icon}
                      size={16}
                      color={isDark ? '#f8fafc' : '#0f172a'}
                    />
                    <Text
                      className={`ml-2 text-sm font-medium ${
                        isDark ? 'text-white' : 'text-slate-800'
                      }`}
                    >
                      {t(item.labelKey)}
                    </Text>
                  </View>
                ))}
              </View>
            </View>

            <View
              className={`mt-10 rounded-[36px] border p-6 ${
                isDark
                  ? 'border-white/10 bg-[#07101dcc]'
                  : 'border-white/90 bg-white'
              }`}
            >
              <View className="mb-6">
                <View>
                  <Text
                    className={`text-xs font-semibold uppercase tracking-[0.24em] ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}
                  >
                    {t('loginCardEyebrow')}
                  </Text>
                  <Text
                    className={`mt-2 text-2xl font-bold ${
                      isDark ? 'text-white' : 'text-slate-950'
                    }`}
                  >
                    {t('loginCardTitle')}
                  </Text>
                </View>

                {authNotice ? (
                  <View
                    className={`mt-4 rounded-2xl px-4 py-3 ${
                      isDark ? 'bg-amber-900/30' : 'bg-amber-50'
                    }`}
                  >
                    <Text
                      className={`text-sm ${
                        isDark ? 'text-amber-200' : 'text-amber-700'
                      }`}
                    >
                      {authNotice}
                    </Text>
                  </View>
                ) : null}
              </View>

              <AuthTextField
                label={t('loginEmailLabel')}
                isDark={isDark}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder={t('loginEmailPlaceholder')}
              />

              <AuthTextField
                label={t('loginPasswordLabel')}
                isDark={isDark}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder={t('loginPasswordPlaceholder')}
                hint={t('loginPasswordHint')}
              />

              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.9}
                className={`mt-2 self-stretch overflow-hidden rounded-[28px] ${
                  loading ? 'opacity-70' : ''
                }`}
              >
                <LinearGradient
                  colors={['#4c669f', '#ff7a45']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  className="w-full items-center rounded-[28px] px-6 py-[18px]"
                >
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className="text-base font-semibold text-white p-5">
                      {t('loginSubmit')}
                    </Text>
                  )}
                </LinearGradient>
              </TouchableOpacity>

              <View
                className={`mt-5 rounded-[24px] px-4 py-4 ${
                  isDark ? 'bg-white/5' : 'bg-slate-50'
                }`}
              >
                <Text
                  className={`text-sm leading-6 ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {t('loginUserTypeHint')}
                </Text>
              </View>
            </View>

            <View className="mt-8 flex-row items-center justify-center">
              <Text
                className={`text-sm ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {t('loginNoAccount')}
              </Text>
              <TouchableOpacity onPress={() => router.push('/register')}>
                <Text className="ml-2 text-sm font-semibold text-[#4c669f]">
                  {t('loginCreateAccess')}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
