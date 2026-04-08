import React from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type RatingDisplayProps = {
  value?: number | null;
  label?: string | null;
  size?: 'sm' | 'md';
  tone?: 'brand' | 'neutral';
  variant?: 'solid' | 'soft' | 'outline';
  fallbackLabel?: string;
  showStar?: boolean;
  className?: string;
  textClassName?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const TONE_STYLES = {
  brand: { solidBg: '#4c669f', solidText: '#ffffff', softBg: '#eef2ff', softText: '#4c669f', border: '#c7d2fe', outlineText: '#4c669f', star: '#f59e0b' },
  neutral: { solidBg: '#111827', solidText: '#ffffff', softBg: '#f3f4f6', softText: '#111827', border: '#e5e7eb', outlineText: '#374151', star: '#f59e0b' },
} as const;

const SIZE_STYLES = {
  sm: { container: 'px-2.5 py-1', text: 'text-[10px]', starSize: 10, gap: 'ml-1' },
  md: { container: 'px-3 py-1.5', text: 'text-xs', starSize: 12, gap: 'ml-1.5' },
} as const;

export default function RatingDisplay({
  value,
  label,
  size = 'md',
  tone = 'brand',
  variant = 'soft',
  fallbackLabel = 'New',
  showStar = true,
  className = '',
  textClassName = '',
  style,
  textStyle,
}: RatingDisplayProps) {
  const toneStyles = TONE_STYLES[tone];
  const sizeStyles = SIZE_STYLES[size];
  const resolvedLabel =
    label?.trim() ||
    (typeof value === 'number' && Number.isFinite(value) && value > 0
      ? value.toFixed(1)
      : fallbackLabel);

  const containerStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor:
        variant === 'solid'
          ? toneStyles.solidBg
          : variant === 'soft'
            ? toneStyles.softBg
            : 'transparent',
      borderColor: variant === 'outline' ? toneStyles.border : 'transparent',
      borderWidth: variant === 'outline' ? 1.25 : 0,
    },
    style,
  ];

  const textColor =
    variant === 'solid'
      ? toneStyles.solidText
      : variant === 'soft'
        ? toneStyles.softText
        : toneStyles.outlineText;

  return (
    <View className={`self-start flex-row items-center rounded-full ${sizeStyles.container} ${className}`.trim()} style={containerStyle}>
      {showStar ? <Ionicons name="star" size={sizeStyles.starSize} color={toneStyles.star} /> : null}
      <Text className={`${sizeStyles.gap} font-semibold ${sizeStyles.text} ${textClassName}`.trim()} style={[{ color: textColor }, textStyle]} numberOfLines={1}>
        {resolvedLabel}
      </Text>
    </View>
  );
}