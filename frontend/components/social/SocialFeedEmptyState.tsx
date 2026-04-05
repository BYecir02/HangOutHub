import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type SocialFeedEmptyStateProps = {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
};

export default function SocialFeedEmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: SocialFeedEmptyStateProps) {
  return (
    <View className="items-center px-6 py-16">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-[#4c669f]/10">
        <Ionicons name="sparkles-outline" size={28} color="#4c669f" />
      </View>
      <Text className="mt-5 text-xl font-bold text-gray-900 dark:text-white">
        {title}
      </Text>
      <Text className="mt-3 text-center text-base leading-7 text-gray-500 dark:text-gray-400">
        {description}
      </Text>
      <TouchableOpacity
        onPress={onAction}
        className="mt-6 rounded-full bg-[#4c669f] px-5 py-3"
      >
        <Text className="text-sm font-semibold text-white">{actionLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
