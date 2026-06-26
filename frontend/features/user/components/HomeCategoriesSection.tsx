import React from 'react';
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import CategoryCard from '@/shared/ui/CategoryCard';
import { SkeletonBlock } from '@/shared/ui/Skeleton';
import { type Category } from '@/shared/types';

import HomeSectionPlaceholder from './HomeSectionPlaceholder';

const SKELETON_WIDTHS = [90, 110, 80, 120, 95];

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
          <Text className="text-xs font-medium text-[#ff4757]">{seeAllLabel}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flexDirection: 'row', paddingHorizontal: 20, gap: 10 }}>
          {SKELETON_WIDTHS.map((w, i) => (
            <SkeletonBlock key={i} style={{ width: w, height: 48, borderRadius: 100 }} />
          ))}
        </View>
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
