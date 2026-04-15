import React, { useState } from 'react';
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
import { useRouter } from 'expo-router';

import AuthHeroLayout from '@/components/auth/AuthHeroLayout';
import AuthTextField from '@/components/auth/AuthTextField';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import api, { getApiErrorMessage } from '@/services/api';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useI18n();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequest = async () => {
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail) {
      Alert.alert(t('commonErrorTitle'), t('forgotPasswordMissingFields'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/password-reset/request', {
        email: normalizedEmail,
      });

      Alert.alert(
        t('forgotPasswordSentTitle'),
        t('forgotPasswordSentMessage'),
      );
      router.replace({
        pathname: '/reset-password',
        params: { email: normalizedEmail },
      });
    } catch (error) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('forgotPasswordErrorFallback')),
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
      ]}
    >
      <View className="flex-row items-center justify-between pt-2">
        <TouchableOpacity
          onPress={() => router.replace('/')}
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
          {t('forgotPasswordTitle')}
        </Text>
        <Text
          className={`mt-4 max-w-[92%] text-base leading-7 ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}
        >
          {t('forgotPasswordSubtitle')}
        </Text>
      </View>

      <View
        className={`mt-8 rounded-[36px] border p-6 ${
          isDark ? 'border-white/10 bg-[#07101dcc]' : 'border-slate-200 bg-white/95'
        }`}
      >
        <AuthTextField
          label={t('forgotPasswordEmailLabel')}
          isDark={isDark}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={t('forgotPasswordEmailPlaceholder')}
        />

        <TouchableOpacity
          onPress={handleRequest}
          disabled={loading}
          activeOpacity={0.9}
          className={`mt-4 h-14 self-stretch overflow-hidden rounded-[28px] ${
            loading ? 'opacity-70' : ''
          }`}
        >
          <LinearGradient
            colors={['#4c669f', '#4c669f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View className="h-full w-full items-center justify-center rounded-[28px] px-6">
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">
                {t('forgotPasswordCta')}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </AuthHeroLayout>
  );
}
