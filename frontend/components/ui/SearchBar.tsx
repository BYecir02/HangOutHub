import React from 'react';
import { View, TextInput, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  placeholder?: string;
  onFilterPress?: () => void;
  value?: string;
  onChangeText?: (text: string) => void;
  autoFocus?: boolean;
}

export default function SearchBar({ 
  placeholder = "Rechercher...", 
  onFilterPress,
  value,
  onChangeText,
  autoFocus = false
}: SearchBarProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="px-5">
      <View className="flex-row items-center bg-gray-100 dark:bg-gray-900 rounded-2xl px-4 py-3 border border-gray-200 dark:border-gray-800">
        <Ionicons name="search-outline" size={20} color={isDark ? "#9ca3af" : "#999"} />
        <TextInput 
          className="flex-1 ml-3 text-base text-gray-800 dark:text-white"
          placeholder={placeholder}
          placeholderTextColor={isDark ? "#666" : "#999"}
          value={value}
          onChangeText={onChangeText}
          autoFocus={autoFocus}
        />
        {onFilterPress && (
          <TouchableOpacity onPress={onFilterPress} className="bg-white dark:bg-gray-800 p-1.5 rounded-lg ml-2 shadow-sm">
            <Ionicons name="options-outline" size={18} color="#4c669f" />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}