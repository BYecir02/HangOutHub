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

import PersonActionButton from '../components/social/PersonActionButton';
import PersonRow from '../components/social/PersonRow';
import SocialCountChip from '../components/social/SocialCountChip';
import SocialEmptyState from '../components/social/SocialEmptyState';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
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

export default function ConnectionsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(true);
  const [friendships, setFriendships] =
    useState<FriendshipOverview>(EMPTY_FRIENDSHIPS);

  const loadConnections = useCallback(async () => {
    setLoading(true);

    try {
      const friendshipsData = await getFriendshipOverview();
      setFriendships(friendshipsData);
    } catch (error) {
      console.error('Erreur chargement connexions:', error);
      setFriendships(EMPTY_FRIENDSHIPS);
    } finally {
      setLoading(false);
    }
  }, []);

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
      console.error(error);
      Alert.alert(t('commonErrorTitle'), t('searchRelationshipUpdateError'));
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
          {t('connectionsTitle')}
        </Text>
      </View>

      <ScrollView
        className="flex-1 px-5 pb-10 pt-2"
        showsVerticalScrollIndicator={false}
      >
        <View className="rounded-[28px] bg-[#4c669f]/10 p-5">
          <Text className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4c669f]">
            {t('connectionsNetworkLabel')}
          </Text>
          <Text className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
            {t('connectionsHeroSubtitle')}
          </Text>
          <TouchableOpacity
            onPress={() => router.push('/search')}
            className="mt-4 self-start rounded-full bg-[#4c669f] px-4 py-2"
          >
            <Text className="font-semibold text-white">{t('connectionsSearchPeople')}</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-5 flex-row gap-3">
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

        <View className="mt-8">
          <Text className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">
            {t('connectionsSectionConnections')}
          </Text>

          {loading ? (
            <View className="py-8">
              <ActivityIndicator color="#4c669f" />
            </View>
          ) : friendships.connections.length > 0 ? (
            friendships.connections.map((item) => (
              <PersonRow
                key={item.friendshipId}
                user={item.user}
                subtitle={item.user.bio?.trim() || t('connectionsAcceptedSubtitle')}
                onPress={() =>
                  router.push({
                    pathname: '/user/[id]',
                    params: { id: item.user.id },
                  })
                }
                primaryAction={<PersonActionButton label={t('searchActionConnected')} disabled />}
                secondaryAction={
                  <PersonActionButton
                    label={t('searchActionRemove')}
                    variant="neutral"
                    onPress={() => handleRemoveRelation(item.friendshipId)}
                  />
                }
              />
            ))
          ) : (
            <SocialEmptyState
              icon="people-outline"
              title={t('connectionsEmptyTitle')}
              description={t('connectionsEmptyDescription')}
            />
          )}
        </View>

        <View className="mt-8">
          <Text className="mb-4 text-xs font-semibold uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">
            {t('connectionsSectionOutgoing')}
          </Text>

          {loading ? (
            <View className="py-8">
              <ActivityIndicator color="#4c669f" />
            </View>
          ) : friendships.outgoingRequests.length > 0 ? (
            friendships.outgoingRequests.map((item) => (
              <PersonRow
                key={item.friendshipId}
                user={item.user}
                subtitle={item.user.bio?.trim() || t('connectionsPendingSubtitle')}
                onPress={() =>
                  router.push({
                    pathname: '/user/[id]',
                    params: { id: item.user.id },
                  })
                }
                primaryAction={<PersonActionButton label={t('searchActionSent')} disabled />}
                secondaryAction={
                  <PersonActionButton
                    label={t('genericCancel')}
                    variant="neutral"
                    onPress={() => handleRemoveRelation(item.friendshipId)}
                  />
                }
              />
            ))
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
