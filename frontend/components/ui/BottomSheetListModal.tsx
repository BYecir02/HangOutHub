import React from 'react';
import { ScrollView, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomSheetModal from '@/components/ui/BottomSheetModal';
import ScreenState from '@/components/ui/ScreenState';

type BottomSheetListModalProps<T> = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  items: T[];
  keyExtractor: (item: T) => string;
  renderItem: (item: T) => React.ReactNode;
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  loading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  retryLabel?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  maxHeight?: number;
  autoFocusSearchInput?: boolean;
};

export default function BottomSheetListModal<T>({
  visible,
  onClose,
  title,
  subtitle,
  items,
  keyExtractor,
  renderItem,
  searchValue,
  onSearchChange,
  searchPlaceholder,
  loading = false,
  errorMessage = null,
  onRetry,
  retryLabel = 'Retry',
  emptyTitle,
  emptyDescription,
  maxHeight,
  autoFocusSearchInput = false,
}: BottomSheetListModalProps<T>) {
  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      maxHeight={maxHeight}
      contentMode="auto"
    >
      <View className="mb-4 flex-row items-center rounded-2xl bg-gray-100 px-3 py-2 dark:bg-gray-800">
        <Ionicons name="search-outline" size={18} color="#9ca3af" />
        <TextInput
          value={searchValue}
          onChangeText={onSearchChange}
          placeholder={searchPlaceholder}
          placeholderTextColor="#9ca3af"
          autoFocus={autoFocusSearchInput}
          className="ml-2 flex-1 text-gray-900 dark:text-white"
        />
      </View>

      {loading ? (
        <ScreenState mode="loading" />
      ) : errorMessage ? (
        <ScreenState
          mode="error"
          title={errorMessage}
          actionLabel={onRetry ? retryLabel : undefined}
          onAction={onRetry}
        />
      ) : items.length === 0 ? (
        <ScreenState
          mode="empty"
          title={emptyTitle}
          description={emptyDescription}
        />
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 8 }}
        >
          {items.map((item) => (
            <View key={keyExtractor(item)}>{renderItem(item)}</View>
          ))}
          <View className="h-1" />
        </ScrollView>
      )}
    </BottomSheetModal>
  );
}
