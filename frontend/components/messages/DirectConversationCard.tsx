import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';

import { useI18n } from '@/hooks/use-i18n';
import { getImageUrl } from '@/services/api';
import { stripSystemMarkers } from '@/services/direct-chat-meta';
import type { DirectChatSummary } from '@/services/direct-chats';

function formatDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

type DirectConversationCardProps = {
  item: DirectChatSummary;
  onPress: () => void;
};

export default function DirectConversationCard({
  item,
  onPress,
}: DirectConversationCardProps) {
  const { locale, t } = useI18n();
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
      onPress={onPress}
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
}
