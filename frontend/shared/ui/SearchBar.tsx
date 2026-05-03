import React from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BottomSheetTextInput } from '@gorhom/bottom-sheet';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { uiTokens } from '@/theme/tokens';

interface SearchBarProps {
  placeholder?: string;
  onFilterPress?: () => void;
  value?: string;
  onChangeText?: (text: string) => void;
  autoFocus?: boolean;
  useBottomSheetInput?: boolean;
}

export default function SearchBar({ 
  placeholder = "Rechercher...", 
  onFilterPress,
  value,
  onChangeText,
  autoFocus = false,
  useBottomSheetInput = false,
}: SearchBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const InputComponent = useBottomSheetInput ? BottomSheetTextInput : TextInput;

  return (
    <View style={{ paddingHorizontal: uiTokens.spacing.screenX }}>
      <View
        className="flex-row items-center bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
        style={{
          borderRadius: uiTokens.radius.lg,
          paddingHorizontal: uiTokens.spacing.cardPadding,
          paddingVertical: 12,
          borderWidth: uiTokens.borderWidth.hairline,
        }}
      >
        <Ionicons
          name="search-outline"
          size={uiTokens.size.iconMd}
          color={isDark ? '#9ca3af' : '#999'}
        />
        <InputComponent 
          className="flex-1 ml-3 text-base text-gray-800 dark:text-white"
          placeholder={placeholder}
          placeholderTextColor={isDark ? "#666" : "#999"}
          value={value}
          onChangeText={onChangeText}
          autoFocus={autoFocus}
        />
        {onFilterPress && (
          <TouchableOpacity
            onPress={onFilterPress}
            className="ml-2 bg-white p-1.5 shadow-sm dark:bg-gray-800"
            style={{ borderRadius: uiTokens.radius.sm }}
          >
            <Ionicons name="options-outline" size={uiTokens.size.iconSm} color="#4c669f" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
