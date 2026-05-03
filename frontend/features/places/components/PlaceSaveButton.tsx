import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type PlaceSaveButtonProps = {
  isSaved: boolean;
  saving?: boolean;
  onPress: () => void;
  savedLabel: string;
  idleLabel: string;
  className?: string;
};

export default function PlaceSaveButton({
  isSaved,
  saving = false,
  onPress,
  savedLabel,
  idleLabel,
  className = '',
}: PlaceSaveButtonProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={saving}
      className={`flex-row items-center rounded-full border px-3 py-2 ${
        isSaved
          ? 'border-[#2ecc71] bg-green-50 dark:bg-green-900/20'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
      } ${className}`.trim()}
    >
      {saving ? (
        <ActivityIndicator size="small" color={isSaved ? '#2ecc71' : '#4c669f'} />
      ) : (
        <View>
          <Ionicons
            name={isSaved ? 'bookmark' : 'bookmark-outline'}
            size={13}
            color={isSaved ? '#2ecc71' : '#4c669f'}
          />
        </View>
      )}
      <Text
        className={`ml-1.5 text-xs font-semibold ${
          isSaved ? 'text-[#2ecc71]' : 'text-gray-700 dark:text-gray-200'
        }`}
      >
        {isSaved ? savedLabel : idleLabel}
      </Text>
    </TouchableOpacity>
  );
}
