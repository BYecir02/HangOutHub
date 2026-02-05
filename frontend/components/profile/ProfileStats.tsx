// c:\Users\Lenovo\Desktop\Git\HangOutHub\HangOutHub\frontend\components\profile\ProfileStats.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

interface ProfileStatsProps {
  postsCount: number;
  followersCount?: number;
  followingCount?: number;
}

export default function ProfileStats({ postsCount, followersCount = 124, followingCount = 89 }: ProfileStatsProps) {
  return (
    <View className="flex-row justify-around mt-6 py-4 border-y border-gray-100 dark:border-gray-800">
      <TouchableOpacity className="items-center">
        <Text className="font-bold text-lg text-gray-900 dark:text-white">{followersCount}</Text>
        <Text className="text-gray-400 dark:text-gray-500 text-xs">Abonnés</Text>
      </TouchableOpacity>
      <TouchableOpacity className="items-center border-x border-gray-100 dark:border-gray-800 px-10">
        <Text className="font-bold text-lg text-gray-900 dark:text-white">{followingCount}</Text>
        <Text className="text-gray-400 dark:text-gray-500 text-xs">Abonnements</Text>
      </TouchableOpacity>
      <TouchableOpacity className="items-center">
        <Text className="font-bold text-lg text-gray-900 dark:text-white">{postsCount}</Text>
        <Text className="text-gray-400 dark:text-gray-500 text-xs">Posts</Text>
      </TouchableOpacity>
    </View>
  );
}
