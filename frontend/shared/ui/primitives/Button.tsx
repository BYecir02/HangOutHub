import React, { type ReactNode } from 'react';
import {
  ActivityIndicator,
  Text,
  TouchableOpacity,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

export type ButtonVariant = 'filled' | 'outlined' | 'ghost' | 'soft';
export type ButtonTone = 'brand' | 'success' | 'warning' | 'danger' | 'neutral';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  label: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  tone?: ButtonTone;
  size?: ButtonSize;
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  className?: string;
  contentClassName?: string;
  textClassName?: string;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
};

const TONE_STYLES: Record<
  ButtonTone,
  {
    filledBg: string;
    filledText: string;
    softBg: string;
    softText: string;
    border: string;
    ghostText: string;
    spinner: string;
  }
> = {
  brand: {
    filledBg: '#4c669f',
    filledText: '#ffffff',
    softBg: '#eef2ff',
    softText: '#4c669f',
    border: '#c7d2fe',
    ghostText: '#4c669f',
    spinner: '#ffffff',
  },
  success: {
    filledBg: '#2ecc71',
    filledText: '#ffffff',
    softBg: '#eafaf1',
    softText: '#1e7a48',
    border: '#b7efd0',
    ghostText: '#2ecc71',
    spinner: '#ffffff',
  },
  warning: {
    filledBg: '#f39c12',
    filledText: '#ffffff',
    softBg: '#fff4df',
    softText: '#b36b00',
    border: '#f8d9a5',
    ghostText: '#f39c12',
    spinner: '#ffffff',
  },
  danger: {
    filledBg: '#ef4444',
    filledText: '#ffffff',
    softBg: '#fee2e2',
    softText: '#b91c1c',
    border: '#fecaca',
    ghostText: '#ef4444',
    spinner: '#ffffff',
  },
  neutral: {
    filledBg: '#111827',
    filledText: '#ffffff',
    softBg: '#f3f4f6',
    softText: '#111827',
    border: '#e5e7eb',
    ghostText: '#374151',
    spinner: '#ffffff',
  },
};

const SIZE_STYLES: Record<ButtonSize, { container: string; text: string; gap: string; icon: number }> = {
  sm: {
    container: 'min-h-9 px-3.5 py-2',
    text: 'text-xs',
    gap: 'gap-1.5',
    icon: 14,
  },
  md: {
    container: 'min-h-11 px-4 py-3',
    text: 'text-sm',
    gap: 'gap-2',
    icon: 16,
  },
  lg: {
    container: 'min-h-12 px-5 py-3.5',
    text: 'text-base',
    gap: 'gap-2.5',
    icon: 18,
  },
};

export default function Button({
  label,
  onPress,
  variant = 'filled',
  tone = 'brand',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className = '',
  contentClassName = '',
  textClassName = '',
  style,
  textStyle,
}: ButtonProps) {
  const toneStyles = TONE_STYLES[tone];
  const sizeStyles = SIZE_STYLES[size];
  const isDisabled = disabled || loading || !onPress;

  const containerStyle: StyleProp<ViewStyle> = [
    {
      backgroundColor:
        variant === 'filled'
          ? toneStyles.filledBg
          : variant === 'soft'
            ? toneStyles.softBg
            : 'transparent',
      borderColor: variant === 'outlined' ? toneStyles.border : 'transparent',
      borderWidth: variant === 'outlined' ? 1.5 : 0,
      opacity: isDisabled ? 0.6 : 1,
    },
    style,
  ];

  const resolvedTextColor =
    variant === 'filled'
      ? toneStyles.filledText
      : variant === 'soft'
        ? toneStyles.softText
        : variant === 'outlined'
          ? toneStyles.ghostText
          : toneStyles.ghostText;

  const spinnerColor = variant === 'filled' ? toneStyles.spinner : toneStyles.ghostText;

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.9}
      className={`${fullWidth ? 'w-full' : 'self-start'} overflow-hidden rounded-full ${sizeStyles.container} ${className}`.trim()}
      style={containerStyle}
    >
      <View className={`flex-row items-center justify-center ${sizeStyles.gap} ${contentClassName}`.trim()}>
        {loading ? (
          <ActivityIndicator size="small" color={spinnerColor} />
        ) : leftIcon ? (
          <View>{leftIcon}</View>
        ) : null}

        <Text
          className={`font-semibold ${sizeStyles.text} ${textClassName}`.trim()}
          style={[{ color: resolvedTextColor }, textStyle]}
          numberOfLines={1}
        >
          {label}
        </Text>

        {!loading && rightIcon ? <View>{rightIcon}</View> : null}
      </View>
    </TouchableOpacity>
  );
}
