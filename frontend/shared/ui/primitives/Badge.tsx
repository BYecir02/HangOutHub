import React, { type ReactNode } from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

export type BadgeVariant = 'solid' | 'soft' | 'outline';
export type BadgeTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
export type BadgeSize = 'sm' | 'md';

type BadgeProps = {
  label: string;
  variant?: BadgeVariant;
  tone?: BadgeTone;
  size?: BadgeSize;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  textClassName?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const TONE_STYLES: Record<
  BadgeTone,
  {
    solidBg: string;
    solidText: string;
    softBg: string;
    softText: string;
    border: string;
    outlineText: string;
  }
> = {
  brand: {
    solidBg: '#4c669f',
    solidText: '#ffffff',
    softBg: '#eef2ff',
    softText: '#4c669f',
    border: '#c7d2fe',
    outlineText: '#4c669f',
  },
  success: {
    solidBg: '#2ecc71',
    solidText: '#ffffff',
    softBg: '#eafaf1',
    softText: '#1e7a48',
    border: '#b7efd0',
    outlineText: '#2ecc71',
  },
  warning: {
    solidBg: '#f39c12',
    solidText: '#ffffff',
    softBg: '#fff4df',
    softText: '#b36b00',
    border: '#f8d9a5',
    outlineText: '#f39c12',
  },
  danger: {
    solidBg: '#ef4444',
    solidText: '#ffffff',
    softBg: '#fee2e2',
    softText: '#b91c1c',
    border: '#fecaca',
    outlineText: '#ef4444',
  },
  neutral: {
    solidBg: '#111827',
    solidText: '#ffffff',
    softBg: '#f3f4f6',
    softText: '#111827',
    border: '#e5e7eb',
    outlineText: '#374151',
  },
};

const SIZE_STYLES: Record<BadgeSize, { container: string; text: string; gap: string }> = {
  sm: {
    container: 'min-h-6 px-2.5 py-1',
    text: 'text-[10px]',
    gap: 'gap-1',
  },
  md: {
    container: 'min-h-7 px-3 py-1.5',
    text: 'text-xs',
    gap: 'gap-1.5',
  },
};

export default function Badge({
  label,
  variant = 'solid',
  tone = 'neutral',
  size = 'md',
  leftIcon,
  rightIcon,
  className = '',
  textClassName = '',
  style,
  textStyle,
}: BadgeProps) {
  const toneStyles = TONE_STYLES[tone];
  const sizeStyles = SIZE_STYLES[size];

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
    <View
      className={`self-start flex-row items-center rounded-full ${sizeStyles.container} ${sizeStyles.gap} ${className}`.trim()}
      style={containerStyle}
    >
      {leftIcon ? <View>{leftIcon}</View> : null}
      <Text className={`font-semibold ${sizeStyles.text} ${textClassName}`.trim()} style={[{ color: textColor }, textStyle]} numberOfLines={1}>
        {label}
      </Text>
      {rightIcon ? <View>{rightIcon}</View> : null}
    </View>
  );
}