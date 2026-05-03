import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type DiscoverEmptyStateProps = {
  title: string;
  description: string;
  resetLabel: string;
  onReset: () => void;
};

export default function DiscoverEmptyState({
  title,
  description,
  resetLabel,
  onReset,
}: DiscoverEmptyStateProps) {
  return (
    <View className="items-center rounded-3xl bg-white px-6 py-12 dark:bg-gray-900">
      <Ionicons name="sparkles-outline" size={36} color="#a1a1aa" />
      <Text className="mt-3 text-base font-semibold text-gray-700 dark:text-gray-200">
        {title}
      </Text>
      <Text className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
        {description}
      </Text>
      <TouchableOpacity
        onPress={onReset}
        className="mt-5 rounded-full bg-[#f39c12] px-4 py-2"
      >
        <Text className="text-xs font-semibold text-white">{resetLabel}</Text>
      </TouchableOpacity>
    </View>
  );
}
