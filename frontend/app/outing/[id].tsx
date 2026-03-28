import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import {
  formatEventDate,
  formatStatusLabel,
  normalizeStatus,
} from '@/services/formatters';
import api, { getImageUrl } from '../../services/api';
import { FriendshipOverview } from '../../types/social';

interface OutingParticipant {
  userId: string;
  status: string | null;
  isAdmin: boolean | null;
  User: {
    id: string;
    username?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
}

interface OutingDetail {
  id: string;
  title: string;
  scheduledDate: string;
  status?: string | null;
  creatorId: string;
  Place?: {
    id: string;
    name?: string | null;
    address?: string | null;
    coverUrl?: string | null;
    City?: {
      id: number;
      name: string;
    } | null;
  } | null;
  User?: {
    id: string;
    username?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
  OutingParticipant: OutingParticipant[];
}

const OUTING_STATUS_COLORS: Record<string, string> = {
  GOING: '#2ecc71',
  MAYBE: '#f39c12',
  DECLINED: '#ef4444',
  INVITED: '#4c669f',
};

export default function OutingDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { locale, t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [outing, setOuting] = useState<OutingDetail | null>(null);
  const [connections, setConnections] = useState<
    FriendshipOverview['connections']
  >([]);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>(
    [],
  );
  const [inviting, setInviting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const getParticipantStatus = useCallback(
    (status: string | null | undefined) => {
      const normalizedStatus = normalizeStatus(status, 'INVITED');

      return {
        label: formatStatusLabel(
          normalizedStatus,
          {
            GOING: t('outingDetailStatusGoing'),
            MAYBE: t('outingDetailStatusMaybe'),
            DECLINED: t('outingDetailStatusDeclined'),
            INVITED: t('outingDetailStatusInvited'),
          },
          t('outingDetailStatusInvited'),
        ),
        color: OUTING_STATUS_COLORS[normalizedStatus] || OUTING_STATUS_COLORS.INVITED,
      };
    },
    [t],
  );

  const loadOuting = useCallback(async () => {
    if (!params.id) {
      return;
    }

    setLoading(true);

    try {
      const [outingResponse, userResponse, connectionsResponse] =
        await Promise.all([
          api.get<OutingDetail>(`/outings/${params.id}`),
          api.get<{ id: string }>('/users/me'),
          api.get<FriendshipOverview>('/friendships/mine'),
        ]);

      setOuting(outingResponse.data);
      setCurrentUserId(userResponse.data.id);
      setConnections(connectionsResponse.data.connections);
    } catch (error) {
      console.error('Erreur chargement sortie:', error);
      setOuting(null);
      setConnections([]);
      setCurrentUserId(null);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useFocusEffect(
    useCallback(() => {
      void loadOuting();
    }, [loadOuting]),
  );

  const participantIds = useMemo(
    () => new Set(outing?.OutingParticipant.map((item) => item.userId) || []),
    [outing?.OutingParticipant],
  );

  const canInvite = useMemo(() => {
    if (!outing || !currentUserId) {
      return false;
    }

    if (outing.creatorId === currentUserId) {
      return true;
    }

    return outing.OutingParticipant.some(
      (participant) =>
        participant.userId === currentUserId && participant.isAdmin,
    );
  }, [currentUserId, outing]);

  const availableConnections = useMemo(
    () =>
      connections.filter(
        (connection) => !participantIds.has(connection.user.id),
      ),
    [connections, participantIds],
  );

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipantIds((current) =>
      current.includes(participantId)
        ? current.filter((id) => id !== participantId)
        : [...current, participantId],
    );
  };

  const handleInvite = async () => {
    if (!outing || selectedParticipantIds.length === 0) {
      return;
    }

    setInviting(true);

    try {
      const response = await api.post<OutingDetail>(
        `/outings/${outing.id}/invite`,
        {
          participantIds: selectedParticipantIds,
        },
      );

      setOuting(response.data);
      setSelectedParticipantIds([]);
    } catch (error) {
      console.error(error);
      Alert.alert(t('commonErrorTitle'), t('outingDetailInviteFailed'));
    } finally {
      setInviting(false);
    }
  };

  const handleOpenDiscussion = () => {
    if (!outing) {
      return;
    }

    router.push({
      pathname: '/outing-chat/[id]',
      params: { id: outing.id },
    });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }

  if (!outing) {
    return (
      <View className="flex-1 items-center justify-center bg-white px-5 dark:bg-black">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('outingDetailNotFound')}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-full bg-[#4c669f] px-5 py-3"
        >
          <Text className="font-semibold text-white">{t('publicProfileBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white dark:bg-black">
      <View className="flex-row items-center border-b border-gray-100 px-5 pb-4 pt-14 dark:border-gray-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 rounded-full bg-gray-50 p-2 dark:bg-gray-800"
        >
          <Ionicons name="arrow-back" size={22} color={isDark ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-bold text-gray-800 dark:text-white">
          {t('outingDetailTitle')}
        </Text>
      </View>

      <ScrollView className="flex-1 px-5 py-5" showsVerticalScrollIndicator={false}>
        <View className="rounded-[28px] bg-[#4c669f]/10 p-5">
          <Text className="text-xs font-semibold uppercase tracking-[0.22em] text-[#4c669f]">
            {t('outingCreateLabel')}
          </Text>
          <Text className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
            {outing.title}
          </Text>
          <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            {formatEventDate(outing.scheduledDate, locale)}
          </Text>
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {outing.Place?.name ||
              outing.Place?.City?.name ||
              outing.Place?.address ||
              t('profileFeaturedOutingLocationFallback')}
          </Text>

          <TouchableOpacity
            onPress={handleOpenDiscussion}
            className="mt-4 self-start rounded-full bg-[#4c669f] px-4 py-2"
          >
            <Text className="font-semibold text-white">{t('outingDetailOpenDiscussion')}</Text>
          </TouchableOpacity>
        </View>

        <View className="mt-6 rounded-3xl bg-gray-50 p-4 dark:bg-gray-900">
          <Text className="text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('outingDetailParticipantsLabel')}
          </Text>
          <View className="mt-4 gap-3">
            {outing.OutingParticipant.map((participant) => {
              const status = getParticipantStatus(participant.status);
              return (
                <View
                  key={participant.userId}
                  className="flex-row items-center rounded-2xl bg-white p-3 dark:bg-gray-800"
                >
                  <Image
                    source={{
                      uri:
                        getImageUrl(participant.User.avatarUrl) ||
                        `https://i.pravatar.cc/150?u=${participant.userId}`,
                    }}
                    className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700"
                    resizeMode="cover"
                  />
                  <View className="ml-3 flex-1">
                    <Text className="text-base font-semibold text-gray-900 dark:text-white">
                      {participant.User.displayName ||
                        participant.User.username ||
                        t('outingDetailParticipantFallback')}
                    </Text>
                    <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      @{participant.User.username || t('outingDetailUsernameFallback')}
                    </Text>
                  </View>
                  <View
                    className="rounded-full px-3 py-1"
                    style={{ backgroundColor: `${status.color}22` }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: status.color }}
                    >
                      {status.label}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {canInvite ? (
          <View className="mt-6 rounded-3xl bg-gray-50 p-4 dark:bg-gray-900">
            <Text className="text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('outingDetailInviteConnectionsLabel')}
            </Text>

            {availableConnections.length > 0 ? (
              <View className="mt-4 gap-3">
                {availableConnections.map((connection) => {
                  const isSelected = selectedParticipantIds.includes(
                    connection.user.id,
                  );

                  return (
                    <TouchableOpacity
                      key={connection.friendshipId}
                      onPress={() => toggleParticipant(connection.user.id)}
                      className={`flex-row items-center rounded-2xl border p-3 ${
                        isSelected
                          ? 'border-[#4c669f] bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                      }`}
                    >
                      <Image
                        source={{
                          uri:
                            getImageUrl(connection.user.avatarUrl) ||
                            `https://i.pravatar.cc/150?u=${connection.user.id}`,
                        }}
                        className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700"
                        resizeMode="cover"
                      />
                      <View className="ml-3 flex-1">
                        <Text className="text-base font-semibold text-gray-900 dark:text-white">
                          {connection.user.displayName ||
                            connection.user.username}
                        </Text>
                        <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          @{connection.user.username}
                        </Text>
                      </View>
                      <View
                        className={`h-7 w-7 items-center justify-center rounded-full border ${
                          isSelected
                            ? 'border-[#4c669f] bg-[#4c669f]'
                            : 'border-gray-300 dark:border-gray-600'
                        }`}
                      >
                        {isSelected ? (
                          <Ionicons name="checkmark" size={16} color="white" />
                        ) : null}
                      </View>
                    </TouchableOpacity>
                  );
                })}

                <TouchableOpacity
                  onPress={handleInvite}
                  disabled={inviting || selectedParticipantIds.length === 0}
                  className="mt-2 items-center rounded-full bg-[#4c669f] px-5 py-3"
                >
                  {inviting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <Text className="font-semibold text-white">
                      {selectedParticipantIds.length > 1
                        ? t('outingDetailInviteMany', {
                            count: selectedParticipantIds.length,
                          })
                        : t('outingDetailInviteOne', {
                            count: selectedParticipantIds.length,
                          })}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              <Text className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                {t('outingDetailAllConnectionsInvited')}
              </Text>
            )}
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}
