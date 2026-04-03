import React from 'react';
import {
  Image,
  StyleProp,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { getImageUrl } from '@/services/api';

export interface EventInspirationCardEvent {
  id: string;
  title: string;
  coverUrl: string | null;
}

interface EventInspirationCardProps {
  event: EventInspirationCardEvent;
  imageHeight: number;
  onPress: () => void;
  cityLabel: string;
  placeLabel: string;
  dateLabel: string;
  priceLabel: string;
  style?: StyleProp<ViewStyle>;
}

const EVENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200';

export default function EventInspirationCard({
  event,
  imageHeight,
  onPress,
  cityLabel,
  placeLabel,
  dateLabel,
  priceLabel,
  style,
}: EventInspirationCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={style}
      className="mb-4 overflow-hidden rounded-[30px] border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900"
      activeOpacity={0.92}
    >
      <View className="relative">
        <Image
          source={{ uri: getImageUrl(event.coverUrl) || EVENT_PLACEHOLDER }}
          className="w-full bg-gray-200 dark:bg-gray-800"
          style={{ height: imageHeight }}
          resizeMode="cover"
        />

        {cityLabel ? (
          <View className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1.5">
            <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
              {cityLabel}
            </Text>
          </View>
        ) : null}

        <View className="absolute right-3 top-3 rounded-full bg-black/55 px-3 py-1.5">
          <Text className="text-[10px] font-semibold text-white">{priceLabel}</Text>
        </View>

        <View className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1.5">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={10} color="#ffffff" />
            <Text className="ml-1 text-[10px] font-semibold text-white">{dateLabel}</Text>
          </View>
        </View>
      </View>

      <View className="p-4">
        <Text className="text-base font-bold text-gray-900 dark:text-white" numberOfLines={2}>
          {event.title}
        </Text>

        <View className="mt-2 flex-row items-center">
          <Ionicons name="location-outline" size={13} color="#4c669f" />
          <Text
            className="ml-1.5 flex-1 text-sm text-gray-500 dark:text-gray-400"
            numberOfLines={1}
          >
            {placeLabel}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}
