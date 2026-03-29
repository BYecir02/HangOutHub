import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type LocationScopeBarProps = {
  locationLabel: string;
  actionLabel: string;
  onPressAction: () => void;
};

export default function LocationScopeBar({
  locationLabel,
  actionLabel,
  onPressAction,
}: LocationScopeBarProps) {
  return (
    <View className="flex-row items-center justify-between">
      <View className="rounded-full bg-white px-3 py-1.5 dark:bg-gray-800">
        <Text className="text-xs font-semibold text-gray-600 dark:text-gray-100">
          {locationLabel}
        </Text>
      </View>

      <TouchableOpacity
        onPress={onPressAction}
        className="rounded-full border border-gray-200 px-3 py-1.5 dark:border-gray-700"
      >
        <Text className="text-xs font-semibold text-gray-600 dark:text-gray-300">
          {actionLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}
