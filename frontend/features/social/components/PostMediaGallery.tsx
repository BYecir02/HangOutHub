import React, { memo, useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

import MediaFrame from '@/shared/ui/MediaFrame';
import { isVideoUrl } from '@/services/shared/media';
import { getImageUrl, storage } from '../../../services/api';

const FEED_VIDEO_SOUND_KEY = 'socialFeedVideoMuted';

interface PostMediaGalleryProps {
  mediaUrls: string[];
  shouldPlayMedia?: boolean;
  onPressMedia?: (index: number) => void;
  compactLayout?: boolean;
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

function PostMediaGallery({
  mediaUrls,
  shouldPlayMedia = false,
  onPressMedia,
  compactLayout = false,
}: PostMediaGalleryProps) {
  const [isMuted, setIsMuted] = useState(true);
  const [containerWidth, setContainerWidth] = useState(0);
  const [activeIndex, setActiveIndex] = useState(0);
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

  useEffect(() => {
    setActiveIndex(0);
  }, [resolvedMedia]);

  if (resolvedMedia.length === 0) {
    return null;
  }

  const containerClassName = 'mt-4 overflow-hidden bg-gray-100 dark:bg-gray-800';
  const mediaStyle = compactLayout ? { aspectRatio: 4 / 5 } : undefined;
  const slideHeightStyle = compactLayout ? { aspectRatio: 4 / 5 } : { aspectRatio: 1 };
  const canCarousel = resolvedMedia.length > 1;

  const renderSingleMedia = () => {
    const [uri] = resolvedMedia;
    const isVideo = isVideoUrl(uri);

    return (
      <Pressable
        onPress={onPressMedia ? () => onPressMedia(0) : undefined}
        className={containerClassName}
      >
        <MediaFrame
          source={uri}
          mediaType={isVideo ? 'video' : 'image'}
          className="w-full"
          style={mediaStyle}
          adaptiveHeight={!compactLayout}
          minHeight={220}
          maxHeight={440}
          shouldPlay={shouldPlayMedia}
          muted={isMuted}
          loop
          showControls={false}
        />
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
  };

  const renderCarouselMedia = () => {
    const slideWidth = containerWidth > 0 ? containerWidth : 0;
    const slideStyle = slideWidth > 0 ? { width: slideWidth } : { width: '100%' as const };

    return (
      <View
        className={containerClassName}
        onLayout={(event) => {
          setContainerWidth(event.nativeEvent.layout.width);
        }}
      >
        <FlatList
          data={resolvedMedia}
          keyExtractor={(item, index) => `${item}-${index}`}
          horizontal
          pagingEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          decelerationRate="fast"
          snapToAlignment="start"
          disableIntervalMomentum
          onMomentumScrollEnd={(event) => {
            const index = Math.round(
              event.nativeEvent.contentOffset.x /
                Math.max(event.nativeEvent.layoutMeasurement.width, 1),
            );
            setActiveIndex(index);
          }}
          renderItem={({ item, index }) => {
            const isVideo = isVideoUrl(item);

            return (
              <Pressable
                onPress={onPressMedia ? () => onPressMedia(index) : undefined}
                style={slideStyle}
                className="overflow-hidden bg-gray-100 dark:bg-gray-800"
              >
                <MediaFrame
                  source={item}
                  mediaType={isVideo ? 'video' : 'image'}
                  className="w-full"
                  style={slideHeightStyle}
                  adaptiveHeight={false}
                  shouldPlay={shouldPlayMedia && activeIndex === index}
                  muted={isMuted}
                  loop
                  showControls={false}
                />
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
          }}
        />

        {resolvedMedia.length > 1 ? (
          <View className="absolute bottom-2 left-0 right-0 z-10 flex-row justify-center gap-1.5">
            {resolvedMedia.map((_, index) => (
              <View
                key={`indicator-${index}`}
                className={`h-1.5 rounded-full ${index === activeIndex ? 'w-5 bg-white' : 'w-1.5 bg-white/50'}`}
              />
            ))}
          </View>
        ) : null}
      </View>
    );
  };

  if (resolvedMedia.length === 1) {
    return renderSingleMedia();
  }

  return renderCarouselMedia();
}

export default memo(PostMediaGallery);
