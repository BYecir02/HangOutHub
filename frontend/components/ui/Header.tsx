import React from 'react';
import { View, Text, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  location?: string;
  onNotificationPress?: () => void;
  onLocationPress?: () => void;
  onSearchPress?: () => void;
  notificationCount?: number;
}

export default function Header({ 
  location = "Cotonou, Benin",
  onNotificationPress,
  onLocationPress,
  onSearchPress,
  notificationCount = 0,
}: HeaderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const safeCount = Number.isFinite(notificationCount) ? notificationCount : 0;
  const badgeLabel = safeCount > 99 ? '99+' : String(safeCount);

  return (
    <View className="bg-white dark:bg-black px-5 pt-14 pb-4 shadow-sm flex-row justify-between items-center border-b border-gray-100 dark:border-gray-800">
      {/* Espace vide pour ÃƒÂ©quilibrer le header et garder le titre centrÃƒÂ© */}
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

      {/* Actions ÃƒÂ  droite */}
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
          {safeCount > 0 ? (
            <View className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 items-center justify-center border-2 border-white dark:border-black">
              <Text className="text-[10px] font-bold text-white">
                {badgeLabel}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
  );
}
