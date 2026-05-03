import React from 'react';
import { Text, View } from 'react-native';

export default function HomeSectionPlaceholder({ message }: { message: string }) {
  return (
    <View className="px-5 py-4">
      <Text className="text-sm text-gray-500 dark:text-gray-400">{message}</Text>
    </View>
  );
}
