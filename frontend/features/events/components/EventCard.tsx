import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import MediaFrame from '@/shared/ui/MediaFrame';
import PriceDisplay from '@/shared/ui/primitives/PriceDisplay';

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
      className="mr-5 w-64 overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
      activeOpacity={0.85}
    >
      <View className="relative">
        <MediaFrame
          source={imageUrl}
          className="h-36 w-full bg-gray-200 dark:bg-gray-800"
        />

        <View className="absolute right-3 top-3">
          <PriceDisplay label={price} size="sm" tone="brand" variant="solid" />
        </View>

        <View className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1">
          <Text className="text-[10px] font-semibold uppercase tracking-[0.16em] text-white" numberOfLines={1}>
            {date}
          </Text>
        </View>
      </View>

      <View className="p-3.5">
        <Text className="mb-1 text-base font-bold text-gray-900 dark:text-white" numberOfLines={1}>
          {title}
        </Text>

        <View className="flex-row items-center">
          <Ionicons name="location-outline" size={14} color="#9ca3af" />
          <Text className="ml-1 flex-1 text-xs text-gray-500 dark:text-gray-400" numberOfLines={1}>
            {location}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
