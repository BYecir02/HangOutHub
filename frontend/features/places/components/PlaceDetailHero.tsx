import React, { useEffect, useState } from 'react';
import { Image as RNImage, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import RatingDisplay from '@/shared/ui/primitives/RatingDisplay';
import MediaFrame from '@/shared/ui/MediaFrame';
import FriendsAttendingRow from '@/shared/ui/FriendsAttendingRow';
import type { FriendAttendee } from '@/services/social/activity';

import PlaceCoverFallback from './PlaceCoverFallback';

type PlaceDetailHeroProps = {
  heroImage: string;
  hasCover: boolean;
  heroIsVideo: boolean;
  heroMuted: boolean;
  onToggleHeroMuted: () => void;
  avgRating?: number | null;
  publicationsLoaded: boolean;
  publicationsCount: number;
  publicationsCtaLabel: string;
  onOpenPublications: () => void;
  mediaMuteLabel: string;
  mediaUnmuteLabel: string;
  friendsAttending?: FriendAttendee[];
};

// Fallback ratio (4:3) used while the real image dimensions load
const FALLBACK_RATIO = 4 / 3;
// Safety cap: portrait images won't exceed this ratio (width/height)
// e.g. 0.56 ≈ 9:16 — very tall but still reasonable for a hero
const MIN_RATIO = 9 / 16;

export default function PlaceDetailHero({
  heroImage,
  hasCover,
  heroIsVideo,
  heroMuted,
  onToggleHeroMuted,
  avgRating,
  publicationsLoaded,
  publicationsCount,
  publicationsCtaLabel,
  onOpenPublications,
  mediaMuteLabel,
  mediaUnmuteLabel,
  friendsAttending = [],
}: PlaceDetailHeroProps) {
  const { height: screenHeight } = useWindowDimensions();
  const heroBadgeBottom = Math.max(24, Math.min(48, Math.round(screenHeight * 0.035)));
  const hasFriends = friendsAttending.length > 0;

  // Natural aspect ratio of the cover image (width / height)
  const [aspectRatio, setAspectRatio] = useState<number>(FALLBACK_RATIO);

  useEffect(() => {
    if (!heroImage || heroIsVideo) return;

    let cancelled = false;
    RNImage.getSize(
      heroImage,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) {
          // Clamp at MIN_RATIO so extremely tall images don't overwhelm the screen
          setAspectRatio(Math.max(MIN_RATIO, w / h));
        }
      },
      () => { /* keep fallback on error */ },
    );
    return () => { cancelled = true; };
  }, [heroImage, heroIsVideo]);

  return (
    <View
      className="relative w-full overflow-hidden bg-gray-100 dark:bg-gray-900 mt-10"
      style={{ aspectRatio }}
    >
      {hasCover ? (
        <MediaFrame
          source={heroImage}
          className="w-full h-full"
          style={{ overflow: 'hidden' }}
          shouldPlay
          muted={heroMuted}
          loop
          showControls
          contentFit="cover"
        />
      ) : (
        <PlaceCoverFallback className="h-full w-full" logoSize={72} />
      )}

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.88)']}
        locations={[0, 0.55, 1]}
        className="absolute inset-x-0 bottom-0"
        style={{ height: hasFriends ? 160 : 140 }}
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
        {hasFriends ? (
          <View className="mb-3">
            <FriendsAttendingRow friends={friendsAttending} label="fréquentent ce lieu" />
          </View>
        ) : null}

        <View className="flex-row items-center justify-between gap-3">
          <View
            className="max-w-[72%] flex-row flex-wrap items-center gap-2"
            style={{ transform: [{ translateY: 8 }] }}
          >
            {typeof avgRating === 'number' && avgRating > 0 ? (
              <RatingDisplay
                value={avgRating}
                size="sm"
                tone="neutral"
                variant="solid"
                style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
                textStyle={{ color: '#fff' }}
              />
            ) : null}
          </View>

          {/* Bouton "Publications" du lieu masque temporairement (reseau social en veille).
              Pour le reactiver : retirer le `false &&`. */}
          {false && (
            <TouchableOpacity
              onPress={onOpenPublications}
              className="relative rounded-full bg-black/45 p-3 shadow-lg"
              style={{ transform: [{ translateY: 8 }] }}
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
          )}
        </View>
      </View>
    </View>
  );
}
