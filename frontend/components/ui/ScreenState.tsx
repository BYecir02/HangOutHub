import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { uiTokens } from '@/theme/tokens';

type ScreenStateMode = 'loading' | 'error' | 'empty' | 'warning';

type ScreenStateProps = {
  mode: ScreenStateMode;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  fullScreen?: boolean;
  containerClassName?: string;
};

const MODE_ICON: Record<Exclude<ScreenStateMode, 'loading'>, keyof typeof Ionicons.glyphMap> = {
  error: 'alert-circle-outline',
  empty: 'folder-open-outline',
  warning: 'warning-outline',
};

const MODE_COLOR: Record<Exclude<ScreenStateMode, 'loading'>, string> = {
  error: '#ef4444',
  empty: '#9ca3af',
  warning: '#f59e0b',
};

export default function ScreenState({
  mode,
  title,
  description,
  actionLabel,
  onAction,
  fullScreen = false,
  containerClassName = '',
}: ScreenStateProps) {
  const wrapperClassName = fullScreen
    ? 'flex-1 items-center justify-center px-6'
    : 'items-center justify-center px-6 py-10';

  if (mode === 'loading') {
    return (
      <View className={`${wrapperClassName} ${containerClassName}`.trim()}>
        <ActivityIndicator size="large" color="#4c669f" />
        {title ? (
          <Text className="mt-3 text-sm font-medium text-gray-600 dark:text-gray-300">
            {title}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className={`${wrapperClassName} ${containerClassName}`.trim()}>
      <View
        className="w-full border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900"
        style={{
          borderRadius: uiTokens.radius.lg,
          padding: uiTokens.spacing.cardPaddingLg,
          borderWidth: uiTokens.borderWidth.hairline,
        }}
      >
        <View className="items-center">
          <Ionicons name={MODE_ICON[mode]} size={30} color={MODE_COLOR[mode]} />
          {title ? (
            <Text className="mt-3 text-center text-base font-semibold text-gray-900 dark:text-white">
              {title}
            </Text>
          ) : null}
          {description ? (
            <Text className="mt-2 text-center text-sm text-gray-500 dark:text-gray-400">
              {description}
            </Text>
          ) : null}
          {actionLabel && onAction ? (
            <TouchableOpacity
              onPress={onAction}
              className="mt-4 bg-[#4c669f] px-4 py-2.5"
              style={{ borderRadius: uiTokens.radius.sm }}
            >
              <Text className="text-sm font-semibold text-white">{actionLabel}</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </View>
  );
}
