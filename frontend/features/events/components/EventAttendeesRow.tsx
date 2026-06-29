import React from 'react';
import { Image, Text, View } from 'react-native';

import { getImageUrl } from '@/services/api';
import { useI18n } from '@/shared/hooks/use-i18n';
import type { FriendAttendee } from '@/services/social/activity';

interface EventAttendeesRowProps {
  count: number;
  attendees: FriendAttendee[];
}

const MAX_AVATARS = 5;

// Preuve sociale sous le titre : avatars chevauchés des participants + total.
export default function EventAttendeesRow({ count, attendees }: EventAttendeesRowProps) {
  const { locale } = useI18n();
  if (count <= 0) {
    return null;
  }

  const displayed = attendees.slice(0, MAX_AVATARS);
  const fr = locale === 'fr-FR';
  const label = fr
    ? `${count} ${count > 1 ? 'personnes y vont' : 'personne y va'}`
    : `${count} ${count > 1 ? 'people going' : 'person going'}`;

  return (
    <View className="mt-2 flex-row items-center">
      <View className="flex-row">
        {displayed.map((u, i) => (
          <View
            key={u.id}
            className="h-7 w-7 overflow-hidden rounded-full border-2 border-gray-50 dark:border-black"
            style={{ marginLeft: i > 0 ? -8 : 0, zIndex: MAX_AVATARS - i }}
          >
            {u.avatarUrl ? (
              <Image
                source={{ uri: getImageUrl(u.avatarUrl) || '' }}
                style={{ width: '100%', height: '100%' }}
                resizeMode="cover"
              />
            ) : (
              <View className="h-full w-full items-center justify-center bg-[#4c669f]">
                <Text className="text-[8px] font-bold text-white">
                  {(u.displayName || u.username || '?')[0].toUpperCase()}
                </Text>
              </View>
            )}
          </View>
        ))}
      </View>
      <Text className="ml-3 text-sm font-semibold text-gray-700 dark:text-gray-200">
        {label}
      </Text>
    </View>
  );
}
