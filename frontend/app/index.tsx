import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Redirect, useRouter } from 'expo-router';

import AuthBrandBadge from '@/components/auth/AuthBrandBadge';
import AuthHeroLayout from '@/components/auth/AuthHeroLayout';
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
  setStoredUserSession,
  type StoredUserSession,
} from '@/services/user-session';
import { useAuthBootstrap } from '@/context/auth-bootstrap';

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
  const { status, targetHref } = useAuthBootstrap();

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
  }, [t]);

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

  if (status === 'authenticated' && targetHref) {
    return <Redirect href={targetHref} />;
  }

  const handleLogin = async () => {
    const normalizedEmail = email.replace(/\s+/g, '').toLowerCase();

    if (!normalizedEmail || !password) {
      Alert.alert(t('commonErrorTitle'), t('loginMissingFields'));
      return;
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/login', {
        email: normalizedEmail,
        password,
      });
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
        t('commonErrorTitle'),
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
    <AuthHeroLayout
      isDark={isDark}
      gradientDark={['#08111f', '#12233f', '#24122a']}
      gradientLight={['#f8fbff', '#eef5ff', '#fff8f0']}
      orbs={[
        {
          style: { left: -64, top: 64, width: 192, height: 192 },
          darkColor: '#ff7a451f',
          lightColor: '#ff7a4526',
        },
        {
          style: { right: -32, top: 144, width: 224, height: 224 },
          darkColor: '#4c669f26',
          lightColor: '#4c669f20',
        },
        {
          style: { left: 32, bottom: 96, width: 128, height: 128 },
          darkColor: '#2ecc7122',
          lightColor: '#2ecc7118',
        },
      ]}
    >
            <View className="pt-6">
              <AuthBrandBadge isDark={isDark} />

              <Text
                className={`mt-6 text-[40px] font-black leading-[44px] ${
                  isDark ? 'text-white' : 'text-slate-950'
                }`}
              >
                {t('loginHeroTitle')}
              </Text>

              <Text
                className={`mt-4 max-w-[92%] text-base leading-7 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
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
                  : 'border-slate-200 bg-white/95'
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
              />

              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                activeOpacity={0.9}
                className={`mt-1 h-14 self-stretch overflow-hidden rounded-[28px] ${
                  loading ? 'opacity-70' : ''
                }`}
              >
                <LinearGradient
                  colors={['#4c669f', '#ff7a45']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
                <View className="h-full w-full items-center justify-center rounded-[28px] px-6">
                  {loading ? (
                    <ActivityIndicator color="#ffffff" />
                  ) : (
                    <Text className="text-base font-semibold text-white">
                      {t('loginSubmit')}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            </View>

            <View className="mt-8 flex-row items-center justify-center">
              <Text
                className={`text-sm ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
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
    </AuthHeroLayout>
  );
}
