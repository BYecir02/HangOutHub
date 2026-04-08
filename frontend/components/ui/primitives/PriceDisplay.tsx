import React from 'react';
import { Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';

type PriceDisplayProps = {
  value?: number | null;
  label?: string | null;
  locale?: string;
  currency?: string;
  freeLabel?: string;
  prefix?: string;
  tone?: 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
  variant?: 'solid' | 'soft' | 'outline';
  size?: 'sm' | 'md';
  className?: string;
  textClassName?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const TONE_STYLES = {
  brand: { solidBg: '#4c669f', solidText: '#ffffff', softBg: '#eef2ff', softText: '#4c669f', border: '#c7d2fe', outlineText: '#4c669f' },
  success: { solidBg: '#2ecc71', solidText: '#ffffff', softBg: '#eafaf1', softText: '#1e7a48', border: '#b7efd0', outlineText: '#2ecc71' },
  warning: { solidBg: '#f39c12', solidText: '#ffffff', softBg: '#fff4df', softText: '#b36b00', border: '#f8d9a5', outlineText: '#f39c12' },
  danger: { solidBg: '#ef4444', solidText: '#ffffff', softBg: '#fee2e2', softText: '#b91c1c', border: '#fecaca', outlineText: '#ef4444' },
  neutral: { solidBg: '#111827', solidText: '#ffffff', softBg: '#f3f4f6', softText: '#111827', border: '#e5e7eb', outlineText: '#374151' },
} as const;

const SIZE_STYLES = {
  sm: { container: 'px-2.5 py-1', text: 'text-[10px]' },
  md: { container: 'px-3 py-1.5', text: 'text-xs' },
} as const;

function formatPriceValue(value: number, locale: string, currency: string, prefix?: string) {
  const formatter = new Intl.NumberFormat(locale || 'en-US', {
    style: 'currency',
    currency,
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
  });

  const formatted = formatter.format(value);
  return prefix ? `${prefix}${formatted}` : formatted;
}

export default function PriceDisplay({
  value,
  label,
  locale = 'en-US',
  currency = 'EUR',
  freeLabel = 'Free',
  prefix = '',
  tone = 'brand',
  variant = 'solid',
  size = 'md',
  className = '',
  textClassName = '',
  style,
  textStyle,
}: PriceDisplayProps) {
  const toneStyles = TONE_STYLES[tone];
  const sizeStyles = SIZE_STYLES[size];

  const resolvedLabel =
    label?.trim() ||
    (typeof value === 'number' && Number.isFinite(value)
      ? value <= 0
        ? freeLabel
        : formatPriceValue(value, locale, currency, prefix)
      : freeLabel);

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
      className={`self-start rounded-full ${sizeStyles.container} ${className}`.trim()}
      style={containerStyle}
    >
      <Text className={`${sizeStyles.text} font-bold`} style={[{ color: textColor }, textStyle]} numberOfLines={1}>
        {resolvedLabel}
      </Text>
    </View>
  );
}