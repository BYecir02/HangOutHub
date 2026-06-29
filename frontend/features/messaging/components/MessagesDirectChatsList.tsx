import React from 'react';
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  Platform,
} from 'react-native';

import DirectConversationCard from '@/features/messaging/components/DirectConversationCard';
import LogoSpinner from '@/shared/ui/LogoSpinner';
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
  onFindFriends?: () => void;
}

export default function MessagesDirectChatsList({
  data,
  refreshing,
  onRefresh,
  onEndReached,
  loadingMore,
  onPressItem,
  onOpenConnectionPicker,
  onFindFriends,
}: MessagesDirectChatsListProps) {
  const { t } = useI18n();

  return (
    <View className="flex-1">
      <FlatList
      data={data}
      keyExtractor={(item) => item.id}
      alwaysBounceVertical
      contentInset={{ top: Platform.OS === 'ios' && refreshing ? 60 : 0 }}
      refreshControl={
        Platform.OS === 'android' ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            progressViewOffset={-500}
          />
        ) : undefined
      }
      onScrollEndDrag={(event) => {
        if (Platform.OS !== 'android' && !refreshing && event.nativeEvent.contentOffset.y <= -80) {
          onRefresh();
        }
      }}
      ListHeaderComponent={
        Platform.OS === 'ios' ? (
          <View className="absolute inset-x-0 items-center" style={{ top: -60 }}>
            <View className="rounded-full bg-white/85 p-2.5 shadow-sm dark:bg-gray-900/85">
              <LogoSpinner size={26} />
            </View>
          </View>
        ) : null
      }
      contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 100 }}
      onEndReached={onEndReached}
      onEndReachedThreshold={0.3}
      ListFooterComponent={
        loadingMore ? (
          <View className="py-4 items-center">
            <LogoSpinner size={22} />
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
          {onFindFriends ? (
            <TouchableOpacity onPress={onFindFriends} className="mt-3 px-4 py-2">
              <Text className="text-sm font-semibold text-[#4c669f]">
                {t('messagesFindFriendsAction')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      }
      renderItem={({ item }) => (
        <DirectConversationCard
          item={item}
          onPress={() => onPressItem(item.id)}
        />
      )}
      />

      {refreshing && Platform.OS === 'android' ? (
        <View
          pointerEvents="none"
          className="absolute inset-x-0 top-2 z-10 items-center"
        >
          <View className="rounded-full bg-white/85 p-2.5 dark:bg-gray-900/85">
            <LogoSpinner size={24} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
