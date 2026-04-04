import React, { useEffect, useMemo, useState } from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { useEventListener } from 'expo';
import { VideoView, useVideoPlayer } from 'expo-video';

import { isVideoUrl } from '@/services/media';

interface MediaFrameProps {
  source: string;
  className?: string;
  style?: StyleProp<ViewStyle>;
  shouldPlay?: boolean;
  muted?: boolean;
  loop?: boolean;
  showControls?: boolean;
  fallbackLabel?: string;
  adaptiveHeight?: boolean;
  minHeight?: number;
  maxHeight?: number;
  fallbackAspectRatio?: number;
}

export default function MediaFrame({
  source,
  className,
  style,
  shouldPlay = false,
  muted = true,
  loop = true,
  showControls = false,
  fallbackLabel,
  adaptiveHeight = false,
  minHeight = 180,
  maxHeight = 520,
  fallbackAspectRatio = 4 / 5,
}: MediaFrameProps) {
  const isVideo = isVideoUrl(source);
  const [measuredWidth, setMeasuredWidth] = useState(0);
  const [measuredAspectRatio, setMeasuredAspectRatio] = useState<number | null>(
    null,
  );
  const videoSource = isVideo ? { uri: source } : null;
  const player = useVideoPlayer(videoSource);

  useEffect(() => {
    if (!adaptiveHeight || isVideo || !source) {
      return;
    }

    let isMounted = true;

    Image.getSize(
      source,
      (width, height) => {
        if (!isMounted || !width || !height) {
          return;
        }

        setMeasuredAspectRatio(width / height);
      },
      () => {
        if (isMounted) {
          setMeasuredAspectRatio(null);
        }
      },
    );

    return () => {
      isMounted = false;
    };
  }, [adaptiveHeight, isVideo, source]);

  useEffect(() => {
    if (!isVideo) {
      return;
    }

    player.loop = loop;
    player.muted = muted;

    if (shouldPlay) {
      void player.play();
      return;
    }

    player.pause();
  }, [isVideo, loop, muted, player, shouldPlay]);

  useEventListener(player, 'sourceLoad', ({ availableVideoTracks }) => {
    if (!adaptiveHeight || !isVideo) {
      return;
    }

    const primaryTrack = availableVideoTracks.find(
      (track) => track.size?.width && track.size?.height,
    );

    if (primaryTrack?.size?.width && primaryTrack?.size?.height) {
      setMeasuredAspectRatio(primaryTrack.size.width / primaryTrack.size.height);
    }
  });

  const resolvedAspectRatio = useMemo(() => {
    return measuredAspectRatio || fallbackAspectRatio;
  }, [fallbackAspectRatio, measuredAspectRatio]);

  const adaptiveStyle = adaptiveHeight
    ? {
        minHeight,
        height:
          measuredWidth > 0
            ? Math.max(
                minHeight,
                Math.min(maxHeight, measuredWidth / resolvedAspectRatio),
              )
            : minHeight,
      }
    : null;

  return (
    <View
      className={`overflow-hidden ${className ?? ''}`.trim()}
      style={[style, adaptiveStyle]}
      onLayout={
        adaptiveHeight
          ? (event) => {
              setMeasuredWidth(event.nativeEvent.layout.width);
            }
          : undefined
      }
    >
      {isVideo ? (
        <VideoView
          player={player}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          nativeControls={showControls}
        />
      ) : (
        <Image
          source={{ uri: source }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      )}
      {fallbackLabel ? (
        <View className="absolute inset-0 items-center justify-center bg-black/20">
          <Text className="text-xs font-semibold uppercase tracking-[0.2em] text-white">
            {fallbackLabel}
          </Text>
        </View>
      ) : null}
    </View>
  );
}
