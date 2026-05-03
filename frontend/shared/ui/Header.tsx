import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';

import { useColorScheme } from '@/shared/hooks/use-color-scheme';

interface HeaderProps {
  location?: string;
  locationLabel?: string;
  onNotificationPress?: () => void;
  onLocationPress?: () => void;
  onSearchPress?: () => void;
  onFilterPress?: () => void;
  notificationCount?: number;
  transparent?: boolean;
}

export default function Header({
  location = "Cotonou, Benin",
  locationLabel = 'Ma position',
  onNotificationPress,
  onLocationPress,
  onSearchPress,
  onFilterPress,
  notificationCount = 0,
  transparent = false,
}: HeaderProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const safeCount = Number.isFinite(notificationCount) ? notificationCount : 0;
  const badgeLabel = safeCount > 99 ? '99+' : String(safeCount);
  const hasSearchAction = typeof onSearchPress === 'function';
  const hasFilterAction = typeof onFilterPress === 'function';
  const actionCount = 1 + Number(hasSearchAction) + Number(hasFilterAction);
  const actionWidthClass =
    actionCount >= 3 ? 'w-28' : actionCount === 2 ? 'w-20' : 'w-10';

  // En mode transparent : blanc sur fond sombre, quasi-noir sur fond clair
  const iconColor = transparent ? (isDark ? '#fff' : '#1a1a2e') : (isDark ? '#fff' : '#333');
  const transparentTextColor = isDark ? '#fff' : '#1a1a2e';
  const transparentLabelColor = isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.45)';

  return (
    <View className="px-5 pt-14 pb-4 flex-row justify-between items-center">
      {!transparent && (
        <View className="absolute inset-0 overflow-hidden">
          <BlurView
            intensity={isDark ? 24 : 32}
            tint={isDark ? 'dark' : 'light'}
            className="flex-1"
          />
          <View
            pointerEvents="none"
            className={isDark ? 'absolute inset-0 bg-black/35' : 'absolute inset-0 bg-white/35'}
          />
        </View>
      )}
      {/* Spacer pour centrer la localisation */}
      <View className={actionWidthClass} />

      {/* Localisation Centrale */}
      <TouchableOpacity className="flex-row items-center" onPress={onLocationPress}>
        <View className="items-center">
          <Text
            style={{ color: transparent ? transparentLabelColor : undefined }}
            className={transparent ? 'text-[10px] font-medium uppercase tracking-widest' : 'text-gray-400 dark:text-gray-500 text-[10px] font-medium uppercase tracking-widest'}
          >
            {locationLabel}
          </Text>
          <View className="flex-row items-center">
            <Text
              style={{ color: transparent ? transparentTextColor : undefined }}
              className={transparent ? 'font-bold text-base mr-1' : 'text-gray-800 dark:text-white font-bold text-base mr-1'}
            >
              {location}
            </Text>
            <Ionicons name="chevron-down" size={16} color="#4c669f" />
          </View>
        </View>
      </TouchableOpacity>

      {/* Actions à droite */}
      <View
        className={
          actionWidthClass === 'w-28'
            ? 'flex-row items-center justify-end w-28'
            : actionWidthClass === 'w-20'
              ? 'flex-row items-center justify-end w-20'
              : 'flex-row items-center justify-end w-10'
        }
      >
        {hasSearchAction ? (
          <TouchableOpacity
            onPress={onSearchPress}
            className="h-10 w-10 justify-center items-center mr-1"
          >
            <Ionicons name="search-outline" size={24} color={iconColor} />
          </TouchableOpacity>
        ) : null}

        {hasFilterAction ? (
          <TouchableOpacity
            onPress={onFilterPress}
            className="h-10 w-10 justify-center items-center mr-1"
          >
            <Ionicons name="funnel-outline" size={22} color={iconColor} />
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          onPress={onNotificationPress}
          className="h-10 w-10 justify-center items-center"
        >
          <Ionicons name="notifications-outline" size={24} color={iconColor} />
          {safeCount > 0 ? (
            <View className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 items-center justify-center border-2 border-white dark:border-black">
              <Text className="text-[10px] font-bold text-white">
                {badgeLabel}
              </Text>
            </View>
          ) : null}
        </TouchableOpacity>
      </View>
    </View>
  );
}
