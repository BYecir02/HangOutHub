import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Category } from '@/types';

interface CategoryCardProps {
  category: Category;
  onPress?: () => void;
}

export default function CategoryCard({ category, onPress }: CategoryCardProps) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      className="flex-row items-center py-3 px-5 rounded-full mr-3 shadow-sm"
      style={{ backgroundColor: category.color }}
    >
      <Ionicons name={category.icon as any} size={20} color="#fff" />
      <Text className="text-white font-bold ml-2 text-sm">
        {category.name}
      </Text>
    </TouchableOpacity>
  );
}