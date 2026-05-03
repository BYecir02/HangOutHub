import React, { type ReactNode } from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { uiTokens } from '@/theme/tokens';

type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  label?: string;
  onBack?: () => void;
  backIcon?: keyof typeof Ionicons.glyphMap;
  rightSlot?: ReactNode;
  containerClassName?: string;
};

export default function ScreenHeader({
  title,
  subtitle,
  label,
  onBack,
  backIcon = 'arrow-back',
  rightSlot,
  containerClassName = '',
}: ScreenHeaderProps) {
  const isDark = useColorScheme() === 'dark';
  const backButtonColor = isDark ? '#93a8d0' : '#4c669f';
  const hasSubtitle = Boolean(subtitle?.trim());
  const hasLabel = Boolean(label?.trim());
  const hasMeta = hasSubtitle || hasLabel;

  return (
    <View
      className={`flex-row ${hasMeta ? 'items-start' : 'items-center'} ${containerClassName}`.trim()}
    >
      <View className={`flex-1 flex-row ${hasMeta ? 'items-start' : 'items-center'}`}>
        {onBack ? (
          <TouchableOpacity
            onPress={onBack}
            className={`mr-3 h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800 ${
              hasMeta ? 'mt-0.5' : ''
            }`}
            style={{
              width: uiTokens.size.backButton,
              height: uiTokens.size.backButton,
              borderRadius: uiTokens.radius.full,
              borderWidth: uiTokens.borderWidth.hairline,
            }}
          >
            <Ionicons name={backIcon} size={uiTokens.size.iconMd} color={backButtonColor} />
          </TouchableOpacity>
        ) : null}
        <View className={`flex-1 ${hasMeta ? '' : 'justify-center'}`}>
          {label ? (
            <Text className="text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
              {label}
            </Text>
          ) : null}
          <Text className={`${hasMeta ? 'mt-1' : ''} text-2xl font-bold text-gray-900 dark:text-white`}>
            {title}
          </Text>
          {subtitle ? (
            <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {rightSlot ? (
        <View
          style={{ marginLeft: uiTokens.spacing.rowY }}
          className={hasMeta ? 'self-start' : 'self-center'}
        >
          {rightSlot}
        </View>
      ) : null}
    </View>
  );
}
