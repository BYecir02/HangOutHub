import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ScreenHeader from '@/components/ui/ScreenHeader';
import ScreenState from '@/components/ui/ScreenState';
import { useI18n } from '@/hooks/use-i18n';
import { useOrganizerGuard } from '@/hooks/useOrganizerGuard';
import { useUserProfile } from '@/hooks/useUserProfile';

function OnboardingCard({
  icon,
  accentColor,
  title,
  description,
  actionLabel,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  title: string;
  description: string;
  actionLabel: string;
  onPress: () => void;
}) {
  return (
    <View
      className="rounded-[28px] border bg-white p-5 dark:bg-gray-900"
      style={{
        borderColor: `${accentColor}33`,
      }}
    >
      <View
        className="h-12 w-12 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${accentColor}18` }}
      >
        <Ionicons name={icon} size={24} color={accentColor} />
      </View>

      <Text className="mt-4 text-lg font-bold text-gray-900 dark:text-white">
        {title}
      </Text>
      <Text className="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-300">
        {description}
      </Text>

      <TouchableOpacity
        onPress={onPress}
        className="mt-5 items-center rounded-2xl px-4 py-3"
        style={{ backgroundColor: accentColor }}
      >
        <Text className="text-sm font-semibold text-white">{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function OrganizerPlaceOnboardingScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const {
    user,
    loading,
    error,
    refetch,
    ownedPlaces,
  } = useUserProfile();

  const isAllowed = useOrganizerGuard({
    user,
    loading,
    suspend: Boolean(error),
    requiredCapability: 'places',
  });

  if (loading) {
    return (
      <ScreenState
        mode="loading"
        fullScreen
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  if (error && !user) {
    return (
      <ScreenState
        mode="error"
        fullScreen
        title={t('organizerDataLoadErrorTitle')}
        description={t('organizerDataLoadErrorMessage')}
        actionLabel={t('organizerDataRetry')}
        onAction={() => {
          void refetch();
        }}
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  if (!user || !isAllowed) {
    return (
      <ScreenState
        mode="loading"
        fullScreen
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  if (ownedPlaces.length > 0) {
    return (
      <ScreenState
        mode="empty"
        fullScreen
        title={t('organizerPlaceOnboardingAlreadyOwnedTitle')}
        description={t('organizerPlaceOnboardingAlreadyOwnedDescription')}
        actionLabel={t('organizerPlaceOnboardingDashboardAction')}
        onAction={() => router.replace('/organizer/dashboard')}
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <View className="flex-1 px-5 pt-16">
        <ScreenHeader
          title={t('organizerPlaceOnboardingTitle')}
          subtitle={t('organizerPlaceOnboardingSubtitle')}
          label={t('organizerPlaceOnboardingLabel')}
          onBack={() => router.back()}
        />

        <View className="mt-6 gap-4">
          <OnboardingCard
            icon="location-outline"
            accentColor="#2ecc71"
            title={t('organizerPlaceOnboardingCreateTitle')}
            description={t('organizerPlaceOnboardingCreateDescription')}
            actionLabel={t('organizerPlaceOnboardingCreateAction')}
            onPress={() => router.push('/organizer/create-place')}
          />

          <OnboardingCard
            icon="search-outline"
            accentColor="#4c669f"
            title={t('organizerPlaceOnboardingClaimTitle')}
            description={t('organizerPlaceOnboardingClaimDescription')}
            actionLabel={t('organizerPlaceOnboardingClaimAction')}
            onPress={() => router.push('/organizer/claim-place')}
          />
        </View>
      </View>
    </View>
  );
}
