import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import PersonActionButton from '../components/social/PersonActionButton';
import PersonRow from '../components/social/PersonRow';
import SocialCountChip from '../components/social/SocialCountChip';
import SocialEmptyState from '../components/social/SocialEmptyState';
import {
  acceptFriendRequest,
  getFriendshipOverview,
  rejectFriendRequest,
} from '../services/friendships';
import { FriendshipOverview } from '../types/social';

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

export default function FriendRequestsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [friendships, setFriendships] =
    useState<FriendshipOverview>(EMPTY_FRIENDSHIPS);

  const loadRequests = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getFriendshipOverview();
      setFriendships(data);
    } catch (error) {
      console.error('Erreur chargement demandes:', error);
      setFriendships(EMPTY_FRIENDSHIPS);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadRequests();
    }, [loadRequests]),
  );

  const handleAcceptRequest = async (friendshipId: string) => {
    try {
      await acceptFriendRequest(friendshipId);
      await loadRequests();
    } catch (error) {
      console.error(error);
      Alert.alert(t('commonErrorTitle'), t('searchRequestAcceptError'));
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      await rejectFriendRequest(friendshipId);
      await loadRequests();
    } catch (error) {
      console.error(error);
      Alert.alert(t('commonErrorTitle'), t('searchRequestRejectError'));
    }
  };

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
          {t('friendRequestsTitle')}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 pb-10 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-[28px] bg-[#f39c12]/10 p-5">
          <Text className="text-xs font-semibold uppercase tracking-[0.22em] text-[#f39c12]">
            {t('friendRequestsLabel')}
          </Text>
          <Text className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
            {t('friendRequestsSubtitle')}
          </Text>
        </View>

        <View className="mt-5">
          <SocialCountChip
            label={t('friendRequestsCountLabel')}
            value={friendships.counts.incomingRequests}
            color="#f39c12"
          />
        </View>

        <View className="mt-6">
          {loading ? (
            <View className="py-8">
              <ActivityIndicator color="#f39c12" />
            </View>
          ) : friendships.incomingRequests.length > 0 ? (
            friendships.incomingRequests.map((item) => (
              <PersonRow
                key={item.friendshipId}
                user={item.user}
                subtitle={item.user.bio?.trim() || t('friendRequestsPendingSubtitle')}
                onPress={() =>
                  router.push({
                    pathname: '/user/[id]',
                    params: { id: item.user.id },
                  })
                }
                primaryAction={
                  <PersonActionButton
                    label={t('searchActionAccept')}
                    onPress={() => handleAcceptRequest(item.friendshipId)}
                  />
                }
                secondaryAction={
                  <PersonActionButton
                    label={t('searchActionReject')}
                    variant="neutral"
                    onPress={() => handleRejectRequest(item.friendshipId)}
                  />
                }
              />
            ))
          ) : (
            <SocialEmptyState
              icon="mail-open-outline"
              title={t('friendRequestsEmptyTitle')}
              description={t('friendRequestsEmptyDescription')}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
