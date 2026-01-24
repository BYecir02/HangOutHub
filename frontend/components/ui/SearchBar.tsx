import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SearchBarProps {
  placeholder?: string;
  onFilterPress?: () => void;
}

export default function SearchBar({ 
  placeholder = "Rechercher un événement, un lieu...", 
  onFilterPress 
}: SearchBarProps) {
  return (
    <View className="px-5 mt-4">
      <View className="flex-row items-center bg-white rounded-2xl px-4 py-3 shadow-sm border border-gray-100">
        <Ionicons name="search-outline" size={20} color="#999" />
        <Text className="text-gray-400 ml-3 flex-1 text-base">
          {placeholder}
        </Text>
        <TouchableOpacity onPress={onFilterPress} className="bg-blue-50 p-2 rounded-lg">
          <Ionicons name="options-outline" size={20} color="#4c669f" />
        </TouchableOpacity>
      </View>
    </View>
  );
}