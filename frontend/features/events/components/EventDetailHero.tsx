import React from 'react';
import { Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import MediaFrame from '@/shared/ui/MediaFrame';

type EventDetailHeroProps = {
  heroImage: string;
  heroIsVideo: boolean;
  heroMuted: boolean;
  onToggleHeroMuted: () => void;
  cityLabel: string;
  priceLabel: string;
  publicationsLoaded: boolean;
  publicationsCount: number;
  publicationsCtaLabel: string;
  onOpenPublications: () => void;
  mediaMuteLabel: string;
  mediaUnmuteLabel: string;
};

export default function EventDetailHero({
  heroImage,
  heroIsVideo,
  heroMuted,
  onToggleHeroMuted,
  cityLabel,
  priceLabel,
  publicationsLoaded,
  publicationsCount,
  publicationsCtaLabel,
  onOpenPublications,
  mediaMuteLabel,
  mediaUnmuteLabel,
}: EventDetailHeroProps) {
  const { height: screenHeight } = useWindowDimensions();
  const heroBadgeBottom = Math.max(24, Math.min(48, Math.round(screenHeight * 0.035)));

  return (
    <View className="relative mt-10 mx-4 overflow-hidden rounded-[34px] bg-gray-100 shadow-lg dark:bg-black">
      <MediaFrame
        source={heroImage}
        className="w-full"
        style={{ borderRadius: 34, overflow: 'hidden' }}
        shouldPlay
        muted={heroMuted}
        loop
        showControls
        adaptiveHeight
        minHeight={280}
        maxHeight={480}
      />

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.82)']}
        locations={[0, 0.62, 1]}
        className="absolute inset-x-0 bottom-0 h-44"
      />

      <View className="absolute inset-x-0 top-0 flex-row items-start justify-end px-5 pt-6">
        {heroIsVideo ? (
          <TouchableOpacity
            onPress={onToggleHeroMuted}
            className="rounded-full bg-black/45 p-3"
            accessibilityRole="button"
            accessibilityLabel={heroMuted ? mediaUnmuteLabel : mediaMuteLabel}
          >
            <Ionicons
              name={heroMuted ? 'volume-mute' : 'volume-high'}
              size={20}
              color="#fff"
            />
          </TouchableOpacity>
        ) : null}
      </View>

      <View className="absolute inset-x-0 px-5" style={{ bottom: heroBadgeBottom }}>
        <View className="flex-row items-center justify-between gap-3">
          <View className="max-w-[72%] flex-row flex-wrap items-center gap-2">
            <View className="rounded-full bg-black/55 px-3 py-2">
              <Text className="text-xs font-semibold text-white">{cityLabel}</Text>
            </View>
            <View className="rounded-full bg-black/55 px-3 py-2">
              <Text className="text-xs font-semibold text-white">{priceLabel}</Text>
            </View>
          </View>

          <TouchableOpacity
            onPress={onOpenPublications}
            className="relative rounded-full bg-black/45 p-3 shadow-lg"
            accessibilityRole="button"
            accessibilityLabel={publicationsCtaLabel}
          >
            <Ionicons name="apps-outline" size={22} color="#fff" />
            {publicationsLoaded && publicationsCount > 0 ? (
              <View className="absolute -right-1 -top-1 min-w-[18px] rounded-full bg-red-500 px-1 py-0.5">
                <Text className="text-center text-[10px] font-bold text-white">
                  {publicationsCount > 99 ? '99+' : String(publicationsCount)}
                </Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}