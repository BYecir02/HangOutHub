import React from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';

import BottomSheetModal from '@/components/ui/BottomSheetModal';

type FilterType = 'all' | 'plan' | 'post';

type CategoryOption = {
  id: number;
  name: string;
};

type SocialFeedFiltersSheetProps = {
  open: boolean;
  filterCategoryLabel: string;
  filterTypeLabel: string;
  filterLocationLabel: string;
  filterCategoryTitle: string;
  filterTypeTitle: string;
  filterLocationTitle: string;
  clearLabel: string;
  allLabel: string;
  plansLabel: string;
  postsLabel: string;
  categories: CategoryOption[];
  locationOptions: string[];
  activeFilter: 'category' | 'type' | 'location';
  selectedCategory: string;
  selectedType: FilterType;
  selectedLocation: string;
  onClose: () => void;
  onSetActiveFilter: (value: 'category' | 'type' | 'location') => void;
  onReset: () => void;
  onSelectCategory: (value: string) => void;
  onSelectType: (value: FilterType) => void;
  onSelectLocation: (value: string) => void;
};

export default function SocialFeedFiltersSheet({
  open,
  filterCategoryLabel,
  filterTypeLabel,
  filterLocationLabel,
  filterCategoryTitle,
  filterTypeTitle,
  filterLocationTitle,
  clearLabel,
  allLabel,
  plansLabel,
  postsLabel,
  categories,
  locationOptions,
  activeFilter,
  selectedCategory,
  selectedType,
  selectedLocation,
  onClose,
  onSetActiveFilter,
  onReset,
  onSelectCategory,
  onSelectType,
  onSelectLocation,
}: SocialFeedFiltersSheetProps) {
  const title =
    activeFilter === 'category'
      ? filterCategoryTitle
      : activeFilter === 'type'
        ? filterTypeTitle
        : filterLocationTitle;

  return (
    <BottomSheetModal
      visible={open}
      onClose={onClose}
      maxHeight={640}
      contentMode="auto"
      title={title}
      subtitle="Ajuste tes filtres pour affiner le feed."
    >
      <View className="mb-4 flex-row rounded-2xl bg-gray-100 p-1 dark:bg-gray-800">
        {[
          { key: 'category', label: filterCategoryLabel },
          { key: 'type', label: filterTypeLabel },
          { key: 'location', label: filterLocationLabel },
        ].map((option) => {
          const active = activeFilter === option.key;

          return (
            <TouchableOpacity
              key={option.key}
              onPress={() => onSetActiveFilter(option.key as 'category' | 'type' | 'location')}
              className="flex-1 items-center rounded-xl px-3 py-3"
              style={active ? { backgroundColor: '#4c669f' } : undefined}
            >
              <Text
                className={`text-xs font-semibold ${active ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
        <TouchableOpacity
          onPress={onReset}
          className="flex-row items-center border-b border-gray-100 py-3 dark:border-gray-800"
        >
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {clearLabel}
          </Text>
        </TouchableOpacity>

        {activeFilter === 'category'
          ? categories.map((category) => {
              const isSelected = selectedCategory === category.name;

              return (
                <TouchableOpacity
                  key={category.id}
                  onPress={() => onSelectCategory(category.name)}
                  className="flex-row items-center border-b border-gray-100 py-3 dark:border-gray-800"
                >
                  <Text
                    className={`text-sm font-semibold ${isSelected ? 'text-[#4c669f]' : 'text-gray-700 dark:text-gray-200'}`}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              );
            })
          : activeFilter === 'type'
            ? [
                { id: 'all', label: allLabel, value: 'all' as const },
                { id: 'plan', label: plansLabel, value: 'plan' as const },
                { id: 'post', label: postsLabel, value: 'post' as const },
              ].map((option) => {
                const isSelected = selectedType === option.value;

                return (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => onSelectType(option.value)}
                    className="flex-row items-center border-b border-gray-100 py-3 dark:border-gray-800"
                  >
                    <Text
                      className={`text-sm font-semibold ${isSelected ? 'text-[#4c669f]' : 'text-gray-700 dark:text-gray-200'}`}
                    >
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                );
              })
            : locationOptions.length > 0 ? (
              locationOptions.map((location) => {
                const isSelected = selectedLocation === location;

                return (
                  <TouchableOpacity
                    key={location}
                    onPress={() => onSelectLocation(location)}
                    className="flex-row items-center border-b border-gray-100 py-3 dark:border-gray-800"
                  >
                    <Text
                      className={`text-sm font-semibold ${isSelected ? 'text-[#4c669f]' : 'text-gray-700 dark:text-gray-200'}`}
                    >
                      {location}
                    </Text>
                  </TouchableOpacity>
                );
              })
            ) : (
              <View className="py-6">
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {allLabel}
                </Text>
              </View>
            )}
      </ScrollView>
    </BottomSheetModal>
  );
}
