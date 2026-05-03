import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import RoleOptionCard from '@/features/auth/components/RoleOptionCard';
import FormTextField from '@/shared/ui/forms/FormTextField';
import ScreenHeader from '@/shared/ui/ScreenHeader';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { useI18n } from '@/shared/hooks/use-i18n';
import api, { getApiErrorMessage } from '@/services/api';
import { setStoredUserSession } from '@/services/auth/user-session';
import { trackUserFlowEvent } from '@/services/shared/user-flow-analytics';

type ProAccountType = 'PLACE' | 'NOMAD';

export default function ActivateProScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const isDark = useColorScheme() === 'dark';
  const [step, setStep] = useState(1);
  const [accountType, setAccountType] = useState<ProAccountType | null>(null);
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

  const totalSteps = 3;
  const canContinue = step !== 1 || Boolean(accountType);
  const ctaLabel = useMemo(() => {
    if (loading) {
      return '';
    }
    return step < totalSteps ? t('registerCtaContinue') : t('registerCtaSendRequest');
  }, [loading, step, t]);

  const submitActivation = async () => {
    if (!accountType) {
      return;
    }

    setLoading(true);
    try {
      void trackUserFlowEvent({
        eventName: 'activate_pro_submit_attempted',
        screenPath: '/activate-pro',
        metadata: {
          accountType,
        },
      });

      const response = await api.post('/users/me/activate-pro', {
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

      await setStoredUserSession(response.data);

      void trackUserFlowEvent({
        eventName: 'activate_pro_submitted',
        screenPath: '/activate-pro',
        metadata: {
          accountType,
        },
      });

      Alert.alert(t('activateProSuccessTitle'), t('activateProSuccessMessage'), [
        {
          text: t('activateProContinue'),
          onPress: () => router.replace('/(tabs)/profile'),
        },
      ]);
    } catch (error: unknown) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('registerApiErrorFallback')),
      );
    } finally {
      setLoading(false);
    }
  };

  const onNext = () => {
    if (step === 1) {
      if (!accountType) {
        Alert.alert(t('commonErrorTitle'), t('registerSelectRoleRequired'));
        return;
      }

      void trackUserFlowEvent({
        eventName: 'activate_pro_account_type_selected',
        screenPath: '/activate-pro',
        metadata: {
          accountType,
        },
      });

      void trackUserFlowEvent({
        eventName: 'activate_pro_step_continue',
        screenPath: '/activate-pro',
        metadata: {
          fromStep: 1,
          toStep: 2,
          accountType,
        },
      });

      setStep(2);
      return;
    }

    if (step === 2) {
      if (!companyName || !ifuNumber || !payoutInfo || !jobTitle) {
        Alert.alert(t('commonErrorTitle'), t('registerProInfoRequired'));
        return;
      }

      void trackUserFlowEvent({
        eventName: 'activate_pro_step_continue',
        screenPath: '/activate-pro',
        metadata: {
          fromStep: 2,
          toStep: 3,
          accountType,
        },
      });

      setStep(3);
      return;
    }

    void submitActivation();
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 88 }}
    >
      <ScreenHeader
        onBack={() => {
          if (step > 1) {
            setStep((current) => current - 1);
            return;
          }
          router.back();
        }}
        label={t('activateProLabel')}
        title={t('activateProTitle')}
        subtitle={t('activateProSubtitle')}
      />

      <View className="mt-6 rounded-3xl bg-white p-5 dark:bg-gray-900">
        <Text className="text-xs uppercase tracking-[0.2em] text-gray-400 dark:text-gray-500">
          {t('authStepCounter', { current: step, total: totalSteps })}
        </Text>

        {step === 1 ? (
          <View className="mt-4">
            <Text className="mb-4 text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
              {t('activateProStepChoose')}
            </Text>
            <Text className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {t('activateProRoleHint')}
            </Text>
            <RoleOptionCard
              title={t('registerRolePlaceTitle')}
              description={t('registerRolePlaceDescription')}
              icon="business-outline"
              accentColor="#2ecc71"
              isDark={isDark}
              selected={accountType === 'PLACE'}
              onPress={() => {
                setAccountType('PLACE');
                void trackUserFlowEvent({
                  eventName: 'activate_pro_account_type_selected',
                  screenPath: '/activate-pro',
                  metadata: {
                    accountType: 'PLACE',
                  },
                });
              }}
            />
            <RoleOptionCard
              title={t('registerRoleNomadTitle')}
              description={t('registerRoleNomadDescription')}
              icon="radio-outline"
              accentColor="#ff4757"
              isDark={isDark}
              selected={accountType === 'NOMAD'}
              onPress={() => {
                setAccountType('NOMAD');
                void trackUserFlowEvent({
                  eventName: 'activate_pro_account_type_selected',
                  screenPath: '/activate-pro',
                  metadata: {
                    accountType: 'NOMAD',
                  },
                });
              }}
            />
          </View>
        ) : null}

        {step === 2 ? (
          <View className="mt-4">
            <Text className="mb-4 text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
              {t('activateProStepBusiness')}
            </Text>
            <FormTextField
              label={t('registerCompanyLabel')}
              required
              value={companyName}
              onChangeText={setCompanyName}
              placeholder={t('registerCompanyPlaceholder')}
              containerClassName="mb-4"
            />
            <FormTextField
              label={t('registerIfuLabel')}
              required
              value={ifuNumber}
              onChangeText={setIfuNumber}
              placeholder={t('registerIfuPlaceholder')}
              containerClassName="mb-4"
            />
            <FormTextField
              label={t('registerJobTitleLabel')}
              required
              value={jobTitle}
              onChangeText={setJobTitle}
              placeholder={t('registerJobTitlePlaceholder')}
              containerClassName="mb-4"
            />
            <FormTextField
              label={t('registerPayoutLabel')}
              required
              value={payoutInfo}
              onChangeText={setPayoutInfo}
              placeholder={t('registerPayoutPlaceholder')}
            />
          </View>
        ) : null}

        {step === 3 ? (
          <View className="mt-4">
            <Text className="mb-4 text-xs uppercase tracking-[0.2em] text-gray-500 dark:text-gray-400">
              {t('activateProStepSocial')}
            </Text>
            <Text className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              {t('activateProSocialHint')}
            </Text>
            <FormTextField
              label={t('registerInstagramLabel')}
              value={instagramUrl}
              onChangeText={setInstagramUrl}
              placeholder={t('registerInstagramPlaceholder')}
              containerClassName="mb-4"
            />
            <FormTextField
              label={t('registerTiktokLabel')}
              value={tiktokUrl}
              onChangeText={setTiktokUrl}
              placeholder={t('registerTiktokPlaceholder')}
              containerClassName="mb-4"
            />
            <FormTextField
              label={t('registerFacebookLabel')}
              value={facebookUrl}
              onChangeText={setFacebookUrl}
              placeholder={t('registerFacebookPlaceholder')}
              containerClassName="mb-4"
            />
            <FormTextField
              label={t('registerXLabel')}
              value={xUrl}
              onChangeText={setXUrl}
              placeholder={t('registerXPlaceholder')}
              containerClassName="mb-4"
            />
            <FormTextField
              label={t('registerWebsiteLabel')}
              value={websiteUrl}
              onChangeText={setWebsiteUrl}
              placeholder={t('registerWebsitePlaceholder')}
            />
          </View>
        ) : null}

        <TouchableOpacity
          onPress={onNext}
          disabled={loading || !canContinue}
          className={`mt-6 h-14 items-center justify-center rounded-2xl ${
            loading || !canContinue
              ? 'bg-gray-400 dark:bg-gray-700'
              : 'bg-[#4c669f]'
          }`}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-base font-semibold text-white">{ctaLabel}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

