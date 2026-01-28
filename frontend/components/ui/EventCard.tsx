import React from 'react';
import { View, Text, Image, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EventCardProps {
  title: string;
  date: string;
  location: string;
  imageUrl: string;
  price: string;
  onPress: () => void;
}

export default function EventCard({ title, date, location, imageUrl, price, onPress }: EventCardProps) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      className="mr-5 bg-white dark:bg-gray-900 rounded-2xl w-64 shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden"
    >
      {/* Image avec Badge de prix */}
      <View className="relative">
        <Image 
          source={{ uri: imageUrl }} 
          className="w-full h-36"
          resizeMode="cover"
        />
        <View className="absolute top-3 right-3 bg-white/90 dark:bg-black/60 px-2 py-1 rounded-lg">
          <Text className="text-xs font-bold text-[#4c669f]">{price}</Text>
        </View>
      </View>

      {/* Infos */}
      <View className="p-3">
        <Text className="text-xs text-[#ff4757] font-bold mb-1 uppercase tracking-wider">
          {date}
        </Text>
        <Text className="text-lg font-bold text-gray-800 dark:text-white mb-1" numberOfLines={1}>
          {title}
        </Text>
        
        <View className="flex-row items-center">
          <Ionicons name="location-outline" size={14} color="#9ca3af" />
          <Text className="text-gray-400 text-xs ml-1" numberOfLines={1}>
            {location}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}