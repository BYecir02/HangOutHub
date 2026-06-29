import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image as RNImage, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import MediaFrame from '@/shared/ui/MediaFrame';
import FriendsAttendingRow from '@/shared/ui/FriendsAttendingRow';
import type { FriendAttendee } from '@/services/social/activity';

type EventDetailHeroProps = {
  heroImage: string;
  heroIsVideo: boolean;
  heroMuted: boolean;
  onToggleHeroMuted: () => void;
  priceLabel: string;
  publicationsLoaded: boolean;
  publicationsCount: number;
  publicationsCtaLabel: string;
  onOpenPublications: () => void;
  mediaMuteLabel: string;
  mediaUnmuteLabel: string;
  friendsAttending?: FriendAttendee[];
  isAttending?: boolean;
  attendingLoading?: boolean;
  onToggleAttend?: () => void;
};

export default function EventDetailHero({
  heroImage,
  heroIsVideo,
  heroMuted,
  onToggleHeroMuted,
  priceLabel,
  publicationsLoaded,
  publicationsCount,
  publicationsCtaLabel,
  onOpenPublications,
  mediaMuteLabel,
  mediaUnmuteLabel,
  friendsAttending = [],
  isAttending = false,
  attendingLoading = false,
  onToggleAttend,
}: EventDetailHeroProps) {
  const { height: screenHeight } = useWindowDimensions();
  const heroBadgeBottom = 16;
  const hasFriends = friendsAttending.length > 0;

  const [aspectRatio, setAspectRatio] = useState<number>(4 / 3);

  useEffect(() => {
    if (!heroImage || heroIsVideo) return;
    let cancelled = false;
    RNImage.getSize(
      heroImage,
      (w, h) => {
        if (!cancelled && w > 0 && h > 0) {
          setAspectRatio(Math.max(9 / 16, w / h));
        }
      },
      () => {},
    );
    return () => { cancelled = true; };
  }, [heroImage, heroIsVideo]);

  return (
    <View
      className="relative w-full overflow-hidden bg-gray-100 dark:bg-black mt-10"
      style={{ aspectRatio }}
    >
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

      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.88)']}
        locations={[0, 0.55, 1]}
        className="absolute inset-x-0 bottom-0"
        style={{ height: hasFriends || onToggleAttend ? 160 : 140 }}
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
        {/* Amis qui y vont */}
        {hasFriends ? (
          <View className="mb-3">
            <FriendsAttendingRow friends={friendsAttending} label="y vont" />
          </View>
        ) : null}

        <View className="flex-row items-center justify-between gap-3">
          <View className="flex-row flex-wrap items-center gap-2">
            <View className="rounded-full bg-black/55 px-3 py-2">
              <Text className="text-xs font-semibold text-white">{priceLabel}</Text>
            </View>

            {/* Bouton J'y vais */}
            {onToggleAttend ? (
              <TouchableOpacity
                onPress={attendingLoading ? undefined : onToggleAttend}
                className={`flex-row items-center rounded-full px-3 py-2 ${
                  isAttending ? 'bg-[#2ecc71]' : 'bg-white/20'
                }`}
                activeOpacity={0.8}
              >
                {attendingLoading ? (
                  <ActivityIndicator size={12} color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name={isAttending ? 'checkmark-circle' : 'add-circle-outline'}
                      size={14}
                      color="#fff"
                    />
                    <Text className="ml-1 text-xs font-semibold text-white">
                      {isAttending ? "J'y vais ✓" : "J'y vais"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Bouton "Publications" de l'evenement masque (reseau social en veille).
              Pour le reactiver : retirer le `false &&`. */}
          {false && (
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
          )}
        </View>
      </View>
    </View>
  );
}
