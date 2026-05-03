import React, { useMemo } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import OrganizerClaimHistory from '@/features/organizer/components/OrganizerClaimHistory';
import ScreenHeader from '@/shared/ui/ScreenHeader';
import ScreenState from '@/shared/ui/ScreenState';
import { useI18n } from '@/shared/hooks/use-i18n';
import { useOrganizerGuard } from '@/features/organizer/hooks/useOrganizerGuard';
import { useUserProfile } from '@/features/user/hooks/useUserProfile';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import api, { getImageUrl } from '@/services/api';
import {
  normalizeTeamWorkspaceRole,
} from '@/services/organizer/organizer-access';
import { getOrganizerStatusTone } from '@/services/organizer/organizer-ui';
import { clearStoredUserSession } from '@/services/auth/user-session';
import { clearAuthState } from '@/services/api';

const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';

interface PlaceRowItem {
  id: string;
  name: string;
  city: string | null;
  coverUrl: string | null;
  source: 'owner' | 'team';
  teamRole?: string | null;
}

export default function OrganizerProfileScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const isDark = useColorScheme() === 'dark';
  const {
    user,
    loading,
    error,
    refetch,
    ownedPlaces,
    placeTeamMemberships,
  } = useUserProfile();
  const isAllowed = useOrganizerGuard({
    user,
    loading,
    suspend: Boolean(error),
    requiredCapability: 'profile',
  });

  const places = useMemo(() => {
    const map = new Map<string, PlaceRowItem>();

    for (const place of ownedPlaces) {
      map.set(place.id, {
        id: place.id,
        name: place.name,
        city: place.City?.name || null,
        coverUrl: place.coverUrl || null,
        source: 'owner',
      });
    }

    for (const membership of placeTeamMemberships) {
      if (!map.has(membership.placeId)) {
        map.set(membership.placeId, {
          id: membership.placeId,
          name: membership.Place.name,
          city: membership.Place.City?.name || null,
          coverUrl: null,
          source: 'team',
          teamRole: membership.role,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [ownedPlaces, placeTeamMemberships]);

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

  const canCreatePlace = user.role === 'PLACE_OWNER' || user.role === 'ADMIN';

  const organizerStatus = user?.OrganizerProfile?.status || 'UNKNOWN';
  const workspaceTeamRole = normalizeTeamWorkspaceRole(user?.teamRole);
  const workspaceTeamRoleLabel =
    workspaceTeamRole === 'MANAGER'
      ? t('organizerPlacesBadgeManager')
      : workspaceTeamRole === 'STAFF'
        ? t('organizerPlacesBadgeStaff')
        : workspaceTeamRole === 'SCANNER'
          ? t('organizerPlacesBadgeScanner')
          : null;
  const statusTone = getOrganizerStatusTone(organizerStatus);
  const organizerStatusLabel =
    workspaceTeamRoleLabel ||
    (organizerStatus === 'APPROVED'
      ? t('organizerDashboardStatusApproved')
      : organizerStatus === 'PENDING'
        ? t('organizerDashboardStatusPending')
        : organizerStatus === 'REJECTED'
          ? t('organizerDashboardStatusRejected')
          : organizerStatus === 'SUSPENDED'
            ? t('organizerDashboardStatusSuspended')
            : t('organizerDashboardStatusFallbackUnknown'));

  const organizerAccountType = user?.OrganizerProfile?.accountType;
  const organizerAccountTypeLabel =
    workspaceTeamRoleLabel ||
    (organizerAccountType === 'PLACE_OWNER'
      ? t('organizerDashboardTypePlaceOwner')
      : organizerAccountType === 'ORGANIZER'
        ? t('organizerDashboardTypeOrganizer')
        : t('organizerDashboardTypeFallbackOrganizer'));

  const workspaceName =
    user?.OrganizerProfile?.companyName ||
    places[0]?.name ||
    t('organizerDashboardOrgFallback');

  const handleLogout = () => {
    Alert.alert(t('settingsLogoutTitle'), t('settingsLogoutMessage'), [
      { text: t('genericCancel'), style: 'cancel' },
      {
        text: t('settingsLogoutConfirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api.post('/auth/logout').catch(() => {});
            await clearAuthState();
            await clearStoredUserSession();
            router.replace('/');
          } catch {
            Alert.alert(t('commonErrorTitle'), t('settingsLogoutFailed'));
          }
        },
      },
    ]);
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 88 }}
    >
      <ScreenHeader
        title={t('organizerProfileTitle')}
        subtitle={t('organizerProfileSubtitle')}
        label={t('organizerProfileLabel')}
      />

      <View className="mt-5 rounded-3xl bg-white p-5 dark:bg-gray-900">
        <Text className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
          {t('organizerProfileCompanyLabel')}
        </Text>
        <Text className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
          {workspaceName}
        </Text>
        <View className={`mt-3 self-start rounded-full px-3 py-1.5 ${statusTone.bg}`}>
          <View className="flex-row items-center gap-2">
            <Ionicons name={statusTone.icon} size={14} color={statusTone.iconColor} />
            <Text className={`text-xs font-semibold ${statusTone.text}`}>
              {organizerStatusLabel}
            </Text>
          </View>
        </View>
        <Text className="mt-3 text-sm text-gray-600 dark:text-gray-300">
          {t('organizerProfileAccountTypeLabel')}: {organizerAccountTypeLabel}
        </Text>
      </View>

      <OrganizerClaimHistory />

      <View className="mt-6">
        <Text className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
          {t('organizerProfilePlacesTitle')}
        </Text>
        <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {t('organizerProfilePlacesSubtitle')}
        </Text>
      </View>

      {places.length === 0 ? (
        <ScreenState
          mode="empty"
          title={t('organizerProfileEmptyPlacesTitle')}
          description={t('organizerProfileEmptyPlacesDescription')}
          actionLabel={canCreatePlace ? t('organizerPlacesCreate') : undefined}
          onAction={
            canCreatePlace
              ? () => {
                  router.push(
                    user.role === 'PLACE_OWNER' && !user.hasPlace
                      ? '/organizer/place-onboarding'
                      : '/organizer/create-place',
                  );
                }
              : undefined
          }
          containerClassName="px-0 pb-0 pt-5"
        />
      ) : (
        <View className="mt-4">
          {places.map((place) => {
            const teamRole = normalizeTeamWorkspaceRole(place.teamRole);
            const sourceLabel =
              place.source === 'owner'
                ? t('organizerPlacesBadgeOwner')
                : teamRole === 'MANAGER'
                  ? t('organizerPlacesBadgeManager')
                  : teamRole === 'STAFF'
                    ? t('organizerPlacesBadgeStaff')
                    : t('organizerPlacesBadgeScanner');

            return (
              <TouchableOpacity
                key={place.id}
                onPress={() =>
                  router.push({
                    pathname: '/organizer/place-profile/[id]',
                    params: { id: place.id },
                  })
                }
                className="mb-3 rounded-[24px] bg-white p-3 dark:bg-gray-900"
              >
                <View className="flex-row">
                  <Image
                    source={{
                      uri: getImageUrl(place.coverUrl) || PLACE_PLACEHOLDER,
                    }}
                    className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-gray-800"
                  />
                  <View className="ml-4 flex-1 justify-center">
                    <Text className="text-base font-semibold text-gray-900 dark:text-white">
                      {place.name}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {place.city || t('homeAddressToConfirm')}
                    </Text>
                    <View className="mt-2 flex-row items-center justify-between">
                      <View className="self-start rounded-full bg-[#4c669f]/12 px-3 py-1">
                        <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4c669f]">
                          {sourceLabel}
                        </Text>
                      </View>
                      <Text className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        {t('organizerProfileOpenPlace')}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      <View className="mt-6 rounded-3xl bg-white dark:bg-gray-900">
        <TouchableOpacity
          onPress={() => router.push('/organizer/settings')}
          className="flex-row items-center justify-between border-b border-gray-100 px-4 py-4 dark:border-gray-800"
        >
          <View className="flex-row items-center">
            <View className="mr-3 rounded-full bg-gray-100 p-2 dark:bg-gray-800">
              <Ionicons name="settings-outline" size={16} color="#4c669f" />
            </View>
            <Text className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {t('organizerNavSettings')}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isDark ? '#9ca3af' : '#6b7280'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.replace('/(tabs)/home')}
          className="flex-row items-center justify-between border-b border-gray-100 px-4 py-4 dark:border-gray-800"
        >
          <View className="flex-row items-center">
            <View className="mr-3 rounded-full bg-gray-100 p-2 dark:bg-gray-800">
              <Ionicons name="swap-horizontal-outline" size={16} color="#4c669f" />
            </View>
            <Text className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {t('organizerExitPanel')}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isDark ? '#9ca3af' : '#6b7280'}
          />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleLogout}
          className="flex-row items-center justify-between px-4 py-4"
        >
          <View className="flex-row items-center">
            <View className="mr-3 rounded-full bg-gray-100 p-2 dark:bg-gray-800">
              <Ionicons name="log-out-outline" size={16} color="#ff4757" />
            </View>
            <Text className="text-sm font-medium text-gray-800 dark:text-gray-100">
              {t('settingsLogout')}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={18}
            color={isDark ? '#9ca3af' : '#6b7280'}
          />
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
