import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

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
  const [loading, setLoading] = useState(true);
  const resolvedHeight = height ?? width;

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
        <Image
          source={{ uri }}
          style={{ width, height: resolvedHeight, borderRadius: 12 }}
          resizeMode="cover"
          onLoadStart={() => setLoading(true)}
          onLoadEnd={() => setLoading(false)}
        />
        {loading ? (
          <View className="absolute inset-0 items-center justify-center bg-black/10">
            <ActivityIndicator color="#fff" />
          </View>
        ) : null}
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
