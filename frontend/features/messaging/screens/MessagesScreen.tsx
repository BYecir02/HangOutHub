import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Dimensions,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import type { Socket } from 'socket.io-client';

import MessagesDirectChatsList from '@/features/messaging/components/MessagesDirectChatsList';
import MessagesOutingsList from '@/features/messaging/components/MessagesOutingsList';
import MessagesTabBar from '@/features/messaging/components/MessagesTabBar';
import type { OutingConversationSummary } from '@/features/messaging/components/OutingConversationCard';
import PersonRow from '@/features/social/components/PersonRow';
import BottomSheetModal from '@/shared/ui/BottomSheetModal';
import BottomSheetListModal from '@/shared/ui/BottomSheetListModal';
import { type FilterChipOption } from '@/shared/ui/FilterChipsBar';
import ScreenHeader from '@/shared/ui/ScreenHeader';
import SearchBar from '@/shared/ui/SearchBar';
import { useI18n } from '@/shared/hooks/use-i18n';
import api, { clearAuthState, getApiErrorMessage, isUnauthorizedError } from '@/services/api';
import {
  getOrCreateDirectChat,
  listDirectChats,
  type DirectChatSummary,
} from '@/services/messaging/direct-chats';
import { stripSystemMarkers } from '@/services/messaging/direct-chat-meta';
import { getDirectChatSocket } from '@/services/messaging/direct-chat-realtime';
import { getFriendshipOverview } from '@/services/user/friendships';
import type { SocialUser } from '@/features/social/types';

