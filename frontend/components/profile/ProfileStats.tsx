import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';

interface ProfileStatsProps {
  postsCount: number;
  outingsCount?: number;
  followersCount?: number;
  followingCount?: number;
  isOrganizer?: boolean;
  placesCount?: number;
  eventsCount?: number;
}

function StatItem({ label, value }: { label: string; value: number }) {
  return (
    <TouchableOpacity className="items-center">
      <Text className="text-lg font-bold text-gray-900 dark:text-white">
        {value}
      </Text>
      <Text className="text-xs text-gray-400 dark:text-gray-500">{label}</Text>
    </TouchableOpacity>
  );
}

export default function ProfileStats({
  postsCount,
  outingsCount = 0,
  followersCount = 0,
  isOrganizer = false,
  placesCount = 0,
  eventsCount = 0,
}: ProfileStatsProps) {
  if (isOrganizer) {
    return (
      <View className="mt-6 flex-row justify-around border-y border-gray-100 py-4 dark:border-gray-800">
        <StatItem label="Abonnes" value={followersCount} />
        <View className="border-x border-gray-100 px-10 dark:border-gray-800">
          <StatItem label="Lieux" value={placesCount} />
        </View>
        <StatItem label="Evenements" value={eventsCount} />
      </View>
    );
  }

  return (
    <View className="mt-6 flex-row justify-around border-y border-gray-100 py-4 dark:border-gray-800">
      <StatItem label="Abonnes" value={followersCount} />
      <View className="border-x border-gray-100 px-10 dark:border-gray-800">
        <StatItem label="Sorties" value={outingsCount} />
      </View>
      <StatItem label="Posts" value={postsCount} />
    </View>
  );
}
