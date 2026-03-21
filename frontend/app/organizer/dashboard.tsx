import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import OrganizerExitPanelButton from '@/components/organizer/OrganizerExitPanelButton';
import { useI18n } from '@/hooks/use-i18n';
import { useOrganizerGuard } from '@/hooks/useOrganizerGuard';
import { useUserProfile } from '@/hooks/useUserProfile';
import {
  formatOrganizerDateTime,
  getOrganizerStatusTone,
} from '@/services/organizer-ui';

function DashboardCard({
  title,
  value,
  accent,
  hint,
}: {
  title: string;
  value: number | string;
  accent: string;
  hint?: string;
}) {
  return (
    <View className="flex-1 rounded-3xl bg-white p-5 dark:bg-gray-900">
      <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {title}
      </Text>
      <Text className={`mt-3 text-3xl font-bold ${accent}`}>{value}</Text>
      {hint ? (
        <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">{hint}</Text>
      ) : null}
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { t, locale } = useI18n();
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

  const upcomingEvents = organizerEvents.filter((event) => {
    return new Date(event.startTime).getTime() >= Date.now();
  });

  const nextEvent = upcomingEvents
    .slice()
    .sort((a, b) => {
      return new Date(a.startTime).getTime() - new Date(b.startTime).getTime();
    })[0];

  const organizerStatus = user?.OrganizerProfile?.status || 'UNKNOWN';
  const organizerAccountType = user?.OrganizerProfile?.accountType;
  const statusTone = getOrganizerStatusTone(organizerStatus);

  const organizerStatusLabel =
    organizerStatus === 'APPROVED'
      ? t('organizerDashboardStatusApproved')
      : organizerStatus === 'PENDING'
        ? t('organizerDashboardStatusPending')
        : organizerStatus === 'REJECTED'
          ? t('organizerDashboardStatusRejected')
          : organizerStatus === 'SUSPENDED'
            ? t('organizerDashboardStatusSuspended')
            : t('organizerDashboardStatusFallbackUnknown');

  const organizerAccountTypeLabel =
    organizerAccountType === 'PLACE_OWNER'
      ? t('organizerDashboardTypePlaceOwner')
      : organizerAccountType === 'ORGANIZER'
        ? t('organizerDashboardTypeOrganizer')
        : t('organizerDashboardTypeFallbackUnknown');

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
      <View className="mb-3 flex-row justify-end">
        <OrganizerExitPanelButton />
      </View>
      <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {t('organizerDashboardLabel')}
      </Text>
      <Text className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
        {user?.OrganizerProfile?.companyName || t('organizerDashboardOrgFallback')}
      </Text>
      <View
        className={`mt-3 self-start rounded-full px-3 py-1.5 ${statusTone.bg}`}
      >
        <View className="flex-row items-center gap-2">
          <Ionicons name={statusTone.icon} size={14} color={statusTone.iconColor} />
          <Text className={`text-xs font-semibold ${statusTone.text}`}>
            {organizerStatusLabel}
          </Text>
        </View>
      </View>
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

      <View className="mt-6 flex-row gap-4">
        <DashboardCard
          title={t('organizerDashboardKpiPlaces')}
          value={ownedPlaces.length}
          accent="text-[#2ecc71]"
        />
        <DashboardCard
          title={t('organizerDashboardKpiEvents')}
          value={organizerEvents.length}
          accent="text-[#ff4757]"
        />
      </View>

      <View className="mt-4">
        <DashboardCard
          title={t('organizerDashboardKpiUpcoming')}
          value={upcomingEvents.length}
          accent="text-[#4c669f]"
          hint={
            nextEvent
              ? t('organizerDashboardKpiUpcomingHintWithDate', {
                  date: formatOrganizerDateTime(nextEvent.startTime, locale),
                })
              : t('organizerDashboardKpiUpcomingHintEmpty')
          }
        />
      </View>

      <View className="mt-4 rounded-3xl bg-white p-5 dark:bg-gray-900">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {t('organizerDashboardActionCenterTitle')}
        </Text>
        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {t('organizerDashboardActionCenterSubtitle')}
        </Text>

        <View className="mt-4 gap-3">
          <TouchableOpacity
            onPress={() => router.push('/organizer/scanner')}
            className="items-center rounded-2xl bg-[#4c669f] py-3"
          >
            <Text className="font-semibold text-white">
              {t('organizerDashboardActionOpenScanner')}
            </Text>
          </TouchableOpacity>
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push('/organizer/events')}
              className="flex-1 items-center rounded-2xl border border-gray-300 py-3 dark:border-gray-700"
            >
              <Text className="font-semibold text-gray-700 dark:text-gray-200">
                {t('organizerDashboardActionManageEvents')}
              </Text>
            </TouchableOpacity>

            {user.role === 'PLACE_OWNER' ? (
              <TouchableOpacity
                onPress={() => router.push('/organizer/create-place')}
                className="flex-1 items-center rounded-2xl border border-gray-300 py-3 dark:border-gray-700"
              >
                <Text className="font-semibold text-gray-700 dark:text-gray-200">
                  {t('organizerDashboardActionCreatePlace')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      {organizerEvents.length === 0 ? (
        <View className="mt-4 rounded-3xl border border-dashed border-gray-300 bg-white p-5 dark:border-gray-700 dark:bg-gray-900">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            {t('organizerDashboardEmptyEventsTitle')}
          </Text>
          <Text className="mt-2 text-gray-500 dark:text-gray-400">
            {t('organizerDashboardEmptyEventsDescription')}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/event')}
            className="mt-4 items-center rounded-2xl bg-[#ff4757] py-3"
          >
            <Text className="font-semibold text-white">
              {t('organizerDashboardCreateEvent')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {user.role === 'PLACE_OWNER' && ownedPlaces.length === 0 ? (
        <View className="mt-4 rounded-3xl border border-amber-200 bg-amber-50 p-5 dark:border-amber-800/60 dark:bg-amber-900/20">
          <Text className="text-lg font-bold text-amber-800 dark:text-amber-300">
            {t('organizerDashboardEmptyPlacesTitle')}
          </Text>
          <Text className="mt-2 text-amber-700 dark:text-amber-300">
            {t('organizerDashboardEmptyPlacesDescription')}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/organizer/create-place')}
            className="mt-4 items-center rounded-2xl bg-amber-600 py-3"
          >
            <Text className="font-semibold text-white">
              {t('organizerDashboardActionCreatePlace')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <View className="mt-4 rounded-3xl bg-white p-5 pb-24 dark:bg-gray-900">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {t('organizerDashboardProfileState')}
        </Text>
        <Text className="mt-3 text-gray-600 dark:text-gray-300">
          {t('organizerDashboardStatusLabel')}: {organizerStatusLabel}
        </Text>
        <Text className="mt-2 text-gray-600 dark:text-gray-300">
          {t('organizerDashboardTypeLabel')}: {organizerAccountTypeLabel}
        </Text>
        <Text className="mt-2 text-gray-600 dark:text-gray-300">
          {t('organizerDashboardRoleLabel')}: {user.OrganizerProfile?.jobTitle || t('organizerDashboardRoleFallback')}
        </Text>
      </View>
    </ScrollView>
  );
}
