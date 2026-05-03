import React from 'react';
import { View, type ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useColorScheme } from '@/hooks/use-color-scheme';

type HeroBackgroundVariant = 'home' | 'catalog';

type HeroOrb = {
  style: ViewStyle;
  darkColor: string;
  lightColor?: string;
  darkOpacity?: number;
  lightOpacity?: number;
};

type HeroBackgroundProps = {
  variant?: HeroBackgroundVariant;
};

const heroVariants: Record<HeroBackgroundVariant, { gradientDark: [string, string, string]; gradientLight: [string, string, string]; orbs: HeroOrb[] }> = {
  home: {
    gradientDark: ['#08111f', '#12233f', '#24122a'],
    gradientLight: ['#f8fbff', '#eef5ff', '#fff8f0'],
    orbs: [
      {
        style: { top: -60, left: -40, height: 190, width: 190 },
        darkColor: '#1d4ed8',
        lightColor: '#cfe2ff',
        darkOpacity: 0.32,
        lightOpacity: 0.48,
      },
      {
        style: { top: 30, right: -36, height: 140, width: 140 },
        darkColor: '#f97316',
        lightColor: '#ffd6b0',
        darkOpacity: 0.3,
        lightOpacity: 0.44,
      },
      {
        style: { bottom: -50, left: '24%', height: 150, width: 150 },
        darkColor: '#22c55e',
        lightColor: '#d5f4dd',
        darkOpacity: 0.28,
        lightOpacity: 0.42,
      },
      {
        style: { bottom: -40, right: -20, height: 120, width: 120 },
        darkColor: '#a855f7',
        lightColor: '#efd9ff',
        darkOpacity: 0.2,
        lightOpacity: 0.32,
      },
    ],
  },
  catalog: {
    gradientDark: ['#0b1220', '#131c31', '#1b1a30'],
    gradientLight: ['#f7f9ff', '#eef3ff', '#fff8f1'],
    orbs: [
      {
        style: { top: -50, left: -30, height: 150, width: 150 },
        darkColor: '#2563eb',
        lightColor: '#dbeafe',
        darkOpacity: 0.26,
        lightOpacity: 0.36,
      },
      {
        style: { top: 50, right: -30, height: 120, width: 120 },
        darkColor: '#f59e0b',
        lightColor: '#fde68a',
        darkOpacity: 0.24,
        lightOpacity: 0.34,
      },
      {
        style: { bottom: -40, left: '32%', height: 120, width: 120 },
        darkColor: '#10b981',
        lightColor: '#c6f6e5',
        darkOpacity: 0.2,
        lightOpacity: 0.32,
      },
    ],
  },
};

export default function HeroBackground({ variant = 'home' }: HeroBackgroundProps) {
  const isDark = useColorScheme() === 'dark';
  const config = heroVariants[variant];

  return (
    <View pointerEvents="none" className="absolute inset-0">
      <LinearGradient
        colors={isDark ? config.gradientDark : config.gradientLight}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />
      {config.orbs.map((orb, index) => (
        <View
          key={`hero-orb-${variant}-${index}`}
          className="absolute rounded-full"
          style={{
            ...orb.style,
            backgroundColor: isDark ? orb.darkColor : orb.lightColor || orb.darkColor,
            opacity: isDark ? orb.darkOpacity ?? 0.2 : orb.lightOpacity ?? 0.3,
          }}
        />
      ))}
    </View>
  );
}
