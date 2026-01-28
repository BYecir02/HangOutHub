import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  location?: string;
  onNotificationPress?: () => void;
  onLocationPress?: () => void;
  onSearchPress?: () => void;
}

export default function Header({ 
  location = "Cotonou, Bénin",
  onNotificationPress,
  onLocationPress,
  onSearchPress
}: HeaderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="bg-white dark:bg-black px-5 pt-14 pb-4 shadow-sm flex-row justify-between items-center border-b border-gray-100 dark:border-gray-800">
      {/* Espace vide pour équilibrer le header et garder le titre centré */}
      <View className="w-20" />

      {/* Localisation Centrale */}
      <TouchableOpacity className="flex-row items-center" onPress={onLocationPress}>
        <View className="items-center">
          <Text className="text-gray-400 dark:text-gray-500 text-[10px] font-medium uppercase tracking-widest">
            Ma Position
          </Text>
          <View className="flex-row items-center">
            <Text className="text-gray-800 dark:text-white font-bold text-base mr-1">{location}</Text>
            <Ionicons name="chevron-down" size={16} color="#4c669f" />
          </View>
        </View>
      </TouchableOpacity>

      {/* Actions à droite */}
      <View className="flex-row items-center">
        <TouchableOpacity 
          onPress={onSearchPress}
          className="h-10 w-10 justify-center items-center mr-1"
        >
          <Ionicons name="search-outline" size={24} color={isDark ? "#fff" : "#333"} />
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={onNotificationPress}
          className="h-10 w-10 justify-center items-center"
        >
          <Ionicons name="notifications-outline" size={24} color={isDark ? "#fff" : "#333"} />
          {/* Petit point rouge pour indiquer une nouvelle notification */}
          <View className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white dark:border-black" />
        </TouchableOpacity>
      </View>
    </View>
  );
}