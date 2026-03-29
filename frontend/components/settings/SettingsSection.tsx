import React, { type ReactNode } from 'react';
import { Text, View } from 'react-native';
import { uiTokens } from '@/theme/tokens';

type SettingsSectionProps = {
  title?: string;
  children: ReactNode;
  containerClassName?: string;
  cardClassName?: string;
};

export default function SettingsSection({
  title,
  children,
  containerClassName = '',
  cardClassName = '',
}: SettingsSectionProps) {
  return (
    <View className={containerClassName}>
      {title ? (
        <Text className="mb-2 text-xs font-bold uppercase tracking-wider text-gray-500 dark:text-gray-400">
          {title}
        </Text>
      ) : null}
      <View
        className={`overflow-hidden rounded-xl bg-white dark:bg-gray-900 ${cardClassName}`.trim()}
        style={{ borderRadius: uiTokens.radius.md }}
      >
        {children}
      </View>
    </View>
  );
}
