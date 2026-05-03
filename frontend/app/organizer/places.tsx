import React, { useMemo } from 'react';
import { Image, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import ScreenHeader from '@/shared/ui/ScreenHeader';
import ScreenState from '@/shared/ui/ScreenState';
import { useI18n } from '@/shared/hooks/use-i18n';
import { useOrganizerGuard } from '@/features/organizer/hooks/useOrganizerGuard';
import { useUserProfile } from '@/features/user/hooks/useUserProfile';
import { getImageUrl } from '@/services/api';
import { canAccessOrganizerCapability, normalizeTeamWorkspaceRole } from '@/services/organizer/organizer-access';

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

export default function OrganizerPlacesScreen() {
  const router = useRouter();
  const { t } = useI18n();
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
    requiredCapability: 'places',
  });

  const canCreatePlace = user?.role === 'PLACE_OWNER' || user?.role === 'ADMIN';
  const createPlacePath =
    user?.role === 'PLACE_OWNER' && !user?.hasPlace
      ? '/organizer/place-onboarding'
      : '/organizer/create-place';

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

  return (
    <ScrollView
      className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 88 }}
    >
      <ScreenHeader
        title={t('organizerPlacesTitle')}
        subtitle={t('organizerPlacesSubtitle')}
        label={t('organizerPlacesLabel')}
        rightSlot={
          canCreatePlace ? (
            <TouchableOpacity
              onPress={() => router.push(createPlacePath)}
              className="rounded-full border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900"
            >
              <Text className="text-sm font-semibold text-[#2ecc71]">
                {t('organizerPlacesCreate')}
              </Text>
            </TouchableOpacity>
          ) : null
        }
      />

      {places.length === 0 ? (
        <ScreenState
          mode="empty"
          title={t('organizerPlacesEmptyTitle')}
          description={t('organizerPlacesEmptyDescription')}
          actionLabel={
            canCreatePlace ? t('organizerPlacesCreate') : undefined
          }
          onAction={
            canCreatePlace
              ? () => router.push(createPlacePath)
              : undefined
          }
          containerClassName="px-0 pb-0 pt-5"
        />
      ) : (
        <View className="mt-5">
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
                    <View className="mt-2 self-start rounded-full bg-[#4c669f]/12 px-3 py-1">
                      <Text className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#4c669f]">
                        {sourceLabel}
                      </Text>
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </ScrollView>
  );
}
