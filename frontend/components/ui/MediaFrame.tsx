import React from 'react';
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Video, ResizeMode } from 'expo-av';

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
}: MediaFrameProps) {
  const isVideo = isVideoUrl(source);

  return (
    <View className={`overflow-hidden ${className ?? ''}`.trim()} style={style}>
      {isVideo ? (
        <Video
          source={{ uri: source }}
          style={StyleSheet.absoluteFill}
          resizeMode={ResizeMode.COVER}
          shouldPlay={shouldPlay}
          isLooping={loop}
          isMuted={muted}
          useNativeControls={showControls}
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
