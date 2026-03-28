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
import { useRouter } from 'expo-router';

import AuthBrandBadge from '@/components/auth/AuthBrandBadge';
import AuthHeroLayout from '@/components/auth/AuthHeroLayout';
import AuthStepIndicator from '@/components/auth/AuthStepIndicator';
import AuthTextField from '@/components/auth/AuthTextField';
import RoleOptionCard from '@/components/auth/RoleOptionCard';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import api, { getApiErrorMessage } from '@/services/api';

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
    return 'registerStepSetupBasics';
  }

  if (step === 2) {
    return 'registerStepChoosePlace';
  }

  if (step === 3) {
    return 'registerStepProFrame';
  }

  if (step === 4) {
    return 'registerStepSocialFrame';
  }

  return 'registerStepProFrame';
}

function getStepDescriptionKey(step: number) {
  if (step === 1) {
    return 'registerStepDescriptionBasicsFirst';
  }

  if (step === 2) {
    return 'registerStepDescriptionChooseAfterBasics';
  }

  if (step === 3) {
    return 'registerStepDescriptionProCore';
  }

  if (step === 4) {
    return 'registerStepDescriptionSocialOptional';
  }

  return 'registerStepDescriptionProDetails';
}

export default function RegisterScreen() {
  const [step, setStep] = useState(1);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [accountType, setAccountType] = useState<AccountType | null>(null);
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

  const selectedAccountType = accountType || 'USER';
  const accentColor = ACCOUNT_OPTIONS[selectedAccountType].accentColor;
  const totalSteps = accountType === 'PLACE' || accountType === 'NOMAD' ? 4 : 2;
  const isStepTwoAwaitingChoice = step === 2 && !accountType;
  const isCtaDisabled = loading || isStepTwoAwaitingChoice;

  const ctaLabel = useMemo(() => {
    if (loading) {
      return '';
    }

    if (step === 1) {
      return t('registerCtaContinue');
    }

    if (step === 2 && accountType !== 'USER') {
      return t('registerCtaContinue');
    }

    if (step === 3) {
      return t('registerCtaContinue');
    }

    return accountType === 'USER'
      ? t('registerCtaCreateAccount')
      : t('registerCtaSendRequest');
  }, [accountType, loading, step, t]);

  const submitRegistration = async (selectedType: AccountType) => {
    setLoading(true);

    try {
      if (selectedType !== 'USER') {
        await api.post('/auth/register/organizer', {
          username,
          email,
          phoneNumber,
          password,
          accountType: selectedType,
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
    } catch (error: unknown) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('registerApiErrorFallback')),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleNext = () => {
    if (step === 1) {
      if (!username || !email || !password || !phoneNumber) {
        Alert.alert(t('commonErrorTitle'), t('registerCredentialsRequired'));
        return;
      }

      if (password.length < 6) {
        Alert.alert(t('commonErrorTitle'), t('registerPasswordTooShort'));
        return;
      }

      setStep(2);
      return;
    }

    if (step === 2) {
      if (!accountType) {
        Alert.alert(t('commonErrorTitle'), t('registerSelectRoleRequired'));
        return;
      }

      if (accountType === 'USER') {
        void submitRegistration('USER');
      } else {
        setStep(3);
      }

      return;
    }

    if (step === 3 && accountType) {
      if (!companyName || !ifuNumber || !payoutInfo || !jobTitle) {
        Alert.alert(t('commonErrorTitle'), t('registerProInfoRequired'));
        return;
      }

      setStep(4);
      return;
    }

    if (step === 4 && accountType) {
      void submitRegistration(accountType);
    }
  };

  const selectAccountType = (type: AccountType) => {
    setAccountType(type);
    setStep(2);
  };

  const goBack = () => {
    if (step > 1) {
      if (step === 4) {
        setStep(3);
        return;
      }
      if (step === 3) {
        setStep(2);
        return;
      }
      setStep(1);
      return;
    }

    router.replace('/');
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
                onPress={goBack}
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

              {step > 2 && accountType ? (
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
              <AuthBrandBadge isDark={isDark} />
              <Text
                className={`mt-6 text-[38px] font-black leading-[42px] ${
                  isDark ? 'text-white' : 'text-slate-950'
                }`}
              >
                {t(getStepTitleKey(step))}
              </Text>
              <Text
                className={`mt-4 max-w-[92%] text-base leading-7 ${
                  isDark ? 'text-slate-300' : 'text-slate-700'
                }`}
              >
                {t(getStepDescriptionKey(step))}
              </Text>
            </View>

            <View
              className={`mt-8 rounded-[36px] border p-6 ${
                isDark
                  ? 'border-white/10 bg-[#07101dcc]'
                  : 'border-slate-200 bg-white/95'
              }`}
            >
              <AuthStepIndicator
                currentStep={step}
                totalSteps={totalSteps}
                isDark={isDark}
              />

              {step === 1 ? (
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

              {step === 2 ? (
                <View className="mt-1">
                  <Text
                    className={`mb-4 text-[11px] font-semibold uppercase tracking-[0.22em] ${
                      isDark ? 'text-slate-400' : 'text-slate-600'
                    }`}
                  >
                    {t('registerStepChoosePlace')}
                  </Text>
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
                </View>
              ) : null}

              {step === 4 ? (
                <View>
                  <View className="mt-4">
                    <Text
                      className={`text-xs font-semibold uppercase tracking-[0.22em] ${
                        isDark ? 'text-slate-400' : 'text-slate-600'
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

              {step >= 1 ? (
                <TouchableOpacity
                  onPress={handleNext}
                  disabled={isCtaDisabled}
                  activeOpacity={0.9}
                  className={`mt-4 h-14 self-stretch overflow-hidden rounded-[28px] ${
                    isCtaDisabled ? 'opacity-70' : ''
                  }`}
                >
                  <LinearGradient
                    colors={
                      isStepTwoAwaitingChoice
                        ? ['#94a3b8', '#64748b']
                        : [accentColor, '#4c669f']
                    }
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
              ) : null}
            </View>

              {step === 1 ? (
                <View className="mt-8 flex-row items-center justify-center">
                <Text
                  className={`text-sm ${
                    isDark ? 'text-slate-300' : 'text-slate-700'
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
    </AuthHeroLayout>
  );
}
