import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

import MediaFrame from '@/shared/ui/MediaFrame';
import { isVideoUrl } from '@/services/shared/media';

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

export function FocusMessage({
  active,
  pressed,
  style,
  children,
}: {
  active: boolean;
  pressed?: boolean;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const scale = useSharedValue(1);

  useEffect(() => {
    if (pressed) {
      scale.value = withTiming(0.97, { duration: 90 });
      return;
    }
    scale.value = withTiming(active ? 1.03 : 1, { duration: 140 });
  }, [active, pressed, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

export function MessageImage({
  uri,
  onPress,
  onLongPress,
  onPressIn,
  onPressOut,
  width,
  height,
  overlayLabel,
}: {
  uri: string;
  onPress: () => void;
  onLongPress?: () => void;
  onPressIn?: () => void;
  onPressOut?: () => void;
  width: number;
  height?: number;
  overlayLabel?: string;
}) {
  const resolvedHeight = height ?? width;
  const video = isVideoUrl(uri);

  return (
    <TouchableOpacity
      onPress={onPress}
      onLongPress={onLongPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      delayLongPress={350}
      className="overflow-hidden rounded-xl"
    >
      <View
        style={{ width, height: resolvedHeight }}
        className="items-center justify-center rounded-xl bg-gray-200 dark:bg-gray-800"
      >
        {video ? (
          <>
            <MediaFrame
              source={uri}
              mediaType="video"
              shouldPlay={false}
              showControls={false}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
            />
            <View className="absolute inset-0 items-center justify-center bg-black/20">
              <View className="h-10 w-10 items-center justify-center rounded-full bg-black/40">
                <Ionicons name="play" size={18} color="#fff" />
              </View>
            </View>
          </>
        ) : (
          <Image
            source={{ uri }}
            style={{ width, height: resolvedHeight, borderRadius: 12 }}
            resizeMode="cover"
          />
        )}
        {overlayLabel ? (
          <View className="absolute inset-0 items-center justify-center bg-black/50">
            <Text className="text-lg font-semibold text-white">{overlayLabel}</Text>
          </View>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

export function ZoomableImage({
  uri,
  width,
  height,
  onClose,
  onLongPress,
}: {
  uri: string;
  width: number;
  height: number;
  onClose: () => void;
  onLongPress: () => void;
}) {
  const isVideo = isVideoUrl(uri);

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  useEffect(() => {
    scale.value = 1;
    savedScale.value = 1;
  }, [uri, savedScale, scale]);

  const pinch = Gesture.Pinch()
    .onBegin(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((event) => {
      scale.value = clamp(savedScale.value * event.scale, 1, 4);
    })
    .onEnd(() => {
      if (scale.value < 1) {
        scale.value = withTiming(1);
      }
    });

  const tap = Gesture.Tap().onEnd((_event, success) => {
    if (success) {
      runOnJS(onClose)();
    }
  });

  const longPress = Gesture.LongPress()
    .minDuration(350)
    .onStart(() => {
      runOnJS(onLongPress)();
    });

  const composed = Gesture.Simultaneous(pinch, tap, longPress);

  if (isVideo) {
    return (
      <View style={{ width, height }} className="overflow-hidden bg-black">
        <MediaFrame
          source={uri}
          mediaType="video"
          shouldPlay
          showControls
          contentFit="contain"
          style={StyleSheet.absoluteFill}
        />
      </View>
    );
  }

  return (
    <GestureDetector gesture={composed}>
      <Animated.Image
        source={{ uri }}
        style={[{ width, height }, animatedStyle]}
        resizeMode="contain"
      />
    </GestureDetector>
  );
}
