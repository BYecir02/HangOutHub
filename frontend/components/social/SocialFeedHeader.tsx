import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type FilterType = 'all' | 'plan' | 'post';

type SocialFeedHeaderProps = {
  headerLabel: string;
  headerTitle: string;
  headerSubtitle: string;
  allLabel: string;
  postsLabel: string;
  plansLabel: string;
  locationLabel: string;
  pendingLabel?: string;
  pendingVisible?: boolean;
  onSearch: () => void;
  onOpenFilters: () => void;
  onOpenMessages: () => void;
  onShowAll: () => void;
  onShowPosts: () => void;
  onShowPlans: () => void;
  onOpenLocationFilters: () => void;
  selectedCategory: string;
  selectedType: FilterType;
  selectedLocation: string;
  onApplyPending?: () => void;
};

const chipBaseClass =
  'rounded-full border px-3 py-2';

export default function SocialFeedHeader({
  headerLabel,
  headerTitle,
  headerSubtitle,
  allLabel,
  postsLabel,
  plansLabel,
  locationLabel,
  pendingLabel,
  pendingVisible = false,
  onSearch,
  onOpenFilters,
  onOpenMessages,
  onShowAll,
  onShowPosts,
  onShowPlans,
  onOpenLocationFilters,
  selectedCategory,
  selectedType,
  selectedLocation,
  onApplyPending,
}: SocialFeedHeaderProps) {
  const isAllActive = selectedCategory === '' && selectedType === 'all' && selectedLocation === '';
  const isPostsActive = selectedType === 'post';
  const isPlansActive = selectedType === 'plan';
  const isLocationActive = selectedLocation !== '';

  return (
    <View className="mb-4 px-5 pb-2 pt-2">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
            {headerLabel}
          </Text>
          <Text className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {headerTitle}
          </Text>
          <Text className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
            {headerSubtitle}
          </Text>
        </View>

        <View className="items-end">
          <View className="flex-row items-center">
            <TouchableOpacity
              onPress={onSearch}
              className="mr-2 h-11 w-11 items-center justify-center rounded-2xl border border-[#4c669f]/15 bg-[#4c669f]/10 dark:border-[#4c669f]/30 dark:bg-[#4c669f]/20"
            >
              <Ionicons name="search-outline" size={20} color="#4c669f" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onOpenFilters}
              className="mr-2 h-11 w-11 items-center justify-center rounded-2xl border border-[#4c669f]/15 bg-[#4c669f]/10 dark:border-[#4c669f]/30 dark:bg-[#4c669f]/20"
            >
              <Ionicons name="options-outline" size={20} color="#4c669f" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onOpenMessages}
              className="h-11 w-11 items-center justify-center rounded-2xl border border-[#4c669f]/15 bg-[#4c669f]/10 dark:border-[#4c669f]/30 dark:bg-[#4c669f]/20"
            >
              <Ionicons name="chatbubble-ellipses-outline" size={20} color="#4c669f" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View className="mt-4 flex-row flex-wrap gap-2">
        {[
          { key: 'all', label: allLabel, active: isAllActive, onPress: onShowAll },
          { key: 'post', label: postsLabel, active: isPostsActive, onPress: onShowPosts },
          { key: 'plan', label: plansLabel, active: isPlansActive, onPress: onShowPlans },
          { key: 'location', label: locationLabel, active: isLocationActive, onPress: onOpenLocationFilters },
        ].map((chip) => (
          <TouchableOpacity
            key={chip.key}
            onPress={chip.onPress}
            className={`${chipBaseClass} ${
              chip.active
                ? 'border-[#4c669f] bg-[#4c669f]'
                : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
            }`}
          >
            <Text className={`text-xs font-semibold ${chip.active ? 'text-white' : 'text-gray-600 dark:text-gray-200'}`}>
              {chip.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {pendingVisible && onApplyPending ? (
        <TouchableOpacity
          onPress={onApplyPending}
          className="mt-4 rounded-2xl border border-[#4c669f]/20 bg-[#4c669f]/10 px-4 py-3"
        >
          <Text className="text-xs font-semibold text-[#4c669f]">
            {pendingLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
