import React from 'react';
import { Text, View } from 'react-native';

interface CategoryEmptyBlockProps {
  title: string;
  message: string;
}

export default function CategoryEmptyBlock({ title, message }: CategoryEmptyBlockProps) {
  return (
    <View className="rounded-3xl bg-white px-5 py-6 dark:bg-gray-900">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </Text>
      <Text className="mt-2 text-gray-500 dark:text-gray-400">{message}</Text>
    </View>
  );
}
