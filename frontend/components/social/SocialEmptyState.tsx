import React from 'react';
import { Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SocialEmptyStateProps {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  description: string;
}

export default function SocialEmptyState({
  icon,
  title,
  description,
}: SocialEmptyStateProps) {
  return (
    <View className="items-center rounded-[28px] bg-gray-50 px-6 py-12 dark:bg-gray-900">
      <View className="h-14 w-14 items-center justify-center rounded-full bg-[#4c669f]/10">
        <Ionicons name={icon} size={24} color="#4c669f" />
      </View>
      <Text className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </Text>
      <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
        {description}
      </Text>
    </View>
  );
}
