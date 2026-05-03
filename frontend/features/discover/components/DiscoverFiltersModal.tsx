import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import BottomSheetModal from '@/shared/ui/BottomSheetModal';
import FilterChipsBar, { type FilterChipOption } from '@/shared/ui/FilterChipsBar';
import SearchBar from '@/shared/ui/SearchBar';
import type {
  DiscoverFilter,
  DiscoverViewMode,
} from '@/features/discover/components/discover.types';

type DiscoverFiltersModalProps = {
  visible: boolean;
  onClose: () => void;
  query: string;
  onChangeQuery: (text: string) => void;
  activeFilter: DiscoverFilter;
  onChangeFilter: (next: DiscoverFilter) => void;
  viewMode: DiscoverViewMode;
  onChangeViewMode: (next: DiscoverViewMode) => void;
  filterOptions: readonly FilterChipOption<DiscoverFilter>[];
  viewOptions: readonly FilterChipOption<DiscoverViewMode>[];
  searchPlaceholder: string;
  resetLabel: string;
  closeLabel: string;
  title: string;
  description: string;
  searchSectionLabel: string;
  filterSectionLabel: string;
  viewSectionLabel: string;
};

export default function DiscoverFiltersModal({
  visible,
  onClose,
  query,
  onChangeQuery,
  activeFilter,
  onChangeFilter,
  viewMode,
  onChangeViewMode,
  filterOptions,
  viewOptions,
  searchPlaceholder,
  resetLabel,
  closeLabel,
  title,
  description,
  searchSectionLabel,
  filterSectionLabel,
  viewSectionLabel,
}: DiscoverFiltersModalProps) {
  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={description}
      maxHeight={760}
      contentMode="auto"
      footer={
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => {
              onChangeQuery('');
              onChangeFilter('all');
              onChangeViewMode('inspiration');
            }}
            className="flex-1 items-center rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
          >
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {resetLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            className="flex-1 items-center rounded-2xl bg-[#f39c12] px-4 py-3"
          >
            <Text className="text-sm font-semibold text-white">{closeLabel}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View className="gap-5">
        <View className="mb-5">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            {searchSectionLabel}
          </Text>
          <SearchBar
            placeholder={searchPlaceholder}
            value={query}
            onChangeText={onChangeQuery}
          />
        </View>

        <View className="mb-5">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            {filterSectionLabel}
          </Text>
          <FilterChipsBar
            options={filterOptions}
            activeKey={activeFilter}
            onChange={onChangeFilter}
            activeColor="#f39c12"
            horizontalPadding={0}
            paddingTop={0}
            paddingBottom={0}
          />
        </View>

        <View className="mb-1">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            {viewSectionLabel}
          </Text>
          <View className="flex-row rounded-2xl bg-gray-100 p-1 dark:bg-gray-900">
            {viewOptions.map((option) => {
              const active = viewMode === option.key;

              return (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => onChangeViewMode(option.key)}
                  className="flex-1 items-center rounded-xl px-3 py-3"
                  style={
                    active
                      ? {
                          backgroundColor:
                            option.key === 'list' ? '#2ecc71' : '#4c669f',
                        }
                      : undefined
                  }
                >
                  <Text
                    className={`text-sm font-semibold ${
                      active ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </BottomSheetModal>
  );
}
