import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import type { Socket } from 'socket.io-client';

import PersonRow from '@/components/social/PersonRow';
import { useI18n } from '@/hooks/use-i18n';
import api, { getApiErrorMessage, getImageUrl } from '@/services/api';
import {
  getOrCreateDirectChat,
  listDirectChats,
  type DirectChatSummary,
} from '@/services/direct-chats';
import { stripSystemMarkers } from '@/services/direct-chat-meta';
import { getDirectChatSocket } from '@/services/direct-chat-realtime';
import { getFriendshipOverview } from '@/services/friendships';
import type { SocialUser } from '@/types/social';

interface ChatUser {
  id: string;
  username?: string;
  displayName?: string | null;
}

interface ChatMessage {
  id: string;
  content: string;
  sentAt?: string;
  User?: ChatUser;
}

interface OutingChatSummary {
  id: string;
  title: string;
  scheduledDate: string;
  participantsCount: number;
  messagesCount: number;
  unreadCount: number;
  Place?: {
    name?: string | null;
    address?: string | null;
    City?: {
      name: string;
    } | null;
  } | null;
  lastMessage?: ChatMessage | null;
}

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessagesScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [tab, setTab] = useState<'outings' | 'direct'>('outings');
  const [chats, setChats] = useState<OutingChatSummary[]>([]);
  const chatsRef = useRef<OutingChatSummary[]>([]);
  const [directChats, setDirectChats] = useState<DirectChatSummary[]>([]);
  const directChatsRef = useRef<DirectChatSummary[]>([]);
  const directSocketRef = useRef<Socket | null>(null);
  const directListRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [directLoading, setDirectLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [directRefreshing, setDirectRefreshing] = useState(false);
  const [syncWarning, setSyncWarning] = useState(false);
  const [directSyncWarning, setDirectSyncWarning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [directErrorMessage, setDirectErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [connectionPickerOpen, setConnectionPickerOpen] = useState(false);
  const [connections, setConnections] = useState<SocialUser[]>([]);
  const [connectionsLoaded, setConnectionsLoaded] = useState(false);
  const [connectionsLoading, setConnectionsLoading] = useState(false);
  const [connectionsErrorMessage, setConnectionsErrorMessage] = useState<string | null>(
    null,
  );
  const [connectionsQuery, setConnectionsQuery] = useState('');
  const [creatingChatForUserId, setCreatingChatForUserId] = useState<string | null>(
    null,
  );
  const [filter, setFilter] = useState<
    'all' | 'upcoming' | 'withMessages' | 'unread'
  >('all');

  const loadChats = useCallback(
    async ({ isRefresh = false, silent = false } = {}) => {
      if (isRefresh) {
        setRefreshing(true);
      } else if (!silent) {
        setLoading(true);
      }

      try {
        const response = await api.get<OutingChatSummary[]>('/outings/chats');
        setChats(response.data);
        chatsRef.current = response.data;
        setSyncWarning(false);
        setErrorMessage(null);
      } catch (error) {
        console.error('Erreur chargement discussions:', error);

        if (chatsRef.current.length > 0) {
          setSyncWarning(true);
        } else {
          setChats([]);
          setErrorMessage(
            getApiErrorMessage(
              error,
              t('messagesLoadFailedDefault'),
            ),
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  const loadDirectChats = useCallback(
    async ({ isRefresh = false, silent = false } = {}) => {
      if (isRefresh) {
        setDirectRefreshing(true);
      } else if (!silent) {
        setDirectLoading(true);
      }

      try {
        const response = await listDirectChats();
        const sorted = [...response].sort((left, right) => {
          const leftTime = new Date(left.lastMessageAt || 0).getTime();
          const rightTime = new Date(right.lastMessageAt || 0).getTime();
          return rightTime - leftTime;
        });
        setDirectChats(sorted);
        directChatsRef.current = sorted;
        setDirectSyncWarning(false);
        setDirectErrorMessage(null);
      } catch (error) {
        console.error('Erreur chargement messages prives:', error);

        if (directChatsRef.current.length > 0) {
          setDirectSyncWarning(true);
        } else {
          setDirectChats([]);
          setDirectErrorMessage(
            getApiErrorMessage(
              error,
              t('directChatLoadFailed'),
            ),
          );
        }
      } finally {
        setDirectLoading(false);
        setDirectRefreshing(false);
      }
    },
    [t],
  );

  const loadConnections = useCallback(
    async ({ force = false } = {}) => {
      if (connectionsLoaded && !force) {
        return;
      }

      setConnectionsLoading(true);
      setConnectionsErrorMessage(null);
      try {
        const overview = await getFriendshipOverview();
        const nextConnections = overview.connections
          .map((item) => item.user)
          .filter((user): user is SocialUser => Boolean(user?.id));
        setConnections(nextConnections);
        setConnectionsLoaded(true);
      } catch (error) {
        console.error('Erreur chargement connexions messages prives:', error);
        setConnections([]);
        setConnectionsErrorMessage(
          getApiErrorMessage(error, t('messagesDirectConnectionsLoadFailed')),
        );
      } finally {
        setConnectionsLoading(false);
      }
    },
    [connectionsLoaded, t],
  );

  const openConnectionPicker = useCallback(async () => {
    setConnectionPickerOpen(true);
    setConnectionsQuery('');
    await loadConnections();
  }, [loadConnections]);

  const startConversationWithConnection = useCallback(
    async (user: SocialUser) => {
      setCreatingChatForUserId(user.id);
      try {
        const chat = await getOrCreateDirectChat(user.id);
        setConnectionPickerOpen(false);
        setConnectionsQuery('');
        void loadDirectChats({ silent: true });
        router.push({
          pathname: '/direct-chat/[id]',
          params: { id: chat.id },
        });
      } catch (error) {
        Alert.alert(
          t('commonErrorTitle'),
          getApiErrorMessage(error, t('directChatStartFailed')),
        );
      } finally {
        setCreatingChatForUserId(null);
      }
    },
    [loadDirectChats, router, t],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      let attachedSocket: Socket | null = null;

      if (tab === 'outings') {
        void loadChats();
      } else {
        void loadDirectChats();
      }

      const scheduleDirectRefresh = () => {
        if (!isActive || tab !== 'direct') {
          return;
        }
        if (directListRefreshTimeoutRef.current) {
          return;
        }
        directListRefreshTimeoutRef.current = setTimeout(() => {
          directListRefreshTimeoutRef.current = null;
          void loadDirectChats({ silent: true });
        }, 250);
      };

      const handleChatListUpdated = () => {
        scheduleDirectRefresh();
      };

      const interval = setInterval(() => {
        if (tab === 'outings') {
          void loadChats({ silent: true });
        } else {
          void loadDirectChats({ silent: true });
        }
      }, tab === 'direct' ? 30000 : 10000);

      void (async () => {
        const socket = await getDirectChatSocket();
        if (!isActive || !socket) {
          return;
        }

        attachedSocket = socket;
        directSocketRef.current = socket;
        socket.on('chat:list-updated', handleChatListUpdated);
      })();

      return () => {
        isActive = false;
        clearInterval(interval);
        if (directListRefreshTimeoutRef.current) {
          clearTimeout(directListRefreshTimeoutRef.current);
          directListRefreshTimeoutRef.current = null;
        }
        if (attachedSocket) {
          attachedSocket.off('chat:list-updated', handleChatListUpdated);
          if (directSocketRef.current === attachedSocket) {
            directSocketRef.current = null;
          }
        }
      };
    }, [loadChats, loadDirectChats, tab]),
  );

  const filteredChats = useMemo(() => {
    const now = Date.now();
    const normalizedQuery = query.trim().toLowerCase();

    return chats.filter((chat) => {
      if (filter === 'upcoming') {
        const scheduledAt = new Date(chat.scheduledDate).getTime();
        if (Number.isFinite(scheduledAt) && scheduledAt < now) {
          return false;
        }
      }

      if (filter === 'withMessages' && chat.messagesCount <= 0) {
        return false;
      }

      if (filter === 'unread' && chat.unreadCount <= 0) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const location =
        chat.Place?.name || chat.Place?.City?.name || chat.Place?.address || '';

      return (
        chat.title.toLowerCase().includes(normalizedQuery) ||
        location.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [chats, filter, query]);

  const filteredDirectChats = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return directChats.filter((chat) => {
      if (!normalizedQuery) {
        return true;
      }

      const name =
        chat.partner.displayName ||
        chat.partner.username ||
        '';
      const lastMessageText = stripSystemMarkers(chat.lastMessage || null) || '';

      return (
        name.toLowerCase().includes(normalizedQuery) ||
        lastMessageText.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [directChats, query]);

  const filteredConnections = useMemo(() => {
    const normalizedQuery = connectionsQuery.trim().toLowerCase();

    return connections.filter((user) => {
      if (!normalizedQuery) {
        return true;
      }
      const displayName = (user.displayName || '').toLowerCase();
      const username = (user.username || '').toLowerCase();
      const bio = (user.bio || '').toLowerCase();
      return (
        displayName.includes(normalizedQuery) ||
        username.includes(normalizedQuery) ||
        bio.includes(normalizedQuery)
      );
    });
  }, [connections, connectionsQuery]);

  const isLoading = tab === 'outings' ? loading : directLoading;
  const hasError = tab === 'outings' ? errorMessage : directErrorMessage;
  const showSyncWarning = tab === 'outings' ? syncWarning : directSyncWarning;
  const emptyListLength = tab === 'outings' ? chats.length : directChats.length;
  const searchPlaceholder =
    tab === 'outings'
      ? t('messagesSearchPlaceholder')
      : t('directChatSearchPlaceholder');

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator color="#4c669f" />
      </View>
    );
  }

  if (hasError && emptyListLength === 0) {
    return (
      <View className="flex-1 bg-gray-50 px-6 pt-16 dark:bg-black">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#4c669f" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            {t('messagesTitle')}
          </Text>
        </View>

        <View className="mt-12 rounded-3xl bg-white p-5 dark:bg-gray-900">
          <Text className="text-base font-semibold text-gray-900 dark:text-white">
            {t('messagesLoadFailedTitle')}
          </Text>
          <Text className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {hasError}
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (tab === 'outings') {
                void loadChats();
              } else {
                void loadDirectChats();
              }
            }}
            className="mt-4 items-center rounded-2xl bg-[#4c669f] px-4 py-3"
          >
            <Text className="text-sm font-semibold text-white">{t('commonRetry')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 pt-16 dark:bg-black">
      <View className="flex-row items-center px-5 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#4c669f" />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-bold text-gray-900 dark:text-white">
          {t('messagesTitle')}
        </Text>
        {tab === 'direct' ? (
          <TouchableOpacity
            onPress={() => void openConnectionPicker()}
            className="h-10 w-10 items-center justify-center rounded-full bg-[#4c669f]"
          >
            <Ionicons name="add" size={20} color="#ffffff" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="px-5 pb-2">
        <View className="flex-row rounded-full bg-gray-200 p-1 dark:bg-gray-900">
          <TouchableOpacity
            onPress={() => setTab('outings')}
            className={`flex-1 items-center rounded-full px-4 py-2 ${
              tab === 'outings' ? 'bg-[#4c669f]' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                tab === 'outings' ? 'text-white' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {t('messagesTabOutings')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setTab('direct')}
            className={`flex-1 items-center rounded-full px-4 py-2 ${
              tab === 'direct' ? 'bg-[#4c669f]' : 'bg-transparent'
            }`}
          >
            <Text
              className={`text-xs font-semibold ${
                tab === 'direct' ? 'text-white' : 'text-gray-700 dark:text-gray-300'
              }`}
            >
              {t('messagesTabDirect')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {showSyncWarning ? (
        <View className="mx-5 mb-3 rounded-2xl bg-orange-100 px-4 py-3 dark:bg-orange-900/30">
          <Text className="text-xs font-semibold text-orange-700 dark:text-orange-300">
            {t('messagesSyncWarning')}
          </Text>
        </View>
      ) : null}

      <View className="px-5 pb-4">
        <View className="flex-row items-center rounded-2xl bg-white px-3 py-2 dark:bg-gray-900">
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={searchPlaceholder}
            placeholderTextColor="#9ca3af"
            className="ml-2 flex-1 text-gray-900 dark:text-white"
          />
        </View>

        {tab === 'outings' ? (
          <View className="mt-3 flex-row gap-2">
            <TouchableOpacity
              onPress={() => setFilter('all')}
              className={`rounded-full px-4 py-2 ${
                filter === 'all'
                  ? 'bg-[#4c669f]'
                  : 'bg-gray-200 dark:bg-gray-800'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  filter === 'all' ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                  {t('messagesFilterAll')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilter('upcoming')}
              className={`rounded-full px-4 py-2 ${
                filter === 'upcoming'
                  ? 'bg-[#4c669f]'
                  : 'bg-gray-200 dark:bg-gray-800'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  filter === 'upcoming'
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                  {t('messagesFilterUpcoming')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilter('withMessages')}
              className={`rounded-full px-4 py-2 ${
                filter === 'withMessages'
                  ? 'bg-[#4c669f]'
                  : 'bg-gray-200 dark:bg-gray-800'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  filter === 'withMessages'
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                  {t('messagesFilterWithMessages')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setFilter('unread')}
              className={`rounded-full px-4 py-2 ${
                filter === 'unread'
                  ? 'bg-[#4c669f]'
                  : 'bg-gray-200 dark:bg-gray-800'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  filter === 'unread'
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                  {t('messagesFilterUnread')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      {tab === 'outings' ? (
        <FlatList
            data={filteredChats}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => void loadChats({ isRefresh: true })}
                tintColor="#4c669f"
              />
            }
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
            ListEmptyComponent={
              <View className="mt-16 items-center px-6">
                <Text className="text-base text-gray-500 dark:text-gray-400">
                  {t('messagesEmptyTitle')}
                </Text>
                <Text className="mt-2 text-center text-sm text-gray-400 dark:text-gray-500">
                  {t('messagesEmptyDescription')}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              const location =
                item.Place?.name ||
                item.Place?.City?.name ||
                item.Place?.address ||
                t('messagesLocationFallback');
              const lastMessageText = item.lastMessage?.content || t('messagesLastMessageEmpty');
              const lastMessageAuthor =
                item.lastMessage?.User?.displayName ||
                item.lastMessage?.User?.username ||
                t('messagesSystemAuthor');

              return (
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/outing-chat/[id]',
                      params: { id: item.id },
                    })
                  }
                  className="mb-3 rounded-3xl bg-white p-4 dark:bg-gray-900"
                >
                  <View className="flex-row items-center justify-between">
                    <Text className="mr-2 flex-1 text-base font-semibold text-gray-900 dark:text-white">
                      {item.title}
                    </Text>
                    <Text className="text-xs text-gray-400 dark:text-gray-500">
                      {formatDate(item.scheduledDate, locale)}
                    </Text>
                  </View>

                  <Text className="mt-1 text-xs uppercase tracking-wider text-[#4c669f]">
                    {location}
                  </Text>

                  <Text className="mt-3 text-sm text-gray-600 dark:text-gray-300" numberOfLines={2}>
                    {item.lastMessage
                      ? `${lastMessageAuthor}: ${lastMessageText}`
                      : lastMessageText}
                  </Text>

                  <View className="mt-4 flex-row items-center justify-between">
                    <Text className="text-xs text-gray-400 dark:text-gray-500">
                      {item.participantsCount > 1
                        ? t('messagesParticipantsMany', { count: item.participantsCount })
                        : t('messagesParticipantsOne', { count: item.participantsCount })}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <View className="rounded-full bg-[#4c669f]/10 px-3 py-1">
                        <Text className="text-xs font-semibold text-[#4c669f]">
                          {item.messagesCount} {t('messagesCountMsg')}
                        </Text>
                      </View>
                      {item.unreadCount > 0 ? (
                        <View className="rounded-full bg-red-500 px-3 py-1">
                          <Text className="text-xs font-semibold text-white">
                            {item.unreadCount > 1
                              ? t('messagesUnreadMany', { count: item.unreadCount })
                              : t('messagesUnreadOne', { count: item.unreadCount })}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            }}
          />
      ) : (
        <FlatList
            data={filteredDirectChats}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                refreshing={directRefreshing}
                onRefresh={() => void loadDirectChats({ isRefresh: true })}
                tintColor="#4c669f"
              />
            }
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
            ListEmptyComponent={
              <View className="mt-16 items-center px-6">
                <Text className="text-base text-gray-500 dark:text-gray-400">
                  {t('directChatListEmptyTitle')}
                </Text>
                <Text className="mt-2 text-center text-sm text-gray-400 dark:text-gray-500">
                  {t('directChatListEmptyDescription')}
                </Text>
                <TouchableOpacity
                  onPress={() => void openConnectionPicker()}
                  className="mt-5 rounded-2xl bg-[#4c669f] px-4 py-2.5"
                >
                  <Text className="text-sm font-semibold text-white">
                    {t('messagesDirectPickerOpenAction')}
                  </Text>
                </TouchableOpacity>
              </View>
            }
            renderItem={({ item }) => {
              const partnerName =
                item.partner.displayName ||
                item.partner.username ||
                t('directChatTitleFallback');
              const lastMessageText = item.lastMessage?.isDeleted
                ? t('directChatMessageDeleted')
                : item.lastMessage?.images?.length
                  ? item.lastMessage.content
                    ? item.lastMessage.content
                    : t('directChatLastMessageImage')
                  : item.lastMessage?.content || t('directChatLastMessageEmpty');
              const cleanedLastMessageText = lastMessageText
                ? item.lastMessage?.isDeleted
                  ? lastMessageText
                  : stripSystemMarkers(item.lastMessage)
                : lastMessageText;
              const lastMessageDate = item.lastMessageAt
                ? formatDate(item.lastMessageAt, locale)
                : '';
              const avatarUrl = getImageUrl(item.partner.avatarUrl);
              const fallbackInitial =
                (item.partner.displayName || item.partner.username || '*')
                  .trim()
                  .charAt(0)
                  .toUpperCase();

              return (
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/direct-chat/[id]',
                      params: { id: item.id },
                    })
                  }
                  className="mb-3 rounded-3xl bg-white p-4 dark:bg-gray-900"
                >
                  <View className="flex-row items-center gap-3">
                    {avatarUrl ? (
                      <Image
                        source={{ uri: avatarUrl }}
                        className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-800"
                      />
                    ) : (
                      <View className="h-12 w-12 items-center justify-center rounded-full bg-[#4c669f]/15">
                        <Text className="text-base font-semibold text-[#4c669f]">
                          {fallbackInitial}
                        </Text>
                      </View>
                    )}
                    <View className="flex-1">
                      <View className="flex-row items-start justify-between">
                        <Text className="mr-2 flex-1 text-base font-semibold text-gray-900 dark:text-white">
                          {partnerName}
                        </Text>
                        <View className="items-end">
                          {lastMessageDate ? (
                            <Text className="text-xs text-gray-400 dark:text-gray-500">
                              {lastMessageDate}
                            </Text>
                          ) : null}
                          {item.unreadCount && item.unreadCount > 0 ? (
                            <View className="mt-1 rounded-full bg-red-500 px-2.5 py-0.5">
                              <Text className="text-[10px] font-semibold text-white">
                                {item.unreadCount > 99 ? '99+' : item.unreadCount}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                      </View>

                      <Text
                        className="mt-2 text-sm text-gray-600 dark:text-gray-300"
                        numberOfLines={2}
                      >
                        {cleanedLastMessageText}
                      </Text>
                    </View>
                  </View>

                </TouchableOpacity>
              );
            }}
          />
      )}

      {connectionPickerOpen ? (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setConnectionPickerOpen(false)}
          className="absolute inset-0 z-50 bg-black/60"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="absolute bottom-0 w-full rounded-t-3xl bg-white p-5 pb-8 dark:bg-gray-900"
          >
            <View className="mb-4 items-center">
              <View className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
            </View>
            <View className="mb-4 flex-row items-center justify-between">
              <View className="flex-1 pr-3">
                <Text className="text-lg font-bold text-gray-800 dark:text-white">
                  {t('messagesDirectPickerTitle')}
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {t('messagesDirectPickerSubtitle')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setConnectionPickerOpen(false)}
                className="rounded-full bg-gray-100 p-2 dark:bg-gray-800"
              >
                <Ionicons name="close" size={18} color="#6b7280" />
              </TouchableOpacity>
            </View>

            <View className="mb-4 flex-row items-center rounded-2xl bg-gray-100 px-3 py-2 dark:bg-gray-800">
              <Ionicons name="search-outline" size={18} color="#9ca3af" />
              <TextInput
                value={connectionsQuery}
                onChangeText={setConnectionsQuery}
                placeholder={t('messagesDirectPickerSearchPlaceholder')}
                placeholderTextColor="#9ca3af"
                className="ml-2 flex-1 text-gray-900 dark:text-white"
              />
            </View>

            {connectionsLoading ? (
              <View className="items-center py-10">
                <ActivityIndicator color="#4c669f" />
              </View>
            ) : connectionsErrorMessage ? (
              <View className="items-center py-6">
                <Text className="text-center text-sm text-red-500">
                  {connectionsErrorMessage}
                </Text>
                <TouchableOpacity
                  onPress={() => void loadConnections({ force: true })}
                  className="mt-4 rounded-2xl bg-[#4c669f] px-4 py-2.5"
                >
                  <Text className="text-sm font-semibold text-white">{t('commonRetry')}</Text>
                </TouchableOpacity>
              </View>
            ) : filteredConnections.length === 0 ? (
              <Text className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {connectionsQuery.trim()
                  ? t('messagesDirectPickerNoResult')
                  : t('messagesDirectPickerEmpty')}
              </Text>
            ) : (
              <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                {filteredConnections.map((user) => (
                  <PersonRow
                    key={user.id}
                    user={user}
                    subtitle={user.bio?.trim() || t('connectionsAcceptedSubtitle')}
                    onPress={() => void startConversationWithConnection(user)}
                    primaryAction={
                      creatingChatForUserId === user.id ? (
                        <ActivityIndicator color="#4c669f" />
                      ) : (
                        <View className="rounded-full bg-[#4c669f]/10 px-3 py-2">
                          <Text className="text-xs font-semibold text-[#4c669f]">
                            {t('messagesDirectPickerStartAction')}
                          </Text>
                        </View>
                      )
                    }
                  />
                ))}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
