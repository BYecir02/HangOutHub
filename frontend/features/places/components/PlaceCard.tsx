import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import MediaFrame from '@/shared/ui/MediaFrame';
import PlaceCoverFallback from '@/features/places/components/PlaceCoverFallback';
import Badge from '@/shared/ui/primitives/Badge';
import RatingDisplay from '@/shared/ui/primitives/RatingDisplay';

interface PlaceCardProps {
  name: string;
  location: string;
  imageUrl?: string | null;
  rating?: number; // Optionnel
  badgeLabel?: string;
  badgeTone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
  fallbackRatingLabel?: string;
  showSaveButton?: boolean;
  isSaved?: boolean;
  saving?: boolean;
  onToggleSave?: () => void;
  onPress: () => void;
}

export default function PlaceCard({
  name,
  location,
  imageUrl,
  rating,
  badgeLabel,
  badgeTone = 'success',
  fallbackRatingLabel = 'New',
  showSaveButton = false,
  isSaved = false,
  saving = false,
  onToggleSave,
  onPress,
}: PlaceCardProps) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="mr-3 w-full overflow-hidden rounded-[20px] border border-gray-100 bg-white p-3 shadow-sm dark:border-gray-800 dark:bg-gray-900"
      activeOpacity={0.85}
    >
      <View className="flex-row">
        <View className="relative">
          {imageUrl ? (
            <MediaFrame
              source={imageUrl}
              className="h-28 w-28 rounded-2xl bg-gray-200 dark:bg-gray-800"
            />
          ) : (
            <PlaceCoverFallback className="h-28 w-28 rounded-2xl" logoSize={34} />
          )}

          {typeof rating === 'number' && !Number.isNaN(rating) ? (
            <View className="absolute right-2 top-2">
              <RatingDisplay
                value={rating}
                size="sm"
                tone="neutral"
                variant="solid"
                fallbackLabel={fallbackRatingLabel}
              />
            </View>
          ) : null}
        </View>

        <View className="ml-4 flex-1 justify-between py-1">
          <View>
            {badgeLabel ? (
              <Badge label={badgeLabel} tone={badgeTone} variant="soft" size="sm" />
            ) : null}

            <Text
              className={`${badgeLabel ? 'mt-3' : ''} text-lg font-bold text-gray-900 dark:text-white`}
              numberOfLines={2}
            >
              {name}
            </Text>

            <View className="mt-1 flex-row items-center">
              <Ionicons name="location-outline" size={12} color="#9ca3af" />
              <Text className="ml-1 flex-1 text-sm text-gray-500 dark:text-gray-400" numberOfLines={2}>
                {location}
              </Text>
            </View>
          </View>

          <View className="mt-3 flex-row items-center justify-between">
            <View />
            {showSaveButton && onToggleSave ? (
              <TouchableOpacity
                onPress={onToggleSave}
                disabled={saving}
                className={`h-8 w-8 items-center justify-center rounded-xl border ${
                  isSaved
                    ? 'border-[#2ecc71] bg-green-50 dark:bg-green-900/20'
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                {saving ? (
                  <ActivityIndicator size="small" color={isSaved ? '#2ecc71' : '#4c669f'} />
                ) : (
                  <Ionicons
                    name={isSaved ? 'bookmark' : 'bookmark-outline'}
                    size={16}
                    color={isSaved ? '#2ecc71' : '#4c669f'}
                  />
                )}
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}
