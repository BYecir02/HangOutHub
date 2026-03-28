import React from 'react';
import { Switch, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { uiTokens } from '@/theme/tokens';

type SettingsToggleRowProps = {
  label: string;
  value: boolean;
  onValueChange: (nextValue: boolean) => void;
  icon?: keyof typeof Ionicons.glyphMap;
  description?: string;
  withBorder?: boolean;
  disabled?: boolean;
};

export default function SettingsToggleRow({
  label,
  value,
  onValueChange,
  icon,
  description,
  withBorder = true,
  disabled = false,
}: SettingsToggleRowProps) {
  const isDark = useColorScheme() === 'dark';
  const iconColor = isDark ? '#ffffff' : '#333333';

  return (
    <View
      className={`flex-row items-center p-4 ${
        withBorder ? 'border-b border-gray-100 dark:border-gray-800' : ''
      } ${disabled ? 'opacity-60' : ''}`}
      style={{ padding: uiTokens.spacing.cardPadding, borderBottomWidth: withBorder ? uiTokens.borderWidth.hairline : 0 }}
    >
      {icon ? <Ionicons name={icon} size={uiTokens.size.iconMd + 2} color={iconColor} /> : null}
      <View className={`${icon ? 'ml-3' : ''} flex-1 pr-3`}>
        <Text className="text-base text-gray-700 dark:text-white">{label}</Text>
        {description ? (
          <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{ false: '#d1d5db', true: '#4c669f' }}
        thumbColor="#ffffff"
      />
    </View>
  );
}
