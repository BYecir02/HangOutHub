import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useMemo } from 'react';

import api from '@/services/api';

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
  Place?: {
    name?: string | null;
    address?: string | null;
    City?: {
      name: string;
    } | null;
  } | null;
  lastMessage?: ChatMessage | null;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MessagesScreen() {
  const router = useRouter();
  const [chats, setChats] = useState<OutingChatSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'withMessages'>(
    'all',
  );

  const loadChats = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get<OutingChatSummary[]>('/outings/chats');
      setChats(response.data);
    } catch (error) {
      console.error('Erreur chargement discussions:', error);
      setChats([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void loadChats();
    }, [loadChats]),
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

  return (
    <View className="flex-1 bg-gray-50 pt-16 dark:bg-black">
      <View className="flex-row items-center px-5 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#4c669f" />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          Discussions
        </Text>
      </View>

      <View className="px-5 pb-4">
        <View className="flex-row items-center rounded-2xl bg-white px-3 py-2 dark:bg-gray-900">
          <Ionicons name="search-outline" size={18} color="#9ca3af" />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher une sortie..."
            placeholderTextColor="#9ca3af"
            className="ml-2 flex-1 text-gray-900 dark:text-white"
          />
        </View>

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
              Toutes
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
              A venir
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
              Avec messages
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#4c669f" />
        </View>
      ) : (
        <FlatList
          data={filteredChats}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadChats(true)}
              tintColor="#4c669f"
            />
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
          ListEmptyComponent={
            <View className="mt-16 items-center px-6">
              <Text className="text-base text-gray-500 dark:text-gray-400">
                Aucune discussion disponible pour le moment.
              </Text>
              <Text className="mt-2 text-center text-sm text-gray-400 dark:text-gray-500">
                Cree une sortie ou accepte une invitation pour commencer a chatter.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const location =
              item.Place?.name ||
              item.Place?.City?.name ||
              item.Place?.address ||
              'Lieu libre';
            const lastMessageText = item.lastMessage?.content || 'Aucun message pour le moment.';
            const lastMessageAuthor =
              item.lastMessage?.User?.displayName ||
              item.lastMessage?.User?.username ||
              'Systeme';

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
                    {formatDate(item.scheduledDate)}
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
                    {item.participantsCount} participant(s)
                  </Text>
                  <View className="rounded-full bg-[#4c669f]/10 px-3 py-1">
                    <Text className="text-xs font-semibold text-[#4c669f]">
                      {item.messagesCount} msg
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          }}
        />
      )}
    </View>
  );
}
