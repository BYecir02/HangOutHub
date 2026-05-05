import React from 'react';
import { Image, Text, View } from 'react-native';
import { getImageUrl } from '@/services/api';
import type { FriendAttendee } from '@/services/social/activity';

interface FriendsAttendingRowProps {
  friends: FriendAttendee[];
  label?: string;
}

const MAX_AVATARS = 3;

export default function FriendsAttendingRow({ friends, label = 'y vont' }: FriendsAttendingRowProps) {
  if (friends.length === 0) return null;

  const displayed = friends.slice(0, MAX_AVATARS);
  const remaining = friends.length - displayed.length;
  const names = displayed
    .map((f) => f.displayName || f.username || '')
    .filter(Boolean);
  const nameLabel =
    names.length > 1
      ? `${names.slice(0, -1).join(', ')} et ${names[names.length - 1]}`
      : names[0] ?? '';
  const countLabel = remaining > 0 ? ` et ${remaining} autre${remaining > 1 ? 's' : ''}` : '';

  return (
    <View className="flex-row items-center">
      <View className="flex-row">
        {displayed.map((friend, i) => (
          <View
            key={friend.id}
            className="h-7 w-7 overflow-hidden rounded-full border-2 border-white dark:border-gray-900"
            style={{ marginLeft: i > 0 ? -8 : 0 }}
          >
            {friend.avatarUrl ? (
              <Image
                source={{ uri: getImageUrl(friend.avatarUrl) || '' }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View className="h-full w-full items-center justify-center bg-[#4c669f]">
                <Text className="text-[8px] font-bold text-white">
                  {(friend.displayName || friend.username || '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
      <Text className="ml-2 flex-1 text-xs text-white/80" numberOfLines={1}>
        <Text className="font-semibold">{nameLabel}</Text>
        {countLabel} {label}
      </Text>
    </View>
  );
}
