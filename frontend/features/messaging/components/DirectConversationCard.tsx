import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import Badge from '@/components/ui/primitives/Badge';
import Divider from '@/components/ui/primitives/Divider';
import { useI18n } from '@/hooks/use-i18n';
import Avatar from '@/components/ui/primitives/Avatar';
import { getImageUrl } from '@/services/api';
import { stripSystemMarkers } from '@/services/direct-chat-meta';
import { isVideoUrl } from '@/services/media';
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
  const cleanedLastMessageText = item.lastMessage?.isDeleted
    ? t('directChatMessageDeleted')
    : (() => {
        const cleanedText = stripSystemMarkers(item.lastMessage).trim();

        if (cleanedText) {
          return cleanedText;
        }

        const mediaUrls = item.lastMessage?.images || [];
        if (mediaUrls.some((url) => isVideoUrl(url))) {
          return t('directChatLastMessageVideo');
        }

        if (mediaUrls.length > 0) {
          return t('directChatLastMessageImage');
        }

        return t('directChatLastMessageEmpty');
      })();
  const lastMessageDate = item.lastMessageAt
    ? formatDate(item.lastMessageAt, locale)
    : '';
  const avatarUrl = getImageUrl(item.partner.avatarUrl);

  return (
    <TouchableOpacity
      onPress={onPress}
      className="mb-3 rounded-3xl bg-white p-4 dark:bg-gray-900"
    >
      <View className="flex-row items-center gap-3">
        <Avatar
          uri={avatarUrl}
          label={item.partner.displayName || item.partner.username}
          size={48}
          backgroundColor="#eaf0ff"
          textColor="#4c669f"
        />
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
                <Badge
                  label={item.unreadCount > 99 ? '99+' : String(item.unreadCount)}
                  tone="danger"
                  variant="solid"
                  size="sm"
                  className="mt-1"
                />
              ) : null}
            </View>
          </View>

          <Divider className="my-3" color="#e5e7eb" />

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
