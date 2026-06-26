import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

import { useI18n } from '@/shared/hooks/use-i18n';

interface ProfileStatsProps {
  postsCount: number;
  outingsCount?: number;
  connectionsCount?: number;
  savedCount?: number;
  isOrganizer?: boolean;
  placesCount?: number;
  eventsCount?: number;
  onConnectionsPress?: () => void;
}

function StatItem({
  label,
  value,
  onPress,
}: {
  label: string;
  value: number;
  onPress?: () => void;
}) {
  const content = (
    <View className="items-center">
      <Text className="text-base font-bold text-gray-900 dark:text-white">
        {value}
      </Text>
      <Text className="mt-1 text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
        {label}
      </Text>
    </View>
  );

  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} className="items-center">
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

export default function ProfileStats({
  postsCount,
  outingsCount = 0,
  connectionsCount = 0,
  savedCount = 0,
  isOrganizer = false,
  placesCount = 0,
  eventsCount = 0,
  onConnectionsPress,
}: ProfileStatsProps) {
  const { t } = useI18n();

  if (isOrganizer) {
    return (
      <View className="mt-5 px-5">
        <View className="flex-row rounded-2xl border border-gray-100 bg-gray-50 px-2 py-3 dark:border-gray-800 dark:bg-gray-900">
          <View className="flex-1">
            <StatItem
              label={t('connectionsCountConnections')}
              value={connectionsCount}
              onPress={onConnectionsPress}
            />
          </View>
          <View className="flex-1 border-x border-gray-100 dark:border-gray-800">
            <StatItem label={t('profileStatsPlaces')} value={placesCount} />
          </View>
          <View className="flex-1">
            <StatItem label={t('profileStatsEvents')} value={eventsCount} />
          </View>
        </View>
      </View>
    );
  }

  return (
    <View className="mt-5 px-5">
      <View className="flex-row rounded-2xl border border-gray-100 bg-gray-50 px-1 py-3 dark:border-gray-800 dark:bg-gray-900">
        <View className="flex-1">
          <StatItem
            label={t('connectionsCountConnections')}
            value={connectionsCount}
            onPress={onConnectionsPress}
          />
        </View>
        <View className="flex-1 border-l border-gray-100 dark:border-gray-800">
          <StatItem label={t('profileStatsSaved')} value={savedCount} />
        </View>
        <View className="flex-1 border-l border-gray-100 dark:border-gray-800">
          <StatItem label={t('profileStatsOutings')} value={outingsCount} />
        </View>
        {/* Compteur "Posts" masque (reseau social en veille).
            Pour le reactiver : retirer le `false &&`. */}
        {false && (
          <View className="flex-1 border-l border-gray-100 dark:border-gray-800">
            <StatItem label={t('profileStatsPosts')} value={postsCount} />
          </View>
        )}
      </View>
    </View>
  );
}
