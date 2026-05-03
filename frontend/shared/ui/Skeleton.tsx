import React, { useEffect, useRef } from 'react';
import { Animated, View, type StyleProp, type ViewStyle } from 'react-native';

type SkeletonBlockProps = {
  className?: string;
  style?: StyleProp<ViewStyle>;
  animated?: boolean;
};

export function SkeletonBlock({ className = '', style, animated = true }: SkeletonBlockProps) {
  const opacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (!animated) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.35, duration: 850, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 1, duration: 850, useNativeDriver: true }),
      ]),
    );
    pulse.start();
    return () => pulse.stop();
  }, [animated, opacity]);

  if (!animated) {
    return (
      <View
        className={`bg-gray-200 dark:bg-gray-800 ${className}`.trim()}
        style={style}
      />
    );
  }

  return (
    <Animated.View
      className={`bg-gray-200 dark:bg-gray-800 ${className}`.trim()}
      style={[style, { opacity }]}
    />
  );
}
