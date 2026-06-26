import React, { useEffect } from 'react';
import { Image, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

// Spinner "maison" : le logo mark de l'app qui tourne sur lui-meme.
// Sert d'indicateur de chargement brande (refresh, etc.).
const LOGO_MARK = require('../../assets/images/hangouthub-logo-mark-512.png');

type LogoSpinnerProps = {
  /** Diametre du logo en px. */
  size?: number;
  /** Duree d'un tour complet en ms (plus petit = plus rapide). */
  durationMs?: number;
  /** Active/desactive la rotation (ex: couper l'anim quand cache). */
  spinning?: boolean;
  style?: StyleProp<ViewStyle>;
};

export default function LogoSpinner({
  size = 28,
  durationMs = 900,
  spinning = true,
  style,
}: LogoSpinnerProps) {
  const rotation = useSharedValue(0);

  useEffect(() => {
    if (spinning) {
      rotation.value = withRepeat(
        withTiming(360, { duration: durationMs, easing: Easing.linear }),
        -1,
        false,
      );
    } else {
      cancelAnimation(rotation);
      rotation.value = 0;
    }

    return () => cancelAnimation(rotation);
  }, [spinning, durationMs, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  return (
    <Animated.View style={[animatedStyle, style]}>
      <Image
        source={LOGO_MARK}
        style={{ width: size, height: size }}
        resizeMode="contain"
      />
    </Animated.View>
  );
}
