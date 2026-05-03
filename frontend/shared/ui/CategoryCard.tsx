import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import LottieView from 'lottie-react-native';
import { Category } from '@/types';
import { getCategoryAnimation } from '@/utils/category-animations';

interface CategoryCardProps {
  category: Category;
  onPress?: () => void;
}

export default function CategoryCard({ category, onPress }: CategoryCardProps) {
  const animation = getCategoryAnimation(category);
  const backgroundColor = category.color || '#4c669f';

  return (
    <TouchableOpacity
      onPress={onPress}
      className="flex-row items-center py-3 px-5 rounded-full mr-3 shadow-sm"
      style={{ backgroundColor }}
    >
      {animation ? (
        <View
          className="mr-2 flex items-center justify-center rounded-full bg-white/20"
          style={{
            height: animation.container + 8,
            width: animation.container + 8,
          }}
        >
          <LottieView
            source={animation.source}
            autoPlay
            loop
            style={{ height: animation.size, width: animation.size }}
          />
        </View>
      ) : (
        <Ionicons name={category.icon as any} size={20} color="#fff" />
      )}
      <Text className="text-white font-bold ml-2 text-sm">
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}
