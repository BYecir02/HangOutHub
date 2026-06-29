import React from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import MediaFrame from '@/shared/ui/MediaFrame';
import PressableScale from '@/shared/ui/PressableScale';
import PlaceCoverFallback from '@/features/places/components/PlaceCoverFallback';
import { getImageUrl } from '@/services/api';
import RatingDisplay from '@/shared/ui/primitives/RatingDisplay';

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
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  shouldPlay?: boolean;
  adaptiveHeight?: boolean;
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
  borderColor,
  style,
  shouldPlay = false,
  adaptiveHeight = true,
}: PlaceInspirationCardProps) {
  const isDark = useColorScheme() === 'dark';
  const cityLabel = place.City?.name || '';
  const ratingLabel =
    typeof place.avgRating === 'number' && place.avgRating > 0
      ? place.avgRating.toFixed(1)
      : '';
  const coverUrl = getImageUrl(place.coverUrl);

  return (
    <PressableScale
      onPress={onPress}
      style={[
        style,
        borderColor
          ? {
              borderColor,
              borderWidth: 2,
            }
          : undefined,
      ]}
      className="mb-3 overflow-hidden rounded-[22px] border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900"
    >
      <View className="relative">
        {coverUrl ? (
          <MediaFrame
            source={coverUrl}
            className="w-full bg-gray-200 dark:bg-gray-800"
            shouldPlay={shouldPlay}
            muted
            loop
            showControls={false}
            adaptiveHeight={adaptiveHeight}
            minHeight={adaptiveHeight ? 100 : imageHeight}
            maxHeight={380}
            style={adaptiveHeight ? undefined : { height: imageHeight }}
          />
        ) : (
          <PlaceCoverFallback
            className="w-full"
            style={{ height: imageHeight }}
            logoSize={Math.max(44, Math.min(72, Math.round(imageHeight * 0.28)))}
          />
        )}

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
              <ActivityIndicator size="small" color={isSaved ? '#2ecc71' : '#ff4757'} />
            ) : (
              <Ionicons
                name={isSaved ? 'bookmark' : 'bookmark-outline'}
                size={18}
                color={isSaved ? '#2ecc71' : '#ff4757'}
              />
            )}
          </TouchableOpacity>
        ) : null}

        <View className="absolute bottom-3 right-3">
          <RatingDisplay
            value={typeof place.avgRating === 'number' ? place.avgRating : null}
            label={ratingLabel || fallbackNewLabel}
            size="sm"
            tone="neutral"
            variant="solid"
          />
        </View>
      </View>

      <View className="overflow-hidden rounded-b-[22px]">
        <BlurView
          intensity={isDark ? 28 : 36}
          tint={isDark ? 'dark' : 'light'}
          className="px-4 py-4"
        >
          <Text className="text-base font-bold text-gray-900 dark:text-white" numberOfLines={2}>
            {place.name}
          </Text>

          {cityLabel || place.address ? (
            <View className="mt-2 flex-row items-center">
              <Ionicons name="location-outline" size={13} color={isDark ? '#ff7a45' : '#ff4757'} />
              <Text
                className="ml-1.5 flex-1 text-sm text-gray-600 dark:text-gray-300"
                numberOfLines={1}
              >
                {cityLabel || place.address}
              </Text>
            </View>
          ) : null}
        </BlurView>
        <View
          pointerEvents="none"
          className={isDark ? 'absolute inset-0 bg-black/30' : 'absolute inset-0 bg-white/30'}
        />
      </View>
    </PressableScale>
  );
}
