import React from 'react';
import { Text, TouchableOpacity } from 'react-native';

interface PersonActionButtonProps {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'neutral';
}

export default function PersonActionButton({
  label,
  onPress,
  disabled = false,
  variant = 'primary',
}: PersonActionButtonProps) {
  const backgroundColor =
    variant === 'primary'
      ? disabled
        ? '#b8c5df'
        : '#4c669f'
      : disabled
        ? '#f3f4f6'
        : '#eef2ff';
  const textColor = variant === 'primary' ? '#ffffff' : '#4c669f';

  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || !onPress}
      className="rounded-full px-4 py-2"
      style={{ backgroundColor }}
    >
      <Text className="text-sm font-semibold" style={{ color: textColor }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}
