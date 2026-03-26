import React, { useMemo, useState } from 'react';
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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import AuthStepIndicator from '@/components/auth/AuthStepIndicator';
import AuthTextField from '@/components/auth/AuthTextField';
import RoleOptionCard from '@/components/auth/RoleOptionCard';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import api from '@/services/api';

type AccountType = 'USER' | 'PLACE' | 'NOMAD';

const ACCOUNT_OPTIONS: Record<
  AccountType,
  {
    titleKey:
      | 'registerRoleUserTitle'
      | 'registerRolePlaceTitle'
      | 'registerRoleNomadTitle';
    descriptionKey:
      | 'registerRoleUserDescription'
      | 'registerRolePlaceDescription'
      | 'registerRoleNomadDescription';
    icon: keyof typeof Ionicons.glyphMap;
    accentColor: string;
    roleLabelKey:
      | 'registerRoleUserLabel'
      | 'registerRolePlaceLabel'
      | 'registerRoleNomadLabel';
  }
> = {
  USER: {
    titleKey: 'registerRoleUserTitle',
    descriptionKey: 'registerRoleUserDescription',
    icon: 'sparkles-outline',
    accentColor: '#f39c12',
    roleLabelKey: 'registerRoleUserLabel',
  },
  PLACE: {
    titleKey: 'registerRolePlaceTitle',
    descriptionKey: 'registerRolePlaceDescription',
    icon: 'business-outline',
    accentColor: '#2ecc71',
    roleLabelKey: 'registerRolePlaceLabel',
  },
  NOMAD: {
    titleKey: 'registerRoleNomadTitle',
    descriptionKey: 'registerRoleNomadDescription',
    icon: 'radio-outline',
    accentColor: '#ff4757',
    roleLabelKey: 'registerRoleNomadLabel',
  },
};

function getStepTitleKey(step: number) {
  if (step === 1) {
    return 'registerStepChoosePlace';
  }

  if (step === 2) {
    return 'registerStepSetupBasics';
  }

  return 'registerStepProFrame';
}

function getStepDescriptionKey(step: number, accountType: AccountType) {
  if (step === 1) {
    return 'registerStepDescriptionChoose';
  }

  if (step === 2) {
    return accountType === 'USER'
      ? 'registerStepDescriptionUser'
      : 'registerStepDescriptionPro';
  }

  return 'registerStepDescriptionProDetails';
}

