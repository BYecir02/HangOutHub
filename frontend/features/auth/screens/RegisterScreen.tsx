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

import AuthBrandBadge from '@/features/auth/components/AuthBrandBadge';
import AuthHeroLayout from '@/features/auth/components/AuthHeroLayout';
import AuthTextField from '@/features/auth/components/AuthTextField';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { useI18n } from '@/shared/hooks/use-i18n';
import api, { getApiErrorMessage } from '@/services/api';

const ACCENT_COLOR = '#ff4757';

export default function RegisterScreen() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useI18n();

  // Tout le monde s'inscrit en compte "fetard" (USER). Le passage en pro
  // (etablissement / promoteur) se fait ensuite via l'ecran "Activer espace pro".
  const handleRegister = async () => {
    if (!username || !email || !password || !phoneNumber) {
      Alert.alert(t('commonErrorTitle'), t('registerCredentialsRequired'));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t('commonErrorTitle'), t('registerPasswordTooShort'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/register', {
        username,
        email,
        phoneNumber,
        password,
      });
      router.replace({ pathname: '/verify-email', params: { email } });
    } catch (error: unknown) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('registerApiErrorFallback')),
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
      <View className="flex-row items-center pt-2">
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
        <View className="ml-3">
          <AuthBrandBadge isDark={isDark} />
        </View>
      </View>

      <View className="pt-6">
        <Text
          className={`mt-6 text-[38px] font-black leading-[42px] ${
            isDark ? 'text-white' : 'text-slate-950'
          }`}
        >
          {t('registerStepSetupBasics')}
        </Text>
        <Text
          className={`mt-4 max-w-[92%] text-base leading-7 ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}
        >
          {t('registerStepDescriptionBasicsFirst')}
        </Text>
      </View>

      <View
        className={`mt-8 rounded-[36px] border p-6 ${
          isDark ? 'border-white/10 bg-[#07101dcc]' : 'border-slate-200 bg-white/95'
        }`}
      >
        <AuthTextField
          label={t('registerUsernameLabel')}
          isDark={isDark}
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder={t('registerUsernamePlaceholder')}
        />
        <AuthTextField
          label={t('registerEmailLabel')}
          isDark={isDark}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={t('registerEmailPlaceholder')}
        />
        <AuthTextField
          label={t('registerPhoneLabel')}
          isDark={isDark}
          value={phoneNumber}
          onChangeText={setPhoneNumber}
          keyboardType="phone-pad"
          placeholder={t('registerPhonePlaceholder')}
        />
        <AuthTextField
          label={t('registerPasswordLabel')}
          isDark={isDark}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder={t('registerPasswordPlaceholder')}
        />

        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          activeOpacity={0.9}
          className={`mt-4 h-14 self-stretch overflow-hidden rounded-[28px] ${
            loading ? 'opacity-70' : ''
          }`}
        >
          <LinearGradient
            colors={[ACCENT_COLOR, '#4c669f']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFillObject}
          />
          <View className="h-full w-full items-center justify-center rounded-[28px] px-6">
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text className="text-base font-semibold text-white">
                {t('registerCtaCreateAccount')}
              </Text>
            )}
          </View>
        </TouchableOpacity>
      </View>

      <View className="mt-8 flex-row items-center justify-center">
        <Text className={`text-sm ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {t('registerExistingAccount')}
        </Text>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text className="ml-2 text-sm font-semibold text-[#4c669f]">
            {t('registerBackToLogin')}
          </Text>
        </TouchableOpacity>
      </View>
    </AuthHeroLayout>
  );
}
