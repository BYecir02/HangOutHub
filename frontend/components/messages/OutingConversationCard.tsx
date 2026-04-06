import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useI18n } from '@/hooks/use-i18n';

interface ChatUser {
  id: string;
  username?: string;
  displayName?: string | null;
}

interface ChatMessage {
  id: string;
  content: string;
  images?: string[] | null;
  sentAt?: string;
  User?: ChatUser;
}

export interface OutingConversationSummary {
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

type OutingConversationCardProps = {
  item: OutingConversationSummary;
  onPress: () => void;
};

export default function OutingConversationCard({
  item,
  onPress,
}: OutingConversationCardProps) {
  const { locale, t } = useI18n();
  const location =
    item.Place?.name ||
    item.Place?.City?.name ||
    item.Place?.address ||
    t('messagesLocationFallback');
  const lastMessageText = item.lastMessage?.content?.trim()
    || (item.lastMessage?.images?.length ? t('outingChatLastMessageImage') : '')
    || t('messagesLastMessageEmpty');
  const lastMessageAuthor =
    item.lastMessage?.User?.displayName ||
    item.lastMessage?.User?.username ||
    t('messagesSystemAuthor');

  return (
    <TouchableOpacity
      onPress={onPress}
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
}
