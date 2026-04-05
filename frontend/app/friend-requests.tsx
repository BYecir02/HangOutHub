import React, { useCallback, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import ScreenHeader from '@/components/ui/ScreenHeader';
import ScreenState from '@/components/ui/ScreenState';
import { useI18n } from '@/hooks/use-i18n';
import PersonActionButton from '../components/social/PersonActionButton';
import PersonRow from '../components/social/PersonRow';
import SocialCountChip from '../components/social/SocialCountChip';
import SocialEmptyState from '../components/social/SocialEmptyState';
import { clearAuthState, getApiErrorMessage } from '@/services/api';
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
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [friendships, setFriendships] =
    useState<FriendshipOverview>(EMPTY_FRIENDSHIPS);

  const isUnauthorized = (error: unknown) =>
    (error as { response?: { status?: number } }).response?.status === 401;

  const handleInvalidSession = useCallback(async () => {
    await clearAuthState();
    router.replace('/');
  }, [router]);

  const loadRequests = useCallback(async () => {
    setLoading(true);

    try {
      const data = await getFriendshipOverview();
      setFriendships(data);
      setErrorMessage(null);
    } catch (error) {
      if (isUnauthorized(error)) {
        await handleInvalidSession();
        return;
      }

      console.error('Erreur chargement demandes:', error);
      setFriendships(EMPTY_FRIENDSHIPS);
      setErrorMessage(getApiErrorMessage(error, t('commonErrorTitle')));
    } finally {
      setLoading(false);
    }
  }, [handleInvalidSession, t]);

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
      if (isUnauthorized(error)) {
        await handleInvalidSession();
        return;
      }

      console.error(error);
      Alert.alert(t('commonErrorTitle'), t('searchRequestAcceptError'));
    }
  };

  const handleRejectRequest = async (friendshipId: string) => {
    try {
      await rejectFriendRequest(friendshipId);
      await loadRequests();
    } catch (error) {
      if (isUnauthorized(error)) {
        await handleInvalidSession();
        return;
      }

      console.error(error);
      Alert.alert(t('commonErrorTitle'), t('searchRequestRejectError'));
    }
  };

  return (
    <View className="flex-1 bg-gray-50 pt-16 dark:bg-black">
      <View className="px-5 pb-4">
        <ScreenHeader title={t('friendRequestsTitle')} onBack={() => router.back()} />
      </View>

      <ScrollView
        className="flex-1 px-5 pb-10 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-5">
          <SocialCountChip
            label={t('friendRequestsCountLabel')}
            value={friendships.counts.incomingRequests}
            color="#f39c12"
          />
        </View>

        <View className="mt-6">
          {loading ? (
            <ScreenState mode="loading" containerClassName="px-0 py-4" />
          ) : errorMessage ? (
            <ScreenState
              mode="error"
              title={errorMessage}
              actionLabel={t('commonRetry')}
              onAction={() => {
                void loadRequests();
              }}
              containerClassName="px-0 py-0"
            />
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
