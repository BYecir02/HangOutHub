import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import SocialEmptyState from '../components/social/SocialEmptyState';
import api from '../services/api';
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

export default function NotificationsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { locale, t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [friendships, setFriendships] =
    useState<FriendshipOverview>(EMPTY_FRIENDSHIPS);
  const [invitations, setInvitations] = useState<OutingInvitation[]>([]);
  const [activityItems, setActivityItems] = useState<
    NotificationActivityItem[]
  >([]);
  const [refreshing, setRefreshing] = useState(false);

  const formatEventDate = (value: string) =>
    new Date(value).toLocaleString(locale, {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });

  const loadNotifications = useCallback(async () => {
    setLoading(true);

    try {
      const [
        friendshipsData,
        invitationsResponse,
        activityResponse,
      ] = await Promise.all([
        getFriendshipOverview(),
        api.get<OutingInvitation[]>('/outings/invitations'),
        api.get<NotificationActivityItem[]>('/notifications/activity'),
      ]);

      setFriendships(friendshipsData);
      setInvitations(invitationsResponse.data);
      setActivityItems(activityResponse.data || []);

      await api.post('/notifications/mark-read');
    } catch (error) {
      console.error('Erreur chargement notifications:', error);
      setFriendships(EMPTY_FRIENDSHIPS);
      setInvitations([]);
      setActivityItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadNotifications();
    }, [loadNotifications]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadNotifications();
    } finally {
      setRefreshing(false);
    }
  }, [loadNotifications]);

  return (
    <View className="flex-1 bg-white pt-16 dark:bg-black">
      <View className="flex-row items-center px-5 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons
            name="arrow-back"
            size={24}
            color={isDark ? 'white' : 'black'}
          />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          {t('notificationsTitle')}
        </Text>
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
        <View className="rounded-[28px] bg-[#4c669f]/10 p-5">
          <Text className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4c669f]">
            {t('notificationsActivityCenterLabel')}
          </Text>
          <Text className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
            {t('notificationsActivityCenterSubtitle')}
          </Text>
        </View>

        <View className="mt-5 gap-4">
          <View className="rounded-[24px] border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {t('notificationsIncomingRequests')}
              </Text>
              <View className="min-w-[28px] items-center justify-center rounded-full bg-[#f39c12] px-2 py-1">
                <Text className="text-xs font-bold text-white">
                  {friendships.counts.incomingRequests}
                </Text>
              </View>
            </View>
            <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {t('notificationsIncomingRequestsDescription')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/friend-requests')}
              className="mt-4 self-start rounded-full bg-[#f39c12] px-4 py-2"
            >
              <Text className="font-semibold text-white">{t('notificationsIncomingRequestsCta')}</Text>
            </TouchableOpacity>
          </View>

          <View className="rounded-[24px] border border-gray-100 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
            <View className="flex-row items-center justify-between">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {t('notificationsOutingInvites')}
              </Text>
              <View className="min-w-[28px] items-center justify-center rounded-full bg-[#4c669f] px-2 py-1">
                <Text className="text-xs font-bold text-white">
                  {invitations.length}
                </Text>
              </View>
            </View>
            <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
              {t('notificationsOutingInvitesDescription')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/outing-invitations')}
              className="mt-4 self-start rounded-full bg-[#4c669f] px-4 py-2"
            >
              <Text className="font-semibold text-white">
                {t('notificationsOutingInvitesCta')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-8">
          <Text className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">
            {t('notificationsRecentActivity')}
          </Text>

          {loading ? (
            <View className="py-8">
              <ActivityIndicator color="#4c669f" />
            </View>
          ) : activityItems.length > 0 ? (
            activityItems.map((item) => (
              <TouchableOpacity
                key={item.id}
                onPress={() =>
                  item.eventId
                    ? router.push({
                        pathname: '/event/[id]',
                        params: { id: item.eventId },
                      })
                    : undefined
                }
                className="mb-3 rounded-[24px] bg-gray-50 p-4 dark:bg-gray-900"
              >
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {item.title}
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {item.place?.name
                    ? t('notificationsPlaceUpdateWithName', { place: item.place.name })
                    : t('notificationsPlaceUpdateGeneric')}
                </Text>
                <Text className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                  {formatEventDate(item.date)}
                </Text>
              </TouchableOpacity>
            ))
          ) : (
            <SocialEmptyState
              icon="notifications-outline"
              title={t('notificationsEmptyTitle')}
              description={t('notificationsEmptyDescription')}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
