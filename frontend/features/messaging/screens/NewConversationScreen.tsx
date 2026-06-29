import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import PersonRow from '@/features/social/components/PersonRow';
import ScreenState from '@/shared/ui/ScreenState';
import SearchBar from '@/shared/ui/SearchBar';
import { useI18n } from '@/shared/hooks/use-i18n';
import {
  clearAuthState,
  getApiErrorMessage,
  isUnauthorizedError,
} from '@/services/api';
import { getOrCreateDirectChat } from '@/services/messaging/direct-chats';
import { getFriendshipOverview } from '@/services/user/friendships';
import type { SocialUser } from '@/features/social/types';

export default function NewConversationScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [connections, setConnections] = useState<SocialUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [creatingChatForUserId, setCreatingChatForUserId] = useState<string | null>(
    null,
  );

  const handleInvalidSession = useCallback(async () => {
    await clearAuthState();
    router.replace('/');
  }, [router]);

  const loadConnections = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const overview = await getFriendshipOverview();
      const next = overview.connections
        .map((item) => item.user)
        .filter((user): user is SocialUser => Boolean(user?.id));
      setConnections(next);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await handleInvalidSession();
        return;
      }
      setConnections([]);
      setErrorMessage(
        getApiErrorMessage(error, t('messagesDirectConnectionsLoadFailed')),
      );
    } finally {
      setLoading(false);
    }
  }, [handleInvalidSession, t]);

  useEffect(() => {
    void loadConnections();
  }, [loadConnections]);

  const startConversationWithConnection = useCallback(
    async (user: SocialUser) => {
      setCreatingChatForUserId(user.id);
      try {
        const chat = await getOrCreateDirectChat(user.id);
        // replace : le retour depuis le chat ramene a la liste des messages,
        // pas a cette page de selection.
        router.replace({
          pathname: '/direct-chat/[id]',
          params: { id: chat.id },
        });
      } catch (error) {
        if (isUnauthorizedError(error)) {
          await handleInvalidSession();
          return;
        }
        Alert.alert(
          t('commonErrorTitle'),
          getApiErrorMessage(error, t('directChatStartFailed')),
        );
      } finally {
        setCreatingChatForUserId(null);
      }
    },
    [handleInvalidSession, router, t],
  );

  const filteredConnections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return connections;
    }
    return connections.filter((user) => {
      const displayName = (user.displayName || '').toLowerCase();
      const username = (user.username || '').toLowerCase();
      const bio = (user.bio || '').toLowerCase();
      return (
        displayName.includes(q) ||
        username.includes(q) ||
        bio.includes(q)
      );
    });
  }, [connections, query]);

  return (
    <View className="flex-1 bg-gray-50 pt-14 dark:bg-black">
      <View className="mb-4 flex-row items-center px-5">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-3 h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
        >
          <Ionicons name="arrow-back" size={20} color="#ff4757" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('messagesDirectPickerTitle')}
          </Text>
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t('messagesDirectPickerSubtitle')}
          </Text>
        </View>
      </View>

      <SearchBar
        value={query}
        onChangeText={setQuery}
        placeholder={t('messagesDirectPickerSearchPlaceholder')}
        autoFocus
      />

      <View className="mt-3 flex-1">
        {loading ? (
          <ScreenState mode="loading" fullScreen />
        ) : errorMessage ? (
          <ScreenState
            mode="error"
            title={errorMessage}
            actionLabel={t('commonRetry')}
            onAction={() => void loadConnections()}
            fullScreen
          />
        ) : filteredConnections.length === 0 ? (
          <ScreenState
            mode="empty"
            title={
              query.trim()
                ? t('messagesDirectPickerNoResult')
                : t('messagesDirectPickerEmpty')
            }
            fullScreen
          />
        ) : (
          <FlatList
            data={filteredConnections}
            keyExtractor={(user) => user.id}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24 }}
            renderItem={({ item: user }) => (
              <PersonRow
                user={user}
                avatarSize={44}
                onPress={() => void startConversationWithConnection(user)}
                primaryAction={
                  creatingChatForUserId === user.id ? (
                    <ActivityIndicator color="#ff4757" />
                  ) : (
                    <View className="rounded-full bg-[#ff4757]/10 px-3 py-2">
                      <Text className="text-xs font-semibold text-[#ff4757]">
                        {t('messagesDirectPickerStartAction')}
                      </Text>
                    </View>
                  )
                }
              />
            )}
          />
        )}
      </View>
    </View>
  );
}
