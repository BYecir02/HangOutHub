import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import OrganizerPanelNav from '@/components/organizer/OrganizerPanelNav';
import { useI18n } from '@/hooks/use-i18n';
import { useOrganizerGuard } from '@/hooks/useOrganizerGuard';
import { useUserProfile } from '@/hooks/useUserProfile';

function DashboardCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: number | string;
  accent: string;
}) {
  return (
    <View className="flex-1 rounded-3xl bg-white p-5 dark:bg-gray-900">
      <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {title}
      </Text>
      <Text className={`mt-3 text-3xl font-bold ${accent}`}>{value}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const {
    user,
    organizerEvents,
    ownedPlaces,
    loading,
    error,
    refetch,
  } = useUserProfile();
  const isAllowed = useOrganizerGuard({
    user,
    loading,
    suspend: Boolean(error),
  });

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }

  if (error && !user) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6 dark:bg-black">
        <Text className="text-center text-xl font-bold text-gray-900 dark:text-white">
          {t('organizerDataLoadErrorTitle')}
        </Text>
        <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
          {t('organizerDataLoadErrorMessage')}
        </Text>
        <TouchableOpacity
          onPress={() => void refetch()}
          className="mt-5 rounded-2xl bg-[#4c669f] px-5 py-3"
        >
          <Text className="font-semibold text-white">{t('organizerDataRetry')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!user || !isAllowed) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black">
      <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {t('organizerDashboardLabel')}
      </Text>
      <Text className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
        {user?.OrganizerProfile?.companyName || t('organizerDashboardOrgFallback')}
      </Text>
      <Text className="mt-3 text-base text-gray-500 dark:text-gray-400">
        {t('organizerDashboardSubtitle')}
      </Text>

      {error ? (
        <View className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-800/60 dark:bg-amber-900/20">
          <Text className="text-sm font-semibold text-amber-700 dark:text-amber-300">
            {t('organizerDataLoadErrorMessage')}
          </Text>
          <TouchableOpacity
            onPress={() => void refetch()}
            className="mt-3 self-start rounded-full bg-amber-600 px-4 py-2"
          >
            <Text className="text-xs font-semibold text-white">
              {t('organizerDataRetry')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <OrganizerPanelNav
        current="dashboard"
        showCreatePlace={user.role === 'PLACE_OWNER'}
      />

      <View className="mt-6 flex-row gap-4">
        <DashboardCard
          title={t('profileStatsPlaces')}
          value={ownedPlaces.length}
          accent="text-[#2ecc71]"
        />
        <DashboardCard
          title={t('profileStatsEvents')}
          value={organizerEvents.length}
          accent="text-[#ff4757]"
        />
      </View>

      <View className="mt-4 rounded-3xl bg-white p-5 dark:bg-gray-900">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {t('organizerDashboardProfileState')}
        </Text>
        <Text className="mt-3 text-gray-600 dark:text-gray-300">
          {t('organizerDashboardStatusLabel')}: {user.OrganizerProfile?.status || t('organizerDashboardStatusFallbackUnknown')}
        </Text>
        <Text className="mt-2 text-gray-600 dark:text-gray-300">
          {t('organizerDashboardTypeLabel')}: {user.OrganizerProfile?.accountType || t('organizerDashboardTypeFallbackOrganizer')}
        </Text>
        <Text className="mt-2 text-gray-600 dark:text-gray-300">
          {t('organizerDashboardRoleLabel')}: {user.OrganizerProfile?.jobTitle || t('organizerDashboardRoleFallback')}
        </Text>
      </View>

      <View className="mt-4 flex-row gap-3 pb-24">
        <TouchableOpacity
          onPress={() => router.push('/event')}
          className="flex-1 items-center rounded-2xl bg-[#ff4757] py-4"
        >
          <Text className="font-semibold text-white">{t('organizerDashboardCreateEvent')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/organizer/events')}
          className="flex-1 items-center rounded-2xl bg-gray-900 py-4 dark:bg-gray-700"
        >
          <Text className="font-semibold text-white">{t('organizerDashboardViewEvents')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
