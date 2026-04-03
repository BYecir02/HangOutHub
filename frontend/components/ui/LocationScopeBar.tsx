import React, { type ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

type LocationScopeBarProps = {
  locationLabel: string;
  actionLabel: string;
  onPressAction: () => void;
  rightSlot?: ReactNode;
};

export default function LocationScopeBar({
  locationLabel,
  actionLabel,
  onPressAction,
  rightSlot,
}: LocationScopeBarProps) {
  return (
    <View className="flex-row items-center justify-between gap-2">
      <View className="min-w-0 flex-1 rounded-full bg-white px-3 py-1.5 dark:bg-gray-800">
        <Text className="text-xs font-semibold text-gray-600 dark:text-gray-100">
          {locationLabel}
        </Text>
      </View>

      <View className="flex-row items-center gap-2">
        <TouchableOpacity
          onPress={onPressAction}
          className="rounded-full border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-700 dark:bg-gray-800"
        >
          <Text className="text-xs font-semibold text-gray-600 dark:text-gray-300">
            {actionLabel}
          </Text>
        </TouchableOpacity>
        {rightSlot ? <View>{rightSlot}</View> : null}
      </View>
    </View>
  );
}
