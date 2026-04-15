import React from 'react';
import {
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { getImageUrl } from '@/services/api';
import MediaFrame from '@/components/ui/MediaFrame';
import PriceDisplay from '@/components/ui/primitives/PriceDisplay';
import { useColorScheme } from '@/hooks/use-color-scheme';

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
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
  shouldPlay?: boolean;
  adaptiveHeight?: boolean;
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
  borderColor,
  style,
  shouldPlay = false,
  adaptiveHeight = true,
}: EventInspirationCardProps) {
  const isDark = useColorScheme() === 'dark';

  return (
    <TouchableOpacity
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
      className="mb-3 overflow-hidden rounded-[30px] border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900"
      activeOpacity={0.92}
    >
      <View className="relative">
        <MediaFrame
          source={getImageUrl(event.coverUrl) || EVENT_PLACEHOLDER}
          className="w-full bg-gray-200 dark:bg-gray-800"
          shouldPlay={shouldPlay}
          muted
          loop
          showControls={false}
          adaptiveHeight={adaptiveHeight}
          minHeight={imageHeight}
          maxHeight={380}
          style={{ height: imageHeight }}
        />

        <View
          pointerEvents="box-none"
          className="absolute left-3 right-3 top-3 flex-col"
        >
          {cityLabel ? (
            <View className="max-w-[64%] self-start rounded-full bg-black/55 px-3 py-1.5">
              <Text
                className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white"
                numberOfLines={1}
              >
                {cityLabel}
              </Text>
            </View>
          ) : null}

          <View className="mt-1 self-end flex-shrink-0">
            <PriceDisplay label={priceLabel} size="sm" tone="brand" variant="solid" />
          </View>
        </View>

        <View className="absolute bottom-3 left-3 rounded-full bg-black/55 px-3 py-1.5">
          <View className="flex-row items-center">
            <Ionicons name="time-outline" size={10} color="#ffffff" />
            <Text className="ml-1 text-[10px] font-semibold text-white">{dateLabel}</Text>
          </View>
        </View>
      </View>

      <View className="overflow-hidden rounded-b-[30px]">
        <BlurView
          intensity={isDark ? 28 : 36}
          tint={isDark ? 'dark' : 'light'}
          className="px-4 py-4"
        >
          <Text className="text-base font-bold text-gray-900 dark:text-white" numberOfLines={2}>
            {event.title}
          </Text>

          <View className="mt-2 flex-row items-center">
            <Ionicons name="location-outline" size={13} color={isDark ? '#93a8d0' : '#4c669f'} />
            <Text
              className="ml-1.5 flex-1 text-sm text-gray-600 dark:text-gray-300"
              numberOfLines={1}
            >
              {placeLabel}
            </Text>
          </View>
        </BlurView>
        <View
          pointerEvents="none"
          className={isDark ? 'absolute inset-0 bg-black/30' : 'absolute inset-0 bg-white/30'}
        />
      </View>
    </TouchableOpacity>
  );
}
