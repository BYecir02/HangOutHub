import React, { useMemo, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';

import AuthHeroLayout from '@/components/auth/AuthHeroLayout';
import AuthTextField from '@/components/auth/AuthTextField';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import api, { getApiErrorMessage } from '@/services/api';

export default function ResetPasswordConfirmScreen() {
  const params = useLocalSearchParams<{ email?: string; code?: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useI18n();

  const initialEmail =
    typeof params.email === 'string' ? params.email : '';
  const code = typeof params.code === 'string' ? params.code : '';
  const [email] = useState(initialEmail);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const isCtaDisabled = loading || !email || !password || !confirmPassword;
  const ctaLabel = useMemo(
    () => (loading ? '' : t('resetPasswordCta')),
    [loading, t],
  );

  const handleReset = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert(t('commonErrorTitle'), t('resetPasswordConfirmMissingFields'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('commonErrorTitle'), t('resetPasswordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/password-reset/confirm', {
        email,
        code,
        password,
      });

      Alert.alert(
        t('resetPasswordSuccessTitle'),
        t('resetPasswordSuccessMessage'),
        [{ text: t('resetPasswordBackToLogin'), onPress: () => router.replace('/') }],
      );
    } catch (error: unknown) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('resetPasswordErrorFallback')),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthHeroLayout
      isDark={isDark}
      gradientDark={['#08111f', '#151f36', '#20111f']}
      gradientLight={['#f8fbff', '#edf4ff', '#fff8f0']}
      orbs={[
        {
          style: { left: -40, top: 96, width: 192, height: 192 },
          darkColor: '#4c669f24',
          lightColor: '#4c669f20',
        },
        {
          style: { right: -56, bottom: 96, width: 224, height: 224 },
          darkColor: '#ff47571c',
          lightColor: '#ff47571a',
        },
        {
          style: { right: 48, top: 112, width: 96, height: 96 },
          darkColor: '#2ecc7124',
          lightColor: '#2ecc7118',
        },
      ]}
    >
      <View className="flex-row items-center justify-between pt-2">
        <TouchableOpacity
          onPress={() => router.replace('/reset-password')}
          className={`h-12 w-12 items-center justify-center rounded-2xl border ${
            isDark ? 'border-white/15 bg-white/10' : 'border-slate-200 bg-white/95'
          }`}
        >
          <Ionicons
            name="arrow-back"
            size={22}
            color={isDark ? '#ffffff' : '#0f172a'}
          />
        </TouchableOpacity>
        <View />
      </View>

      <View className="pt-6">
        <Text
          className={`mt-6 text-[34px] font-black leading-[40px] ${
            isDark ? 'text-white' : 'text-slate-950'
          }`}
        >
          {t('resetPasswordTitle')}
        </Text>
        <Text
          className={`mt-4 max-w-[92%] text-base leading-7 ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}
        >
          {t('resetPasswordSubtitleConfirm')}
        </Text>
      </View>

      <View
        className={`mt-8 rounded-[36px] border p-6 ${
          isDark ? 'border-white/10 bg-[#07101dcc]' : 'border-slate-200 bg-white/95'
        }`}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <Text className={`text-xs font-semibold uppercase tracking-[0.24em] ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            {t('resetPasswordCodeVerified')}
          </Text>
          <TouchableOpacity onPress={() => router.replace('/reset-password')}>
            <Text className="text-sm font-semibold text-[#4c669f]">
              {t('resetPasswordChangeCode')}
            </Text>
          </TouchableOpacity>
        </View>

        <AuthTextField
          label={t('resetPasswordEmailLabel')}
          isDark={isDark}
          value={email}
          editable={false}
          selectTextOnFocus={false}
          placeholder={t('resetPasswordEmailPlaceholder')}
        />

        <AuthTextField
          label={t('resetPasswordPasswordLabel')}
          isDark={isDark}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={t('resetPasswordPasswordPlaceholder')}
        />
        <AuthTextField
          label={t('resetPasswordConfirmLabel')}
          isDark={isDark}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          placeholder={t('resetPasswordConfirmPlaceholder')}
        />

        <TouchableOpacity
          onPress={handleReset}
          disabled={isCtaDisabled}
          activeOpacity={0.9}
          className={`mt-4 h-14 self-stretch overflow-hidden rounded-[28px] ${
            isCtaDisabled ? 'opacity-70' : ''
          }`}
        >
          <LinearGradient
            colors={isCtaDisabled ? ['#94a3b8', '#64748b'] : ['#4c669f', '#4c669f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View className="h-full w-full items-center justify-center rounded-[28px] px-6">
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">
                {ctaLabel}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </AuthHeroLayout>
  );
}
