import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import { useI18n } from '@/hooks/use-i18n';
import {
  getDirectChat,
  getDirectMessages,
  markDirectChatRead,
  sendDirectMessage,
  type DirectChatMessage,
  type DirectChatPartner,
} from '@/services/direct-chats';
import { getApiErrorMessage } from '@/services/api';
import { resolveStoredUserSession } from '@/services/user-session';

export default function DirectChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { t } = useI18n();
  const [partner, setPartner] = useState<DirectChatPartner | null>(null);
  const [messages, setMessages] = useState<DirectChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [input, setInput] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const listRef = useRef<FlatList<DirectChatMessage> | null>(null);

  const chatId = params.id || '';

  const loadThread = useCallback(async () => {
    if (!chatId) {
      return;
    }

    setLoading(true);
    try {
      const [conversation, items] = await Promise.all([
        getDirectChat(chatId),
        getDirectMessages(chatId),
      ]);
      setPartner(conversation.partner);
      setMessages(items);
      setErrorMessage(null);
      void markDirectChatRead(chatId);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, t('directChatLoadFailed')),
      );
    } finally {
      setLoading(false);
    }
  }, [chatId, t]);

  useFocusEffect(
    useCallback(() => {
      void loadThread();
    }, [loadThread]),
  );

  useEffect(() => {
    let isMounted = true;

    const resolveUser = async () => {
      const session = await resolveStoredUserSession();
      if (!isMounted) {
        return;
      }
      setCurrentUserId(session?.id ?? null);
    };

    void resolveUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      requestAnimationFrame(() => {
        listRef.current?.scrollToEnd({ animated: true });
      });
    }
  }, [messages]);

  const displayName = useMemo(() => {
    if (!partner) {
      return t('directChatTitleFallback');
    }
    return partner.displayName || partner.username || t('directChatTitleFallback');
  }, [partner, t]);

  const handleSend = async () => {
    const content = input.trim();
    if (!content || !chatId || sending) {
      return;
    }

    setSending(true);
    try {
      const message = await sendDirectMessage(chatId, content);
      setMessages((prev) => [...prev, message]);
      setInput('');
      void markDirectChatRead(chatId);
    } catch (error) {
      setErrorMessage(
        getApiErrorMessage(error, t('directChatSendFailed')),
      );
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

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1 bg-gray-50 dark:bg-black"
    >
      <View className="flex-row items-center px-5 pb-3 pt-14">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#4c669f" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {displayName}
        </Text>
      </View>

      {errorMessage ? (
        <View className="mx-5 mb-3 rounded-2xl bg-red-100 px-4 py-3 dark:bg-red-900/30">
          <Text className="text-xs font-semibold text-red-700 dark:text-red-300">
            {errorMessage}
          </Text>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
        renderItem={({ item }) => {
          const isMine = item.User?.id === currentUserId;
          const bubbleTone = isMine
            ? 'bg-[#4c669f] text-white'
            : 'bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-100';
          return (
            <View className={`mb-3 ${isMine ? 'items-end' : 'items-start'}`}>
              <View className={`max-w-[80%] rounded-2xl px-4 py-3 ${bubbleTone}`}>
                <Text className={`${isMine ? 'text-white' : 'text-gray-800 dark:text-gray-100'}`}>
                  {item.content}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="mt-16 items-center px-6">
            <Text className="text-base text-gray-500 dark:text-gray-400">
              {t('directChatEmptyTitle')}
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-400 dark:text-gray-500">
              {t('directChatEmptyDescription')}
            </Text>
          </View>
        }
      />

      <View className="border-t border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-950">
        <View className="flex-row items-center rounded-2xl bg-gray-50 px-3 py-2 dark:bg-gray-900">
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder={t('directChatInputPlaceholder')}
            placeholderTextColor="#9ca3af"
            className="flex-1 text-base text-gray-900 dark:text-white"
            multiline
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={sending || !input.trim()}
            className={`ml-2 h-10 w-10 items-center justify-center rounded-full ${
              sending || !input.trim() ? 'bg-gray-300' : 'bg-[#4c669f]'
            }`}
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="send" size={18} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