export default function MessagesScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [tab, setTab] = useState<'outings' | 'direct'>('outings');
  type OutingFilter = 'all' | 'upcoming' | 'withMessages' | 'unread';
  const [chats, setChats] = useState<OutingConversationSummary[]>([]);
  const chatsRef = useRef<OutingConversationSummary[]>([]);
  const chatsCursorRef = useRef<string | null>(null);
  const chatsHasMoreRef = useRef(false);
  const [chatsLoadingMore, setChatsLoadingMore] = useState(false);
  const [directChats, setDirectChats] = useState<DirectChatSummary[]>([]);
  const directChatsRef = useRef<DirectChatSummary[]>([]);
  const directCursorRef = useRef<string | null>(null);
  const directHasMoreRef = useRef(false);
  const [directLoadingMore, setDirectLoadingMore] = useState(false);
  const directSocketRef = useRef<Socket | null>(null);
  const directListRefreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  // Suivi du premier chargement par sous-onglet : evite de tout recharger
  // (spinner plein ecran) a chaque bascule Sorties <-> Prive.
  const outingsLoadedRef = useRef(false);
  const directLoadedRef = useRef(false);
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
  const [filter, setFilter] = useState<OutingFilter>('all');
  const [searchSheetOpen, setSearchSheetOpen] = useState(false);

  const handleInvalidSession = useCallback(async () => {
    await clearAuthState();
    router.replace('/');
  }, [router]);

  const loadChats = useCallback(
    async ({ isRefresh = false, silent = false } = {}) => {
      if (isRefresh) {
        chatsCursorRef.current = null;
        setRefreshing(true);
      } else if (!silent) {
        setLoading(true);
      }

      try {
        const response = await api.get<{
          items: OutingConversationSummary[];
          nextCursor: string | null;
          hasMore: boolean;
        }>('/outings/chats', { params: { limit: 30 } });
        chatsCursorRef.current = response.data.nextCursor;
        chatsHasMoreRef.current = response.data.hasMore;
        setChats(response.data.items);
        chatsRef.current = response.data.items;
        setSyncWarning(false);
        setErrorMessage(null);
      } catch (error) {
        if (isUnauthorizedError(error)) {
          await handleInvalidSession();
          return;
        }

        console.error('Erreur chargement discussions:', error);

        if (chatsRef.current.length > 0) {
          setSyncWarning(true);
        } else {
          setChats([]);
          setErrorMessage(getApiErrorMessage(error, t('messagesLoadFailedDefault')));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [handleInvalidSession, t],
  );

  const loadMoreChats = useCallback(async () => {
    if (!chatsHasMoreRef.current || !chatsCursorRef.current || chatsLoadingMore) {
      return;
    }

    setChatsLoadingMore(true);
    try {
      const response = await api.get<{
        items: OutingConversationSummary[];
        nextCursor: string | null;
        hasMore: boolean;
      }>('/outings/chats', {
        params: { limit: 30, cursor: chatsCursorRef.current },
      });
      chatsCursorRef.current = response.data.nextCursor;
      chatsHasMoreRef.current = response.data.hasMore;
      setChats((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const newItems = response.data.items.filter((c) => !existingIds.has(c.id));
        const merged = [...prev, ...newItems];
        chatsRef.current = merged;
        return merged;
      });
    } catch {
      // silently ignore load-more errors
    } finally {
      setChatsLoadingMore(false);
    }
  }, [chatsLoadingMore]);

  const loadDirectChats = useCallback(
    async ({ isRefresh = false, silent = false } = {}) => {
      if (isRefresh) {
        directCursorRef.current = null;
        setDirectRefreshing(true);
      } else if (!silent) {
        setDirectLoading(true);
      }

      try {
        const page = await listDirectChats({ limit: 30 });
        directCursorRef.current = page.nextCursor;
        directHasMoreRef.current = page.hasMore;
        setDirectChats(page.items);
        directChatsRef.current = page.items;
        setDirectSyncWarning(false);
        setDirectErrorMessage(null);
      } catch (error) {
        if (isUnauthorizedError(error)) {
          await handleInvalidSession();
          return;
        }

        console.error('Erreur chargement messages prives:', error);

        if (directChatsRef.current.length > 0) {
          setDirectSyncWarning(true);
        } else {
          setDirectChats([]);
          setDirectErrorMessage(
            getApiErrorMessage(error, t('directChatLoadFailed')),
          );
        }
      } finally {
        setDirectLoading(false);
        setDirectRefreshing(false);
      }
    },
    [handleInvalidSession, t],
  );

  const loadMoreDirectChats = useCallback(async () => {
    if (!directHasMoreRef.current || !directCursorRef.current || directLoadingMore) {
      return;
    }

    setDirectLoadingMore(true);
    try {
      const page = await listDirectChats({
        limit: 30,
        cursor: directCursorRef.current,
      });
      directCursorRef.current = page.nextCursor;
      directHasMoreRef.current = page.hasMore;
      setDirectChats((prev) => {
        const existingIds = new Set(prev.map((c) => c.id));
        const newItems = page.items.filter((c) => !existingIds.has(c.id));
        const merged = [...prev, ...newItems];
        directChatsRef.current = merged;
        return merged;
      });
    } catch {
      // silently ignore load-more errors
    } finally {
      setDirectLoadingMore(false);
    }
  }, [directLoadingMore]);

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
        if (isUnauthorizedError(error)) {
          await handleInvalidSession();
          return;
        }

        console.error('Erreur chargement connexions messages prives:', error);
        setConnections([]);
        setConnectionsErrorMessage(
          getApiErrorMessage(error, t('messagesDirectConnectionsLoadFailed')),
        );
      } finally {
        setConnectionsLoading(false);
      }
    },
    [connectionsLoaded, handleInvalidSession, t],
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
    [handleInvalidSession, loadDirectChats, router, t],
  );

  useFocusEffect(
    useCallback(() => {
      let isActive = true;
      let attachedSocket: Socket | null = null;

      // Premier passage sur l'onglet : chargement complet (avec spinner).
      // Passages suivants : rafraichissement silencieux, sans vider la liste
      // ni spinner plein ecran -> bascule instantanee.
      if (tab === 'outings') {
        if (outingsLoadedRef.current) {
          void loadChats({ silent: true });
        } else {
          outingsLoadedRef.current = true;
          void loadChats();
        }
      } else {
        if (directLoadedRef.current) {
          void loadDirectChats({ silent: true });
        } else {
          directLoadedRef.current = true;
          void loadDirectChats();
        }
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

      // Outings has no socket — poll every 60s as fallback.
      // Direct is covered by the socket (chat:list-updated), no polling needed.
      const interval =
        tab === 'outings'
          ? setInterval(() => {
              void loadChats({ silent: true });
            }, 60_000)
          : null;

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
        if (interval) {
          clearInterval(interval);
        }
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
  const shouldShowLoading = isLoading && emptyListLength === 0;
  const searchPlaceholder =
    tab === 'outings'
      ? t('messagesSearchPlaceholder')
      : t('directChatSearchPlaceholder');
  const pickerMaxHeight = Math.min(
    720,
    Math.round(Dimensions.get('window').height * 0.88),
  );
  const normalizedQuery = query.trim();
  const headerSubtitle =
    normalizedQuery.length >= 2
      ? `${t('searchResultsLabel')} - ${normalizedQuery}`
      : undefined;
  const outingFilterOptions = useMemo<FilterChipOption<OutingFilter>[]>(
    () => [
      { key: 'all', label: t('messagesFilterAll') },
      { key: 'upcoming', label: t('messagesFilterUpcoming') },
      { key: 'withMessages', label: t('messagesFilterWithMessages') },
      { key: 'unread', label: t('messagesFilterUnread') },
    ],
    [t],
  );

  if (shouldShowLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator color="#4c669f" />
      </View>
    );
  }

  if (hasError && emptyListLength === 0) {
    return (
      <View className="flex-1 bg-gray-50 pt-16 dark:bg-black">
        <ScreenHeader
          title={t('messagesTitle')}
          containerClassName="px-5 pb-4"
        />

        <View className="mx-5 mt-8 rounded-3xl bg-white p-5 dark:bg-gray-900">
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
      <ScreenHeader
        title={t('messagesTitle')}
        subtitle={headerSubtitle}
        containerClassName="px-5 pb-4"
        rightSlot={
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={() => setSearchSheetOpen(true)}
              className="mr-2 h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900"
            >
              <Ionicons name="search-outline" size={20} color="#4c669f" />
            </TouchableOpacity>
            {tab === 'direct' ? (
              <TouchableOpacity
                onPress={() => void openConnectionPicker()}
                className="h-10 w-10 items-center justify-center rounded-full bg-[#4c669f]"
              >
                <Ionicons name="add" size={20} color="#ffffff" />
              </TouchableOpacity>
            ) : null}
          </View>
        }
      />

      <MessagesTabBar activeTab={tab} onTabChange={setTab} />

      {showSyncWarning ? (
        <View className="mx-5 mb-3 rounded-2xl bg-orange-100 px-4 py-3 dark:bg-orange-900/30">
          <Text className="text-xs font-semibold text-orange-700 dark:text-orange-300">
            {t('messagesSyncWarning')}
          </Text>
        </View>
      ) : null}

      {tab === 'outings' ? (
        <MessagesOutingsList
          data={filteredChats}
          refreshing={refreshing}
          onRefresh={() => void loadChats({ isRefresh: true })}
          onEndReached={() => void loadMoreChats()}
          loadingMore={chatsLoadingMore}
          onPressItem={(id) =>
            router.push({ pathname: '/outing-chat/[id]', params: { id } })
          }
          filterOptions={outingFilterOptions}
          activeFilter={filter}
          onFilterChange={setFilter}
          onCreateOuting={() => router.push('/outing')}
        />
      ) : (
        <MessagesDirectChatsList
          data={filteredDirectChats}
          refreshing={directRefreshing}
          onRefresh={() => void loadDirectChats({ isRefresh: true })}
          onEndReached={() => void loadMoreDirectChats()}
          loadingMore={directLoadingMore}
          onPressItem={(id) =>
            router.push({ pathname: '/direct-chat/[id]', params: { id } })
          }
          onOpenConnectionPicker={() => void openConnectionPicker()}
          onFindFriends={() => router.push('/search')}
        />
      )}

      <BottomSheetModal
        visible={searchSheetOpen}
        onClose={() => setSearchSheetOpen(false)}
        title={t('messagesTitle')}
        subtitle={searchPlaceholder}
        maxHeight={140}
        contentMode="auto"
      >
        <SearchBar
          value={query}
          onChangeText={setQuery}
          autoFocus
          placeholder={searchPlaceholder}
          useBottomSheetInput
        />
      </BottomSheetModal>

      <BottomSheetListModal
        visible={connectionPickerOpen}
        onClose={() => setConnectionPickerOpen(false)}
        title={t('messagesDirectPickerTitle')}
        subtitle={t('messagesDirectPickerSubtitle')}
        items={filteredConnections}
        keyExtractor={(user) => user.id}
        renderItem={(user) => (
          <PersonRow
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
        )}
        searchValue={connectionsQuery}
        onSearchChange={setConnectionsQuery}
        searchPlaceholder={t('messagesDirectPickerSearchPlaceholder')}
        autoFocusSearchInput
        loading={connectionsLoading}
        errorMessage={connectionsErrorMessage}
        onRetry={() => {
          void loadConnections({ force: true });
        }}
        retryLabel={t('commonRetry')}
        emptyTitle={
          connectionsQuery.trim()
            ? t('messagesDirectPickerNoResult')
            : t('messagesDirectPickerEmpty')
        }
        maxHeight={pickerMaxHeight}
      />
    </View>
  );
}
