import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface HeaderProps {
  location?: string;
  onMenuPress?: () => void;
  onNotificationPress?: () => void;
  onLocationPress?: () => void;
}

export default function Header({ 
  location = "Cotonou, Bénin",
  onMenuPress,
  onNotificationPress,
  onLocationPress
}: HeaderProps) {
  return (
    <View className="bg-white px-5 pt-14 pb-4 shadow-sm flex-row justify-between items-center">
      {/* Bouton Menu Hamburger */}
      <TouchableOpacity className="p-2" onPress={onMenuPress}>
        <Ionicons name="menu-outline" size={28} color="#333" />
      </TouchableOpacity>

      {/* Localisation Centrale */}
      <TouchableOpacity className="flex-row items-center" onPress={onLocationPress}>
        <View className="items-center">
          <Text className="text-gray-400 text-[10px] font-medium uppercase tracking-widest">
            Ma Position
          </Text>
          <View className="flex-row items-center">
            <Text className="text-gray-800 font-bold text-base mr-1">{location}</Text>
            <Ionicons name="chevron-down" size={16} color="#4c669f" />
          </View>
        </View>
      </TouchableOpacity>

      {/* Notifications */}
      <TouchableOpacity 
        onPress={onNotificationPress}
        className="h-10 w-10 justify-center items-center"
      >
        <Ionicons name="notifications-outline" size={24} color="#333" />
        {/* Petit point rouge pour indiquer une nouvelle notification */}
        <View className="absolute top-2 right-2 h-2.5 w-2.5 bg-red-500 rounded-full border-2 border-white" />
      </TouchableOpacity>
    </View>
  );
}