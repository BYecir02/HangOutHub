import React, { useCallback, useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import PersonActionButton from '../components/social/PersonActionButton';
import PersonRow from '../components/social/PersonRow';
import SocialCountChip from '../components/social/SocialCountChip';
import SocialEmptyState from '../components/social/SocialEmptyState';
import FilterChipsBar, { type FilterChipOption } from '@/shared/ui/FilterChipsBar';
import ScreenHeader from '@/shared/ui/ScreenHeader';
import ScreenState from '@/shared/ui/ScreenState';
import { useI18n } from '@/shared/hooks/use-i18n';
import { clearAuthState, getApiErrorMessage, isUnauthorizedError } from '@/services/api';
import {
  getFriendshipOverview,
  removeFriendship,
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

type ConnectionsView = 'connections' | 'outgoing';

export default function ConnectionsScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [friendships, setFriendships] =
    useState<FriendshipOverview>(EMPTY_FRIENDSHIPS);
  const [activeView, setActiveView] = useState<ConnectionsView>('connections');

  const handleInvalidSession = useCallback(async () => {
    await clearAuthState();
    router.replace('/');
  }, [router]);

  const sectionOptions = useMemo<readonly FilterChipOption<ConnectionsView>[]>(
    () => [
      { key: 'connections', label: t('connectionsSectionConnections') },
      { key: 'outgoing', label: t('connectionsSectionOutgoing') },
    ],
    [t],
  );

  const loadConnections = useCallback(async () => {
    setLoading(true);

    try {
      const friendshipsData = await getFriendshipOverview();
      setFriendships(friendshipsData);
      setErrorMessage(null);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await handleInvalidSession();
        return;
      }

      console.error('Erreur chargement connexions:', error);
      setFriendships(EMPTY_FRIENDSHIPS);
      setErrorMessage(getApiErrorMessage(error, t('commonErrorTitle')));
    } finally {
      setLoading(false);
    }
  }, [handleInvalidSession, t]);

  useFocusEffect(
    useCallback(() => {
      void loadConnections();
    }, [loadConnections]),
  );

  const handleRemoveRelation = async (friendshipId: string) => {
    try {
      await removeFriendship(friendshipId);
      await loadConnections();
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await handleInvalidSession();
        return;
      }

      console.error(error);
      Alert.alert(t('commonErrorTitle'), t('searchRelationshipUpdateError'));
    }
  };

  const selectedItems =
    activeView === 'connections'
      ? friendships.connections
      : friendships.outgoingRequests;

  return (
    <View className="flex-1 bg-gray-50 pt-16 dark:bg-black">
      <ScreenHeader
        title={t('connectionsTitle')}
        onBack={() => router.back()}
        containerClassName="px-5 pb-4"
        rightSlot={
          <TouchableOpacity
            onPress={() => router.push('/search')}
            className="h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
          >
            <Ionicons name="search-outline" size={20} color="#4c669f" />
          </TouchableOpacity>
        }
      />

      <ScrollView
        className="flex-1 px-5 pb-10 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-5 flex-row gap-2.5">
          <View className="flex-1">
            <SocialCountChip
              label={t('connectionsCountConnections')}
              value={friendships.counts.connections}
              color="#4c669f"
            />
          </View>
          <View className="flex-1">
            <SocialCountChip
              label={t('connectionsCountSent')}
              value={friendships.counts.outgoingRequests}
              color="#2ecc71"
            />
          </View>
        </View>

        <FilterChipsBar
          options={sectionOptions}
          activeKey={activeView}
          onChange={setActiveView}
          activeColor="#4c669f"
          textSize="sm"
          horizontalPadding={0}
          paddingTop={18}
          paddingBottom={12}
        />

        <View className="pb-2">
          {loading ? (
            <ScreenState mode="loading" containerClassName="px-0 py-4" />
          ) : errorMessage ? (
            <ScreenState
              mode={activeView === 'connections' ? 'error' : 'warning'}
              title={errorMessage}
              actionLabel={t('commonRetry')}
              onAction={() => {
                void loadConnections();
              }}
              containerClassName="px-0 py-0"
            />
          ) : selectedItems.length > 0 ? (
            selectedItems.map((item) => (
              <PersonRow
                key={item.friendshipId}
                user={item.user}
                subtitle={
                  item.user.bio?.trim() ||
                  (activeView === 'connections'
                    ? t('connectionsAcceptedSubtitle')
                    : t('connectionsPendingSubtitle'))
                }
                onPress={() =>
                  router.push({
                    pathname: '/user/[id]',
                    params: { id: item.user.id },
                  })
                }
                primaryAction={
                  <PersonActionButton
                    label={
                      activeView === 'connections'
                        ? t('searchActionConnected')
                        : t('searchActionSent')
                    }
                    disabled
                  />
                }
                secondaryAction={
                  <PersonActionButton
                    label={
                      activeView === 'connections'
                        ? t('searchActionRemove')
                        : t('genericCancel')
                    }
                    variant="neutral"
                    onPress={() => handleRemoveRelation(item.friendshipId)}
                  />
                }
              />
            ))
          ) : activeView === 'connections' ? (
            <SocialEmptyState
              icon="people-outline"
              title={t('connectionsEmptyTitle')}
              description={t('connectionsEmptyDescription')}
            />
          ) : (
            <SocialEmptyState
              icon="paper-plane-outline"
              title={t('connectionsOutgoingEmptyTitle')}
              description={t('connectionsOutgoingEmptyDescription')}
            />
          )}
        </View>
      </ScrollView>
    </View>
  );
}
