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
      className="rounded-2xl border px-4 py-3"
      style={{
        backgroundColor: `${color}16`,
        borderColor: `${color}30`,
      }}
    >
      <Text
        className="text-xs font-semibold uppercase tracking-[0.2em]"
        style={{ color }}
      >
        {label}
      </Text>
      <Text className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
        {value}
      </Text>
    </View>
  );
}
