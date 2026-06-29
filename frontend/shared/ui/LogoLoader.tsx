import React, { useEffect } from 'react';
import {
  Image,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import MaskedView from '@react-native-masked-view/masked-view';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  Easing,
  cancelAnimation,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';

import { useColorScheme } from '@/shared/hooks/use-color-scheme';

// Variantes thematiques du logo (carrees). On affiche la version claire sur fond
// sombre et inversement.
const LOGO_LIGHT = require('../../assets/images/hangouthub-logo-light.png');
const LOGO_DARK = require('../../assets/images/hangouthub-logo-dark.png');

type LogoLoaderProps = {
  /** Cote du logo en px. */
  size?: number;
  /** Texte optionnel sous le logo (ex: "Paiement en cours..."). */
  message?: string;
  /** Si true : occupe tout l'ecran avec le fond du theme. */
  fullscreen?: boolean;
  /** Duree d'un balayage complet du reflet (ms). */
  durationMs?: number;
  style?: StyleProp<ViewStyle>;
};

// Loader de marque : le logo complet avec un reflet brillant qui balaie en
// diagonale, clippe a la forme exacte du logo (via MaskedView). Reserve aux
// moments "plein ecran" (boot de l'app, paiement, gros traitement) -- pour le
// reste, prefere les skeletons ou LogoSpinner.
export default function LogoLoader({
  size = 160,
  message,
  fullscreen = false,
  durationMs = 1500,
  style,
}: LogoLoaderProps) {
  const isDark = useColorScheme() === 'dark';
  const logo = isDark ? LOGO_LIGHT : LOGO_DARK;

  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withRepeat(
      withTiming(1, { duration: durationMs, easing: Easing.inOut(Easing.ease) }),
      -1,
      false,
    );

    return () => cancelAnimation(progress);
  }, [durationMs, progress]);

  const bandWidth = size * 0.5;

  const shimmerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: interpolate(progress.value, [0, 1], [-bandWidth, size]) },
      // Legere inclinaison pour un reflet diagonal.
      { rotateZ: '18deg' },
    ],
  }));

  const content = (
    <View style={[{ alignItems: 'center' }, style]}>
      <View style={{ width: size, height: size }}>
        {/* Logo reel, legerement attenue pour que le reflet ressorte. */}
        <Image
          source={logo}
          resizeMode="contain"
          style={{ width: size, height: size, opacity: 0.9 }}
        />

        {/* Reflet clippe a la forme du logo. */}
        <MaskedView
          style={{ position: 'absolute', width: size, height: size }}
          maskElement={
            <Image
              source={logo}
              resizeMode="contain"
              style={{ width: size, height: size }}
            />
          }
        >
          <Animated.View
            style={[{ width: bandWidth, height: size * 1.6, marginTop: -size * 0.3 }, shimmerStyle]}
          >
            <LinearGradient
              colors={[
                'transparent',
                isDark ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.95)',
                'transparent',
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ flex: 1 }}
            />
          </Animated.View>
        </MaskedView>
      </View>

      {message ? (
        <Text className="mt-5 text-sm font-medium text-gray-500 dark:text-gray-400">
          {message}
        </Text>
      ) : null}
    </View>
  );

  if (!fullscreen) {
    return content;
  }

  return (
    <View className="flex-1 items-center justify-center bg-white dark:bg-black">
      {content}
    </View>
  );
}
