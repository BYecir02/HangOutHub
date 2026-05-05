import React from 'react';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { getImageUrl } from '@/services/api';
import type { FriendActivityItem } from '@/services/social/activity';

interface FeedActivityCardProps {
  item: FriendActivityItem;
}

const MAX_AVATARS = 3;

const ACTION_LABELS: Record<FriendActivityItem['actionType'], string> = {
  outing_created: 'organisent une sortie pour',
  place_saved: 'ont sauvegardé',
  event_saved: 'participent à',
};

export default function FeedActivityCard({ item }: FeedActivityCardProps) {
  const router = useRouter();

  const displayed = item.actors.slice(0, MAX_AVATARS);
  const remaining = item.actors.length - displayed.length;
  const names = displayed
    .map((a) => a.displayName || a.username || '')
    .filter(Boolean);
  const actorLabel =
    names.length === 1
      ? names[0]
      : names.length === 2
      ? `${names[0]} et ${names[1]}`
      : `${names[0]}, ${names[1]} et ${remaining + 1} autre${remaining + 1 > 1 ? 's' : ''}`;

  const handlePress = () => {
    if (item.entity.type === 'event') {
      router.push({ pathname: '/event/[id]', params: { id: item.entity.id } });
    } else {
      router.push({ pathname: '/place/[id]', params: { id: item.entity.id } });
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.82}
      className="mx-4 mb-3 flex-row overflow-hidden rounded-2xl border border-gray-100 bg-white/90 dark:border-gray-800 dark:bg-gray-900/90"
    >
      {item.entity.imageUrl ? (
        <Image
          source={{ uri: getImageUrl(item.entity.imageUrl) || '' }}
          style={{ width: 80, height: 80 }}
          resizeMode="cover"
        />
      ) : (
        <View
          style={{ width: 80, height: 80 }}
          className="items-center justify-center bg-[#4c669f]/10"
        >
          <Ionicons
            name={item.entity.type === 'event' ? 'calendar-outline' : 'location-outline'}
            size={24}
            color="#4c669f"
          />
        </View>
      )}

      <View className="flex-1 justify-center px-3 py-2.5">
        <View className="mb-1.5 flex-row items-center">
          {displayed.map((actor, i) => (
            <View
              key={actor.id}
              className="h-6 w-6 overflow-hidden rounded-full border-2 border-white dark:border-gray-900"
              style={{ marginLeft: i > 0 ? -6 : 0 }}
            >
              {actor.avatarUrl ? (
                <Image
                  source={{ uri: getImageUrl(actor.avatarUrl) || '' }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
              ) : (
                <View className="h-full w-full items-center justify-center bg-[#4c669f]">
                  <Text className="text-[7px] font-bold text-white">
                    {(actor.displayName || actor.username || '?')[0].toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <Text className="text-xs leading-4 text-gray-700 dark:text-gray-300" numberOfLines={2}>
          <Text className="font-semibold text-gray-900 dark:text-white">{actorLabel} </Text>
          {ACTION_LABELS[item.actionType]}{' '}
          <Text className="font-semibold text-gray-900 dark:text-white">{item.entity.title}</Text>
        </Text>

        {item.entity.scheduledAt ? (
          <Text className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
            {new Date(item.entity.scheduledAt).toLocaleDateString()}
          </Text>
        ) : null}
      </View>

      <View className="items-center justify-center pr-3">
        <Ionicons name="chevron-forward" size={14} color="#9ca3af" />
      </View>
    </TouchableOpacity>
  );
}
