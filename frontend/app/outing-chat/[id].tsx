import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import api, { getApiErrorMessage } from '@/services/api';

interface ChatUser {
  id: string;
  username?: string;
  displayName?: string | null;
}

interface OutingMessage {
  id: string;
  outingId: string;
  senderId: string;
  content: string;
  sentAt: string;
  User?: ChatUser;
}

interface OutingDetail {
  id: string;
  title: string;
  scheduledDate: string;
  Place?: {
    name?: string | null;
    address?: string | null;
    City?: {
      name: string;
    } | null;
  } | null;
}

interface MeResponse {
  id: string;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OutingChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const outingId = params.id;

  const [title, setTitle] = useState('Discussion');
  const [subtitle, setSubtitle] = useState('');
  const [messages, setMessages] = useState<OutingMessage[]>([]);
  const messagesRef = useRef<OutingMessage[]>([]);
  const [myUserId, setMyUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncWarning, setSyncWarning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [draft, setDraft] = useState('');

  const loadChat = useCallback(
    async ({ isRefresh = false, silent = false } = {}) => {
      if (!outingId) {
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else if (!silent) {
        setLoading(true);
      }

      try {
        const [meResponse, outingResponse, messagesResponse] = await Promise.all([
          api.get<MeResponse>('/users/me'),
          api.get<OutingDetail>(`/outings/${outingId}`),
          api.get<OutingMessage[]>(`/outings/${outingId}/messages`),
        ]);

        setMyUserId(meResponse.data.id);
        setTitle(outingResponse.data.title || 'Discussion');
        const location =
          outingResponse.data.Place?.name ||
          outingResponse.data.Place?.City?.name ||
          outingResponse.data.Place?.address ||
          'Lieu libre';
        const dateLabel = outingResponse.data.scheduledDate
          ? new Date(outingResponse.data.scheduledDate).toLocaleString('fr-FR', {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '';
        setSubtitle(dateLabel ? `${dateLabel} · ${location}` : location);
        setMessages(messagesResponse.data);
        messagesRef.current = messagesResponse.data;
        setErrorMessage(null);
        setSyncWarning(false);
      } catch (error) {
        console.error('Erreur chargement discussion sortie:', error);

        if (messagesRef.current.length > 0) {
          setSyncWarning(true);
        } else {
          setMessages([]);
          setErrorMessage(
            getApiErrorMessage(
              error,
              'Impossible de charger cette discussion pour le moment.',
            ),
          );
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [outingId],
  );

  useFocusEffect(
    useCallback(() => {
      void loadChat();

      const interval = setInterval(() => {
        void loadChat({ silent: true });
      }, 4000);

      return () => {
        clearInterval(interval);
      };
    }, [loadChat]),
  );

  const canSend = useMemo(() => draft.trim().length > 0 && !sending, [draft, sending]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!outingId || !content) {
      return;
    }

    setSending(true);
    try {
      const response = await api.post<OutingMessage>(`/outings/${outingId}/messages`, {
        content,
      });
      setMessages((current) => {
        const next = [...current, response.data];
        messagesRef.current = next;
        return next;
      });
      setSyncWarning(false);
      setDraft('');
    } catch (error) {
      console.error('Erreur envoi message:', error);
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator color="#4c669f" />
      </View>
    );
  }

  if (errorMessage && messages.length === 0) {
    return (
      <View className="flex-1 bg-gray-50 px-6 pt-16 dark:bg-black">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="mr-4">
            <Ionicons name="arrow-back" size={24} color="#4c669f" />
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900 dark:text-white">
            Discussion
          </Text>
        </View>

        <View className="mt-12 rounded-3xl bg-white p-5 dark:bg-gray-900">
          <Text className="text-base font-semibold text-gray-900 dark:text-white">
            Chargement impossible
          </Text>
          <Text className="mt-2 text-sm text-gray-600 dark:text-gray-300">
            {errorMessage}
          </Text>
          <TouchableOpacity
            onPress={() => void loadChat()}
            className="mt-4 items-center rounded-2xl bg-[#4c669f] px-4 py-3"
          >
            <Text className="text-sm font-semibold text-white">Reessayer</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-gray-50 dark:bg-black"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View className="flex-row items-center px-5 pb-4 pt-16">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#4c669f" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-xs uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Sortie · En direct
          </Text>
          <Text className="text-lg font-bold text-gray-900 dark:text-white" numberOfLines={1}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400" numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {syncWarning ? (
        <View className="mx-4 mb-2 rounded-2xl bg-orange-100 px-4 py-3 dark:bg-orange-900/30">
          <Text className="text-xs font-semibold text-orange-700 dark:text-orange-300">
            Synchronisation instable. Derniers messages affiches.
          </Text>
        </View>
      ) : null}

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadChat({ isRefresh: true })}
            tintColor="#4c669f"
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        ListEmptyComponent={
          <View className="mt-16 items-center px-6">
            <Text className="text-base text-gray-500 dark:text-gray-400">
              Aucun message pour le moment.
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-400 dark:text-gray-500">
              Lance la conversation avec ton groupe de sortie.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const mine = item.senderId === myUserId;
          const senderName = item.User?.displayName || item.User?.username || 'Membre';

          return (
            <View className={`mb-3 ${mine ? 'items-end' : 'items-start'}`}>
              {!mine ? (
                <Text className="mb-1 text-xs text-gray-400 dark:text-gray-500">
                  {senderName}
                </Text>
              ) : null}
              <View
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  mine
                    ? 'bg-[#4c669f]'
                    : 'bg-white dark:bg-gray-900'
                }`}
              >
                <Text className={`${mine ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                  {item.content}
                </Text>
              </View>
              <Text className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                {formatTime(item.sentAt)}
              </Text>
            </View>
          );
        }}
      />

      <View className="border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-black">
        <View className="flex-row items-end">
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Ecris ton message..."
            placeholderTextColor="#9ca3af"
            multiline
            className="max-h-28 flex-1 rounded-2xl bg-gray-100 px-4 py-3 text-gray-900 dark:bg-gray-900 dark:text-white"
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!canSend}
            className={`ml-3 h-11 w-11 items-center justify-center rounded-full ${
              canSend ? 'bg-[#4c669f]' : 'bg-gray-300 dark:bg-gray-700'
            }`}
          >
            {sending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
