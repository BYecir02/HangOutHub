import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import DirectConversationCard from '@/features/messaging/components/DirectConversationCard';
import { useI18n } from '@/shared/hooks/use-i18n';
import type { DirectChatSummary } from '@/services/messaging/direct-chats';

interface MessagesDirectChatsListProps {
  data: DirectChatSummary[];
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  loadingMore: boolean;
  onPressItem: (id: string) => void;
  onOpenConnectionPicker: () => void;
}

export default function MessagesDirectChatsList({
  data,
  refreshing,
  onRefresh,
  onEndReached,
  loadingMore,
  onPressItem,
  onOpenConnectionPicker,
}: MessagesDirectChatsListProps) {
  const { t } = useI18n();

  return (
    <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#4c669f"
        />
      }
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        loadingMore ? (
          <View className="py-4 items-center">
            <ActivityIndicator size="small" color="#4c669f" />
          </View>
        ) : null
      }
      ListEmptyComponent={
        <View className="mt-16 items-center px-6">
          <Text className="text-base text-gray-500 dark:text-gray-400">
            {t('directChatListEmptyTitle')}
          </Text>
          <Text className="mt-2 text-center text-sm text-gray-400 dark:text-gray-500">
            {t('directChatListEmptyDescription')}
          </Text>
          <TouchableOpacity
            onPress={onOpenConnectionPicker}
            className="mt-5 rounded-2xl bg-[#4c669f] px-4 py-2.5"
          >
            <Text className="text-sm font-semibold text-white">
              {t('messagesDirectPickerOpenAction')}
            </Text>
          </TouchableOpacity>
        </View>
      }
      renderItem={({ item }) => (
        <DirectConversationCard
          item={item}
          onPress={() => onPressItem(item.id)}
        />
      )}
    />
  );
}
