import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import MediaFrame from '@/components/ui/MediaFrame';

interface PlaceCardProps {
  name: string;
  location: string;
  imageUrl: string;
  rating?: number; // Optionnel
  onPress: () => void;
}

export default function PlaceCard({ name, location, imageUrl, rating, onPress }: PlaceCardProps) {
  return (
    <TouchableOpacity 
      onPress={onPress}
      className="bg-white dark:bg-gray-900 p-3 rounded-2xl mr-3 border border-gray-100 dark:border-gray-800 shadow-sm w-40"
      activeOpacity={0.7}
    >
      {/* Conteneur Image avec Badge Note */}
      <View className="relative">
        <MediaFrame
          source={imageUrl}
          className="w-full h-28 rounded-xl mb-2 bg-gray-200 dark:bg-gray-800"
        />
        
        {/* Badge Note (Si rating existe) */}
        {typeof rating === 'number' && !Number.isNaN(rating) ? (
          <View className="absolute top-2 right-2 bg-white/90 dark:bg-black/60 px-1.5 py-0.5 rounded-md flex-row items-center shadow-sm">
            <Ionicons name="star" size={10} color="#f59e0b" />
            <Text className="text-[10px] font-bold ml-0.5 text-gray-800 dark:text-white">{rating}</Text>
          </View>
        ) : null}
      </View>

      {/* Textes */}
      <Text className="font-bold text-gray-800 dark:text-white text-sm" numberOfLines={1}>
        {name}
      </Text>
      <View className="flex-row items-center mt-0.5">
        <Ionicons name="location-outline" size={10} color="#9ca3af" />
        <Text className="text-gray-500 text-xs ml-0.5" numberOfLines={1}>
          {location}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
