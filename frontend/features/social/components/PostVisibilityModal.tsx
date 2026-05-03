import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomSheetModal from '@/shared/ui/BottomSheetModal';

export type PostVisibility = 'public' | 'friends' | 'private' | 'custom';

export type PostVisibilityOption = {
  id: PostVisibility;
  label: string;
  description: string;
  icon: keyof typeof Ionicons.glyphMap;
};

type PostVisibilityModalProps = {
  visible: boolean;
  selectedVisibility: PostVisibility;
  options: PostVisibilityOption[];
  selectedCustomCount: number;
  title: string;
  onClose: () => void;
  onSelect: (visibility: PostVisibility) => void;
  customLabelWithCount: (label: string, count: number) => string;
};

export default function PostVisibilityModal({
  visible,
  selectedVisibility,
  options,
  selectedCustomCount,
  title,
  onClose,
  onSelect,
  customLabelWithCount,
}: PostVisibilityModalProps) {
  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={title}
      maxHeight={560}
      contentMode="auto"
    >
      <View>
        {options.map((option) => (
          <TouchableOpacity
            key={option.id}
            onPress={() => onSelect(option.id)}
            className="flex-row items-center border-b border-gray-100 p-4 dark:border-gray-800"
          >
            <View
              className={`mr-4 rounded-full p-3 ${
                selectedVisibility === option.id
                  ? 'bg-blue-50 dark:bg-blue-900/30'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              <Ionicons
                name={option.icon}
                size={24}
                color={selectedVisibility === option.id ? '#4c669f' : 'gray'}
              />
            </View>
            <View className="flex-1">
              <Text
                className={`text-base font-bold ${
                  selectedVisibility === option.id
                    ? 'text-[#4c669f]'
                    : 'text-gray-800 dark:text-white'
                }`}
              >
                {option.id === 'custom' && selectedCustomCount > 0
                  ? customLabelWithCount(option.label, selectedCustomCount)
                  : option.label}
              </Text>
              <Text className="mt-0.5 text-xs text-gray-500">
                {option.description}
              </Text>
            </View>
            {selectedVisibility === option.id ? (
              <Ionicons
                name="checkmark-circle"
                size={24}
                color="#4c669f"
              />
            ) : null}
          </TouchableOpacity>
        ))}
      </View>
    </BottomSheetModal>
  );
}
