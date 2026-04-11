import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import CategoryCard from '@/components/ui/CategoryCard';
import { type Category } from '@/types';

import HomeSectionPlaceholder from './HomeSectionPlaceholder';

interface HomeCategoriesSectionProps {
  title: string;
  seeAllLabel: string;
  emptyMessage: string;
  categories: Category[];
  loading: boolean;
  onSeeAll: () => void;
  onPressCategory: (categoryId: number) => void;
}

export default function HomeCategoriesSection({
  title,
  seeAllLabel,
  emptyMessage,
  categories,
  loading,
  onSeeAll,
  onPressCategory,
}: HomeCategoriesSectionProps) {
  return (
    <View className="mt-3">
      <View className="mb-4 flex-row items-end justify-between px-5">
        <Text className="text-lg font-bold text-gray-800 dark:text-white">
          {title}
        </Text>
        <TouchableOpacity onPress={onSeeAll}>
          <Text className="text-xs font-medium text-[#4c669f]">{seeAllLabel}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#4c669f" className="mt-4" />
      ) : categories.length > 0 ? (
        <FlatList
          data={categories}
          renderItem={({ item }) => (
            <CategoryCard category={item} onPress={() => onPressCategory(item.id)} />
          )}
          keyExtractor={(item) => item.id.toString()}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
        />
      ) : (
        <HomeSectionPlaceholder message={emptyMessage} />
      )}
    </View>
  );
}
