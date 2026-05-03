import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';

import OutingConversationCard, {
  type OutingConversationSummary,
} from '@/features/messaging/components/OutingConversationCard';
import FilterChipsBar, { type FilterChipOption } from '@/shared/ui/FilterChipsBar';
import { useI18n } from '@/shared/hooks/use-i18n';

type OutingFilter = 'all' | 'upcoming' | 'withMessages' | 'unread';

interface MessagesOutingsListProps {
  data: OutingConversationSummary[];
  refreshing: boolean;
  onRefresh: () => void;
  onEndReached: () => void;
  loadingMore: boolean;
  onPressItem: (id: string) => void;
  filterOptions: FilterChipOption<OutingFilter>[];
  activeFilter: OutingFilter;
  onFilterChange: (filter: OutingFilter) => void;
}

export default function MessagesOutingsList({
  data,
  refreshing,
  onRefresh,
  onEndReached,
  loadingMore,
  onPressItem,
  filterOptions,
  activeFilter,
  onFilterChange,
}: MessagesOutingsListProps) {
  const { t } = useI18n();

  return (
    <>
      <View className="pb-4">
        <FilterChipsBar
          options={filterOptions}
          activeKey={activeFilter}
          onChange={onFilterChange}
          paddingTop={10}
          paddingBottom={0}
        />
      </View>

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
              {t('messagesEmptyTitle')}
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-400 dark:text-gray-500">
              {t('messagesEmptyDescription')}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <OutingConversationCard
            item={item}
            onPress={() => onPressItem(item.id)}
          />
        )}
      />
    </>
  );
}
