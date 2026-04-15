import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
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
import { resolveStoredUserSession } from '@/services/user-session';
import {
  canAccessOrganizerPanel,
  getOrganizerEntryPath,
  isOrganizerUser,
} from '@/services/organizer-access';

export default function VerifyEmailScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useI18n();

  const initialEmail =
    typeof params.email === 'string' ? params.email : '';
  const [email, setEmail] = useState(initialEmail);
  const OTP_LENGTH = 6;
  const [otpDigits, setOtpDigits] = useState<string[]>(
    Array.from({ length: OTP_LENGTH }, () => ''),
  );
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const inputRefs = useRef<Array<TextInput | null>>([]);

  const code = otpDigits.join('');
  const isCtaDisabled = loading || !email || code.length !== OTP_LENGTH;
  const ctaLabel = useMemo(
    () => (loading ? '' : t('verifyEmailCta')),
    [loading, t],
  );

  const updateDigit = (index: number, value: string) => {
    setOtpDigits((current) => {
      const next = [...current];
      next[index] = value;
      return next;
    });
  };

  const handleChangeDigit = (index: number, text: string) => {
    const digitsOnly = text.replace(/\D/g, '');

    if (!digitsOnly) {
      updateDigit(index, '');
      return;
    }

    if (digitsOnly.length === 1) {
      updateDigit(index, digitsOnly);
      if (index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
      return;
    }

    const nextDigits = [...otpDigits];
    let cursor = index;
    digitsOnly.split('').forEach((digit) => {
      if (cursor < OTP_LENGTH) {
        nextDigits[cursor] = digit;
        cursor += 1;
      }
    });
    setOtpDigits(nextDigits);
    const nextIndex = Math.min(cursor, OTP_LENGTH - 1);
    inputRefs.current[nextIndex]?.focus();
  };

  const handleKeyPress = (index: number, key: string) => {
    if (key !== 'Backspace') {
      return;
    }

    if (otpDigits[index]) {
      updateDigit(index, '');
      return;
    }

    if (index > 0) {
      updateDigit(index - 1, '');
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    if (!email || !code) {
      Alert.alert(t('commonErrorTitle'), t('verifyEmailMissingFields'));
      return;
    }

    setLoading(true);
    try {
      await api.post('/auth/verify-email/otp', {
        email,
        code,
      });

      const session = await resolveStoredUserSession();

      if (session) {
        if (isOrganizerUser(session) && canAccessOrganizerPanel(session)) {
          router.replace(getOrganizerEntryPath(session) as never);
          return;
        }

        router.replace('/(tabs)/home');
        return;
      }

      Alert.alert(
        t('verifyEmailSuccessTitle'),
        t('verifyEmailSuccessMessage'),
        [{ text: t('verifyEmailBackToLogin'), onPress: () => router.replace('/') }],
      );
    } catch (error: unknown) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('verifyEmailErrorFallback')),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!email) {
      Alert.alert(t('commonErrorTitle'), t('verifyEmailEmailRequired'));
      return;
    }

    setResending(true);
    try {
      await api.post('/auth/verify-email/request', { email });
      Alert.alert(
        t('verifyEmailResendTitle'),
        t('verifyEmailResendMessage'),
      );
    } catch (error: unknown) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('verifyEmailErrorFallback')),
      );
    } finally {
      setResending(false);
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
          {t('verifyEmailTitle')}
        </Text>
        <Text
          className={`mt-4 max-w-[92%] text-base leading-7 ${
            isDark ? 'text-slate-300' : 'text-slate-700'
          }`}
        >
          {t('verifyEmailSubtitle')}
        </Text>
      </View>

      <View
        className={`mt-8 rounded-[36px] border p-6 ${
          isDark ? 'border-white/10 bg-[#07101dcc]' : 'border-slate-200 bg-white/95'
        }`}
      >
        <AuthTextField
          label={t('verifyEmailEmailLabel')}
          isDark={isDark}
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder={t('verifyEmailEmailPlaceholder')}
        />
        <View className="mt-2">
          <Text
            className={`text-xs font-semibold uppercase tracking-[0.22em] ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            {t('verifyEmailCodeLabel')}
          </Text>
          <View className="mt-3 flex-row justify-between">
            {otpDigits.map((digit, index) => (
              <TextInput
                key={`otp-${index}`}
                ref={(ref) => {
                  inputRefs.current[index] = ref;
                }}
                autoFocus={index === 0}
                value={digit}
                onChangeText={(text) => handleChangeDigit(index, text)}
                onKeyPress={({ nativeEvent }) =>
                  handleKeyPress(index, nativeEvent.key)
                }
                keyboardType="number-pad"
                maxLength={OTP_LENGTH}
                className={`h-14 w-12 rounded-2xl border text-center text-lg font-semibold ${
                  isDark
                    ? 'border-white/10 bg-white/10 text-white'
                    : 'border-slate-200 bg-white text-slate-900'
                }`}
                placeholder=""
                placeholderTextColor={isDark ? '#94a3b8' : '#94a3b8'}
                selectionColor={isDark ? '#c7d2fe' : '#4c669f'}
                returnKeyType="done"
              />
            ))}
          </View>
        </View>

        <TouchableOpacity
          onPress={handleVerify}
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

        <TouchableOpacity
          onPress={handleResend}
          disabled={resending}
          className="mt-4 items-center"
        >
          <Text className={`text-sm font-semibold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
            {resending ? t('verifyEmailResendLoading') : t('verifyEmailResendCta')}
          </Text>
        </TouchableOpacity>
      </View>
    </AuthHeroLayout>
  );
}
