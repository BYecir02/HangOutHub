import React from 'react';
import { Text, View } from 'react-native';

interface SocialCountChipProps {
  label: string;
  value: number;
  color: string;
}

export default function SocialCountChip({
  label,
  value,
  color,
}: SocialCountChipProps) {
  return (
    <View
      className="rounded-full px-4 py-3"
      style={{ backgroundColor: `${color}14` }}
    >
      <Text className="text-xs font-semibold uppercase tracking-[0.22em] text-gray-500 dark:text-gray-400">
        {label}
      </Text>
      <Text className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
        {value}
      </Text>
    </View>
  );
}
