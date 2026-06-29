import React from 'react';
import {
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { BlurView } from 'expo-blur';

import { getImageUrl } from '@/services/api';
import MediaFrame from '@/shared/ui/MediaFrame';
import PressableScale from '@/shared/ui/PressableScale';
import PriceDisplay from '@/shared/ui/primitives/PriceDisplay';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';

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
        <MediaFrame
          source={getImageUrl(event.coverUrl) || EVENT_PLACEHOLDER}
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

        <View
          pointerEvents="box-none"
          className="absolute left-3 right-3 top-3 flex-col"
        >
          <View className="self-end flex-shrink-0">
            <PriceDisplay label={priceLabel} size="sm" tone="brand" variant="solid" />
          </View>
        </View>
      </View>

      <View className="overflow-hidden rounded-b-[22px]">
        <BlurView
          intensity={isDark ? 28 : 36}
          tint={isDark ? 'dark' : 'light'}
          className="px-4 py-4"
        >
          <Text className="text-base font-bold text-gray-900 dark:text-white" numberOfLines={2}>
            {event.title}
          </Text>

          <Text
            className="mt-1.5 text-sm text-gray-600 dark:text-gray-300"
            numberOfLines={1}
          >
            {[dateLabel, cityLabel || placeLabel].filter(Boolean).join('  ·  ')}
          </Text>
        </BlurView>
        <View
          pointerEvents="none"
          className={isDark ? 'absolute inset-0 bg-black/30' : 'absolute inset-0 bg-white/30'}
        />
      </View>
    </PressableScale>
  );
}