export default function RegisterScreen() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<AccountType>('USER');
  const [companyName, setCompanyName] = useState('');
  const [ifuNumber, setIfuNumber] = useState('');
  const [payoutInfo, setPayoutInfo] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [instagramUrl, setInstagramUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [xUrl, setXUrl] = useState('');
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useI18n();

  const accentColor = ACCOUNT_OPTIONS[accountType].accentColor;
  const totalSteps = accountType === 'USER' ? 2 : 3;

  const ctaLabel = useMemo(() => {
    if (loading) {
      return '';
    }

    if (step === 2 && accountType !== 'USER') {
      return t('registerCtaContinue');
    }

    return accountType === 'USER'
      ? t('registerCtaCreateAccount')
      : t('registerCtaSendRequest');
  }, [accountType, loading, step, t]);

  const submitRegistration = async () => {
    setLoading(true);

    try {
      if (accountType !== 'USER') {
        await api.post('/auth/register/organizer', {
          username,
          email,
          phoneNumber,
          password,
          accountType,
          companyName,
          ifuNumber,
          payoutInfo,
          jobTitle,
          instagramUrl: instagramUrl || undefined,
          tiktokUrl: tiktokUrl || undefined,
          facebookUrl: facebookUrl || undefined,
          xUrl: xUrl || undefined,
          websiteUrl: websiteUrl || undefined,
        });

        Alert.alert(
          t('registerRequestSentTitle'),
          t('registerRequestSentMessage'),
          [{ text: t('registerBackToLogin'), onPress: () => router.replace('/') }],
        );
      } else {
        await api.post('/auth/register', {
          username,
          email,
          phoneNumber,
          password,
        });

        Alert.alert(
          t('registerAccountCreatedTitle'),
          t('registerAccountCreatedMessage'),
          [{ text: t('registerLoginCta'), onPress: () => router.replace('/') }],
        );
      }
    } catch (error: any) {
      const message =
        error.response?.data?.message || t('registerApiErrorFallback');
      Alert.alert('Oups', Array.isArray(message) ? message[0] : message);
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 2) {
      if (!username || !email || !password || !phoneNumber) {
        Alert.alert(t('commonErrorTitle'), t('registerCredentialsRequired'));
        return;
      }

      if (password.length < 6) {
        Alert.alert(t('commonErrorTitle'), t('registerPasswordTooShort'));
        return;
      }

      if (accountType === 'USER') {
        void submitRegistration();
      } else {
        setStep(3);
      }

      return;
    }

    if (step === 3) {
      if (!companyName || !ifuNumber || !payoutInfo || !jobTitle) {
        Alert.alert(t('commonErrorTitle'), t('registerProInfoRequired'));
        return;
      }

      void submitRegistration();
    }
  };

  const selectAccountType = (type: AccountType) => {
    setAccountType(type);
    setStep(2);
  };

  const goBack = () => {
    if (step > 1) {
      setStep((previousStep) => previousStep - 1);
      return;
    }

    router.replace('/');
  };

  return (
    <View className="flex-1 bg-[#08111f]">
      <LinearGradient
        colors={
          isDark
            ? ['#08111f', '#151f36', '#20111f']
            : ['#eef4ff', '#fff3e4', '#ffffff']
        }
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />

      <View className="absolute left-[-40px] top-24 h-48 w-48 rounded-full bg-[#4c669f24]" />
      <View className="absolute bottom-24 right-[-56px] h-56 w-56 rounded-full bg-[#ff47571c]" />
      <View className="absolute right-12 top-28 h-24 w-24 rounded-full bg-[#2ecc7124]" />

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
            <View className="flex-row items-center justify-between pt-2">
              <TouchableOpacity
                onPress={goBack}
                className={`h-12 w-12 items-center justify-center rounded-2xl ${
                  isDark ? 'bg-white/10' : 'bg-white/80'
                }`}
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color={isDark ? '#ffffff' : '#0f172a'}
                />
              </TouchableOpacity>

              {step > 1 ? (
                <View
                  className="rounded-full px-4 py-2"
                  style={{ backgroundColor: `${accentColor}22` }}
                >
                  <Text style={{ color: accentColor }} className="text-xs font-semibold uppercase tracking-[0.22em]">
                    {t(ACCOUNT_OPTIONS[accountType].roleLabelKey)}
                  </Text>
                </View>
              ) : (
                <View />
              )}
            </View>

            <View className="pt-6">
              <Text
                className={`text-[38px] font-black leading-[42px] ${
                  isDark ? 'text-white' : 'text-slate-950'
                }`}
              >
                {t(getStepTitleKey(step))}
              </Text>
              <Text
                className={`mt-4 max-w-[92%] text-base leading-7 ${
                  isDark ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {t(getStepDescriptionKey(step, accountType))}
              </Text>
            </View>

            <View
              className={`mt-8 rounded-[36px] border p-6 ${
                isDark
                  ? 'border-white/10 bg-[#07101dcc]'
                  : 'border-white/90 bg-white'
              }`}
            >
              <AuthStepIndicator
                currentStep={step}
                totalSteps={totalSteps}
                isDark={isDark}
              />

              {step === 1 ? (
                <View>
                  <RoleOptionCard
                    title={t(ACCOUNT_OPTIONS.USER.titleKey)}
                    description={t(ACCOUNT_OPTIONS.USER.descriptionKey)}
                    icon={ACCOUNT_OPTIONS.USER.icon}
                    accentColor={ACCOUNT_OPTIONS.USER.accentColor}
                    isDark={isDark}
                    selected={accountType === 'USER'}
                    onPress={() => selectAccountType('USER')}
                  />
                  <RoleOptionCard
                    title={t(ACCOUNT_OPTIONS.PLACE.titleKey)}
                    description={t(ACCOUNT_OPTIONS.PLACE.descriptionKey)}
                    icon={ACCOUNT_OPTIONS.PLACE.icon}
                    accentColor={ACCOUNT_OPTIONS.PLACE.accentColor}
                    isDark={isDark}
                    selected={accountType === 'PLACE'}
                    onPress={() => selectAccountType('PLACE')}
                  />
                  <RoleOptionCard
                    title={t(ACCOUNT_OPTIONS.NOMAD.titleKey)}
                    description={t(ACCOUNT_OPTIONS.NOMAD.descriptionKey)}
                    icon={ACCOUNT_OPTIONS.NOMAD.icon}
                    accentColor={ACCOUNT_OPTIONS.NOMAD.accentColor}
                    isDark={isDark}
                    selected={accountType === 'NOMAD'}
                    onPress={() => selectAccountType('NOMAD')}
                  />
                </View>
              ) : null}

              {step === 2 ? (
                <View>
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
                </View>
              ) : null}

              {step === 3 ? (
                <View>
                  <AuthTextField
                    label={t('registerCompanyLabel')}
                    isDark={isDark}
                    value={companyName}
                    onChangeText={setCompanyName}
                    placeholder={t('registerCompanyPlaceholder')}
                  />
                  <AuthTextField
                    label={t('registerIfuLabel')}
                    isDark={isDark}
                    value={ifuNumber}
                    onChangeText={setIfuNumber}
                    placeholder={t('registerIfuPlaceholder')}
                  />
                  <AuthTextField
                    label={t('registerJobTitleLabel')}
                    isDark={isDark}
                    value={jobTitle}
                    onChangeText={setJobTitle}
                    placeholder={t('registerJobTitlePlaceholder')}
                  />
                  <AuthTextField
                    label={t('registerPayoutLabel')}
                    isDark={isDark}
                    value={payoutInfo}
                    onChangeText={setPayoutInfo}
                    placeholder={t('registerPayoutPlaceholder')}
                    hint={t('registerPayoutHint')}
                  />
                  <View className="mt-4">
                    <Text
                      className={`text-xs font-semibold uppercase tracking-[0.22em] ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}
                    >
                      {t('registerSocialSectionLabel')}
                    </Text>
                  </View>
                  <AuthTextField
                    label={t('registerInstagramLabel')}
                    isDark={isDark}
                    value={instagramUrl}
                    onChangeText={setInstagramUrl}
                    placeholder={t('registerInstagramPlaceholder')}
                  />
                  <AuthTextField
                    label={t('registerTiktokLabel')}
                    isDark={isDark}
                    value={tiktokUrl}
                    onChangeText={setTiktokUrl}
                    placeholder={t('registerTiktokPlaceholder')}
                  />
                  <AuthTextField
                    label={t('registerFacebookLabel')}
                    isDark={isDark}
                    value={facebookUrl}
                    onChangeText={setFacebookUrl}
                    placeholder={t('registerFacebookPlaceholder')}
                  />
                  <AuthTextField
                    label={t('registerXLabel')}
                    isDark={isDark}
                    value={xUrl}
                    onChangeText={setXUrl}
                    placeholder={t('registerXPlaceholder')}
                  />
                  <AuthTextField
                    label={t('registerWebsiteLabel')}
                    isDark={isDark}
                    value={websiteUrl}
                    onChangeText={setWebsiteUrl}
                    placeholder={t('registerWebsitePlaceholder')}
                  />
                </View>
              ) : null}

              {step > 1 ? (
                <TouchableOpacity
                  onPress={handleNext}
                  disabled={loading}
                  activeOpacity={0.9}
                  className={`mt-4 self-stretch overflow-hidden rounded-[28px] ${
                    loading ? 'opacity-70' : ''
                  }`}
                >
                  <LinearGradient
                    colors={[accentColor, '#4c669f']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    className="w-full items-center rounded-[28px] px-6 py-[18px]"
                  >
                    {loading ? (
                      <ActivityIndicator color="#ffffff" />
                    ) : (
                      <Text className="text-base font-semibold text-white">
                        {ctaLabel}
                      </Text>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ) : null}
            </View>

            {step === 1 ? (
              <View className="mt-8 flex-row items-center justify-center">
                <Text
                  className={`text-sm ${
                    isDark ? 'text-slate-300' : 'text-slate-600'
                  }`}
                >
                  {t('registerExistingAccount')}
                </Text>
                <TouchableOpacity onPress={() => router.replace('/')}>
                  <Text className="ml-2 text-sm font-semibold text-[#4c669f]">
                    {t('registerBackToLogin')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
