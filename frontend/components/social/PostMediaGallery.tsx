import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import MediaFrame from '@/components/ui/MediaFrame';
import { isVideoUrl } from '@/services/media';
import { getImageUrl, storage } from '../../services/api';

const FEED_VIDEO_SOUND_KEY = 'socialFeedVideoMuted';

interface PostMediaGalleryProps {
  mediaUrls: string[];
  shouldPlayMedia?: boolean;
  onPressMedia?: (index: number) => void;
}

function MediaBadge({ label }: { label: string }) {
  return (
    <View className="absolute left-3 top-3 rounded-full bg-black/55 px-2.5 py-1">
      <Text className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
        {label}
      </Text>
    </View>
  );
}

function SoundToggle({
  muted,
  onPress,
}: {
  muted: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className="absolute right-3 top-3 h-9 w-9 items-center justify-center rounded-full bg-black/55"
    >
      <Ionicons
        name={muted ? 'volume-mute-outline' : 'volume-high-outline'}
        size={18}
        color="#fff"
      />
    </Pressable>
  );
}

export default function PostMediaGallery({
  mediaUrls,
  shouldPlayMedia = false,
  onPressMedia,
}: PostMediaGalleryProps) {
  const [isMuted, setIsMuted] = useState(true);
  const resolvedMedia = useMemo(
    () => mediaUrls.map((uri) => getImageUrl(uri)).filter(Boolean) as string[],
    [mediaUrls],
  );

  useEffect(() => {
    let isMounted = true;

    const loadPreference = async () => {
      try {
        const storedValue = await storage.getItem(FEED_VIDEO_SOUND_KEY);
        if (!isMounted || storedValue === null) {
          return;
        }

        setIsMuted(storedValue !== 'false');
      } catch {
        if (isMounted) {
          setIsMuted(true);
        }
      }
    };

    void loadPreference();

    return () => {
      isMounted = false;
    };
  }, []);

  if (resolvedMedia.length === 0) {
    return null;
  }

  if (resolvedMedia.length === 1) {
    const [uri] = resolvedMedia;
    const isVideo = isVideoUrl(uri);

    return (
      <Pressable
        onPress={onPressMedia ? () => onPressMedia(0) : undefined}
        className="mt-4 overflow-hidden rounded-3xl bg-gray-100 dark:bg-gray-800"
      >
        <MediaFrame
          source={uri}
          mediaType={isVideo ? 'video' : 'image'}
          className="w-full"
          adaptiveHeight
          minHeight={220}
          maxHeight={440}
          shouldPlay={shouldPlayMedia}
          muted={isMuted}
          loop
          showControls={false}
        />
        <MediaBadge label={isVideo ? 'Video' : 'Photo'} />
        {isVideo ? (
          <SoundToggle
            muted={isMuted}
            onPress={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              void storage.setItem(FEED_VIDEO_SOUND_KEY, String(nextMuted));
            }}
          />
        ) : null}
      </Pressable>
    );
  }

  const heroMedia = resolvedMedia[0];
  const heroIsVideo = isVideoUrl(heroMedia);
  const remainingMedia = resolvedMedia.slice(1, 4);
  const extraCount = Math.max(0, resolvedMedia.length - 4);

  return (
    <View className="mt-4 gap-2">
      <Pressable
        onPress={onPressMedia ? () => onPressMedia(0) : undefined}
        className="overflow-hidden rounded-3xl bg-gray-100 dark:bg-gray-800"
      >
        <MediaFrame
          source={heroMedia}
          mediaType={heroIsVideo ? 'video' : 'image'}
          className="w-full"
          adaptiveHeight
          minHeight={220}
          maxHeight={440}
          shouldPlay={shouldPlayMedia}
          muted={isMuted}
          loop
          showControls={false}
        />
        <MediaBadge label={heroIsVideo ? 'Video' : 'Photo'} />
        {heroIsVideo ? (
          <SoundToggle
            muted={isMuted}
            onPress={() => {
              const nextMuted = !isMuted;
              setIsMuted(nextMuted);
              void storage.setItem(FEED_VIDEO_SOUND_KEY, String(nextMuted));
            }}
          />
        ) : null}
      </Pressable>

      {remainingMedia.length > 0 ? (
        <View className="flex-row gap-2">
          {remainingMedia.map((uri, index) => {
            const absoluteIndex = index + 1;
            const isVideo = isVideoUrl(uri);
            const isLastVisible = extraCount > 0 && index === remainingMedia.length - 1;

            return (
              <Pressable
                key={`${uri}-${absoluteIndex}`}
                onPress={onPressMedia ? () => onPressMedia(absoluteIndex) : undefined}
                className="flex-1 overflow-hidden rounded-2xl bg-gray-100 dark:bg-gray-800"
              >
                {isVideo ? (
                  <MediaFrame
                    source={uri}
                    mediaType="video"
                    className="w-full"
                    style={{ aspectRatio: 1 }}
                    shouldPlay={false}
                    muted={isMuted}
                    loop
                    showControls={false}
                  />
                ) : (
                  <Image
                    source={{ uri }}
                    style={{ width: '100%', aspectRatio: 1 }}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    transition={180}
                    recyclingKey={uri}
                  />
                )}
                {isLastVisible ? (
                  <View className="absolute inset-0 items-center justify-center bg-black/35">
                    <Text className="text-2xl font-bold text-white">+{extraCount}</Text>
                  </View>
                ) : null}
                <MediaBadge label={isVideo ? 'Video' : 'Photo'} />
                {isVideo ? (
                  <SoundToggle
                    muted={isMuted}
                    onPress={() => {
                      const nextMuted = !isMuted;
                      setIsMuted(nextMuted);
                      void storage.setItem(FEED_VIDEO_SOUND_KEY, String(nextMuted));
                    }}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
