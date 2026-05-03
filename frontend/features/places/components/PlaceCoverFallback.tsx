import React from 'react';
import { Image, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const BRAND_MARK = require('../../../assets/images/hangouthub-logo-dark.png');

type PlaceCoverFallbackProps = {
  className?: string;
  style?: StyleProp<ViewStyle>;
  logoSize?: number;
};

export default function PlaceCoverFallback({
  className,
  style,
  logoSize = 56,
}: PlaceCoverFallbackProps) {
  return (
    <View className={`relative overflow-hidden bg-slate-900 ${className ?? ''}`.trim()} style={style}>
      <LinearGradient
        colors={['#0f172a', '#0f766e', '#1d4ed8']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View className="absolute -left-8 -top-8 h-24 w-24 rounded-full bg-white/10" />
      <View className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-white/8" />
      <View className="absolute inset-0 items-center justify-center">
        <View className="items-center justify-center rounded-[28px] border border-white/15 bg-white/12 px-5 py-5">
          <Image
            source={BRAND_MARK}
            style={{ width: logoSize, height: logoSize }}
            resizeMode="contain"
          />
        </View>
      </View>
    </View>
  );
}