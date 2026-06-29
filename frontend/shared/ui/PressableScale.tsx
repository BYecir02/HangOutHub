import React, { type ReactNode } from 'react';
import {
  Pressable,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

type PressableScaleProps = {
  children: ReactNode;
  onPress?: () => void;
  /** Facteur de reduction au press (0.97 = -3%). */
  scaleTo?: number;
  disabled?: boolean;
  className?: string;
  style?: StyleProp<ViewStyle>;
};

// Carte/bouton qui se reduit legerement au toucher, puis revient. Le className
// (NativeWind) reste sur le Pressable -- composant coeur supporte -- tandis que
// la transform anime un Animated.View englobant (pattern style-only du repo).
export default function PressableScale({
  children,
  onPress,
  scaleTo = 0.97,
  disabled = false,
  className,
  style,
}: PressableScaleProps) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePressIn = () => {
    scale.value = withTiming(scaleTo, { duration: 120 });
  };

  const handlePressOut = (_event: GestureResponderEvent) => {
    scale.value = withTiming(1, { duration: 160 });
  };

  return (
    <Animated.View style={animatedStyle}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
        className={className}
        style={style}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
