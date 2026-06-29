import React from 'react';
import { Switch } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import ListItem from '@/shared/ui/primitives/ListItem';
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
    <ListItem
      title={label}
      subtitle={description}
      leading={icon ? <Ionicons name={icon} size={uiTokens.size.iconMd + 2} color={iconColor} /> : null}
      trailing={
        <Switch
          value={value}
          onValueChange={onValueChange}
          disabled={disabled}
          accessibilityLabel={label}
          accessibilityRole="switch"
          accessibilityState={{ checked: value, disabled }}
          trackColor={{ false: '#d1d5db', true: '#ff4757' }}
          thumbColor="#ffffff"
        />
      }
      withBorder={withBorder}
      disabled={disabled}
      className="items-center"
      contentClassName="pr-3"
      style={{
        padding: uiTokens.spacing.cardPadding,
        borderBottomWidth: withBorder ? uiTokens.borderWidth.hairline : 0,
      }}
    />
  );
}
