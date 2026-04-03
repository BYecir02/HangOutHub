import React from 'react';
import {
  ActivityIndicator,
  StyleProp,
  Text,
  TouchableOpacity,
  View,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import MediaFrame from '@/components/ui/MediaFrame';
import { getImageUrl } from '@/services/api';

export interface PlaceInspirationCardPlace {
  id: string;
  name: string;
  coverUrl: string | null;
  avgRating?: number | null;
  City?: {
    name?: string | null;
    country?: string | null;
  } | null;
  address?: string | null;
}

interface PlaceInspirationCardProps {
  place: PlaceInspirationCardPlace;
  imageHeight: number;
  onPress: () => void;
  fallbackNewLabel: string;
  isSaved?: boolean;
  onToggleSave?: () => void;
  saving?: boolean;
  showSaveButton?: boolean;
  style?: StyleProp<ViewStyle>;
  shouldPlay?: boolean;
}

export default function PlaceInspirationCard({
  place,
  imageHeight,
  onPress,
  fallbackNewLabel,
  isSaved = false,
  onToggleSave,
  saving = false,
  showSaveButton = true,
  style,
  shouldPlay = false,
}: PlaceInspirationCardProps) {
  const cityLabel = place.City?.name || '';
  const ratingLabel =
    typeof place.avgRating === 'number' && place.avgRating > 0
      ? place.avgRating.toFixed(1)
      : '';

  return (
    <TouchableOpacity
      onPress={onPress}
      style={style}
      className="mb-4 overflow-hidden rounded-[30px] border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900"
      activeOpacity={0.92}
    >
      <View className="relative">
        <MediaFrame
          source={
            getImageUrl(place.coverUrl) ||
            'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200'
          }
          className="w-full bg-gray-200 dark:bg-gray-800"
          shouldPlay={shouldPlay}
          muted
          loop
          showControls={false}
          style={{ height: imageHeight }}
        />
        {cityLabel ? (
          <View className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1.5">
            <Text className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white">
              {cityLabel}
            </Text>
          </View>
        ) : null}

        <View className="absolute bottom-3 right-3 rounded-full bg-black/55 px-2 py-1">
          <View className="flex-row items-center">
            <Ionicons name="star" size={10} color="#f59e0b" />
            <Text className="ml-1 text-[10px] font-semibold text-white">
              {ratingLabel || fallbackNewLabel}
            </Text>
          </View>
        </View>

        {showSaveButton && onToggleSave ? (
          <TouchableOpacity
            onPress={onToggleSave}
            disabled={saving}
            className={`absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-2xl border ${
              isSaved
                ? 'border-[#2ecc71] bg-green-50/95 dark:bg-green-900/20'
                : 'border-white/80 bg-white/95 dark:border-gray-700 dark:bg-gray-800'
            }`}
          >
            {saving ? (
              <ActivityIndicator size="small" color={isSaved ? '#2ecc71' : '#4c669f'} />
            ) : (
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={isSaved ? '#2ecc71' : '#4c669f'}
              />
            )}
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="p-4">
        <Text className="text-base font-bold text-gray-900 dark:text-white" numberOfLines={2}>
          {place.name}
        </Text>
      </View>
    </TouchableOpacity>
  );
}
