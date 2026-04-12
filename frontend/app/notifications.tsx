import React, { useCallback, useMemo, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { EntityRowCard } from '@/components/ui/EntityCard';
import FilterChipsBar, { type FilterChipOption } from '@/components/ui/FilterChipsBar';
import ScreenHeader from '@/components/ui/ScreenHeader';
import ScreenState from '@/components/ui/ScreenState';
import { useI18n } from '@/hooks/use-i18n';
import { useScreenAsync } from '@/hooks/useScreenAsync';
import { formatEventDate } from '@/services/formatters';
import SocialEmptyState from '../components/social/SocialEmptyState';
import api, { clearAuthState, getApiErrorMessage } from '../services/api';
import { getFriendshipOverview } from '../services/friendships';
import {
  FriendshipOverview,
  NotificationActivityItem,
  OutingInvitation,
} from '../types/social';

const EMPTY_FRIENDSHIPS: FriendshipOverview = {
  counts: {
    connections: 0,
    incomingRequests: 0,
    outgoingRequests: 0,
  },
  connections: [],
  incomingRequests: [],
  outgoingRequests: [],
};

const ACTIVITY_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';

type NotificationsView = 'all' | 'requests' | 'invites' | 'activity';

function getActivityTitle(
  item: NotificationActivityItem,
  t: ReturnType<typeof useI18n>['t'],
) {
  if (item.type === 'PLACE_CLAIM_REVIEWED') {
    if (item.claimDecision === 'APPROVED') {
      return t('notificationsPlaceClaimApprovedTitle');
    }

    if (item.claimDecision === 'REJECTED') {
      return t('notificationsPlaceClaimRejectedTitle');
    }

    return t('notificationsPlaceClaimTitle');
  }

  return item.title || t('notificationsPlaceUpdateGeneric');
}

function getActivitySubtitle(
  item: NotificationActivityItem,
  t: ReturnType<typeof useI18n>['t'],
) {
  if (item.type === 'PLACE_CLAIM_REVIEWED') {
    const placeName = item.place?.name || t('notificationsPlaceFallback');

    if (item.claimDecision === 'APPROVED') {
      return t('notificationsPlaceClaimApprovedDescription', {
        place: placeName,
      });
    }

    if (item.claimDecision === 'REJECTED') {
      return t('notificationsPlaceClaimRejectedDescription', {
        place: placeName,
      });
    }

    return t('notificationsPlaceClaimDescription', {
      place: placeName,
    });
  }

  if (item.place?.name) {
    return t('notificationsPlaceUpdateWithName', { place: item.place.name });
  }

  return t('notificationsPlaceUpdateGeneric');
}

export default function NotificationsScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [friendships, setFriendships] =
    useState<FriendshipOverview>(EMPTY_FRIENDSHIPS);
  const [invitations, setInvitations] = useState<OutingInvitation[]>([]);
  const [activityItems, setActivityItems] = useState<
    NotificationActivityItem[]
  >([]);
  const [activeView, setActiveView] = useState<NotificationsView>('all');
  const {
    loading,
    refreshing,
    error: errorMessage,
    runInitial,
    runRefresh,
  } = useScreenAsync({
    initialLoading: true,
  });

  const viewOptions = useMemo<readonly FilterChipOption<NotificationsView>[]>(
    () => [
      { key: 'all', label: t('notificationsTitle') },
      { key: 'requests', label: t('notificationsIncomingRequests') },
      { key: 'invites', label: t('notificationsOutingInvites') },
      { key: 'activity', label: t('notificationsRecentActivity') },
    ],
    [t],
  );

  const showRequestsCard = activeView === 'all' || activeView === 'requests';
  const showInvitesCard = activeView === 'all' || activeView === 'invites';
  const showActivity = activeView === 'all' || activeView === 'activity';

  const isUnauthorized = (error: unknown) =>
    (error as { response?: { status?: number } }).response?.status === 401;

  const handleInvalidSession = useCallback(async () => {
    await clearAuthState();
    router.replace('/');
  }, [router]);

  const fetchNotificationsPayload = useCallback(async () => {
    try {
      const [friendshipsData, invitationsResponse, activityResponse] =
        await Promise.all([
          getFriendshipOverview(),
          api.get<OutingInvitation[]>('/outings/invitations'),
          api.get<NotificationActivityItem[]>('/notifications/activity'),
        ]);

      await api.post('/notifications/mark-read');

      return {
        friendships: friendshipsData,
        invitations: invitationsResponse.data,
        activityItems: activityResponse.data || [],
      };
    } catch (error) {
      if (isUnauthorized(error)) {
        await handleInvalidSession();
        return null;
      }

      throw error;
    }
  }, [handleInvalidSession]);

  const applyNotificationsPayload = useCallback(
    (payload: {
      friendships: FriendshipOverview;
      invitations: OutingInvitation[];
      activityItems: NotificationActivityItem[];
    } | null) => {
      if (!payload) {
        setFriendships(EMPTY_FRIENDSHIPS);
        setInvitations([]);
        setActivityItems([]);
        return;
      }

      setFriendships(payload.friendships);
      setInvitations(payload.invitations);
      setActivityItems(payload.activityItems);
    },
    [],
  );

  const loadNotifications = useCallback(async () => {
    const payload = await runInitial(fetchNotificationsPayload, {
      mapError: (error) => getApiErrorMessage(error, t('commonErrorTitle')),
      onError: (error) => {
        console.error('Erreur chargement notifications:', error);
      },
    });

    applyNotificationsPayload(payload);
  }, [applyNotificationsPayload, fetchNotificationsPayload, runInitial, t]);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  const onRefresh = useCallback(async () => {
    const payload = await runRefresh(fetchNotificationsPayload, {
      mapError: (error) => getApiErrorMessage(error, t('commonErrorTitle')),
      onError: (error) => {
        console.error('Erreur refresh notifications:', error);
      },
    });

    applyNotificationsPayload(payload);
  }, [applyNotificationsPayload, fetchNotificationsPayload, runRefresh, t]);

  return (
    <View className="flex-1 bg-gray-50 pt-16 dark:bg-black">
      <View className="px-5 pb-4">
        <ScreenHeader
          title={t('notificationsTitle')}
          onBack={() => router.back()}
        />
      </View>

      <ScrollView
        className="flex-1 px-5 pb-10 pt-2"
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void onRefresh();
            }}
            tintColor="#4c669f"
          />
        }
      >
        {errorMessage ? (
          <ScreenState
            mode="warning"
            title={errorMessage}
            actionLabel={t('commonRetry')}
            onAction={() => {
              void loadNotifications();
            }}
            containerClassName="px-0 pb-0 pt-4"
          />
        ) : null}

        <FilterChipsBar
          options={viewOptions}
          activeKey={activeView}
          onChange={setActiveView}
          activeColor="#4c669f"
          horizontalPadding={0}
          paddingTop={18}
          paddingBottom={12}
        />

        <View className="gap-4">
          {showRequestsCard ? (
            <View className="rounded-[24px] border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {t('notificationsIncomingRequests')}
                </Text>
                <View className="h-8 min-w-[34px] items-center justify-center rounded-full border border-[#f39c12]/35 bg-[#f39c12] px-2">
                  <Text className="text-sm font-bold text-white">
                    {friendships.counts.incomingRequests}
                  </Text>
                </View>
              </View>
              <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {t('notificationsIncomingRequestsDescription')}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/friend-requests')}
                className="mt-4 self-start rounded-full bg-[#f39c12] px-5 py-2.5"
              >
                <Text className="font-semibold text-white">
                  {t('notificationsIncomingRequestsCta')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {showInvitesCard ? (
            <View className="rounded-[24px] border border-gray-100 bg-white p-5 dark:border-gray-800 dark:bg-gray-900">
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {t('notificationsOutingInvites')}
                </Text>
                <View className="h-8 min-w-[34px] items-center justify-center rounded-full border border-[#4c669f]/40 bg-[#4c669f] px-2">
                  <Text className="text-sm font-bold text-white">
                    {invitations.length}
                  </Text>
                </View>
              </View>
              <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                {t('notificationsOutingInvitesDescription')}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/outing-invitations')}
                className="mt-4 self-start rounded-full bg-[#4c669f] px-5 py-2.5"
              >
                <Text className="font-semibold text-white">
                  {t('notificationsOutingInvitesCta')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {showActivity ? (
          <View className="mt-7">
            <Text className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">
              {t('notificationsRecentActivity')}
            </Text>

            {loading ? (
              <ScreenState mode="loading" containerClassName="px-0 py-4" />
            ) : activityItems.length > 0 ? (
              <View className="gap-4">
                {activityItems.map((item) => (
                  <EntityRowCard
                    key={item.id}
                    imageUrl={item.place?.coverUrl || ACTIVITY_PLACEHOLDER}
                    title={getActivityTitle(item, t)}
                    subtitle={getActivitySubtitle(item, t)}
                    badge={
                      item.place?.city
                        ? {
                            label: item.place.city,
                            color: '#4c669f',
                            backgroundColor: '#4c669f24',
                          }
                        : undefined
                    }
                    meta={formatEventDate(item.date, locale)}
                    onPress={
                      item.targetPath
                        ? () =>
                            router.push(item.targetPath as never)
                        : item.eventId
                        ? () =>
                            router.push({
                              pathname: '/event/[id]',
                              params: { id: item.eventId as string },
                            })
                        : undefined
                    }
                  />
                ))}
              </View>
            ) : (
              <SocialEmptyState
                icon="notifications-outline"
                title={t('notificationsEmptyTitle')}
                description={t('notificationsEmptyDescription')}
              />
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
