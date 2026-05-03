import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import MediaFrame from '@/shared/ui/MediaFrame';
import { useI18n } from '@/shared/hooks/use-i18n';
import { getImageUrl } from '@/services/api';

const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';

type PlaceDetailEvent = {
  id: string;
  title: string;
  startTime: string;
  coverUrl: string | null;
};

type PlaceDetailEventsTabProps = {
  events?: PlaceDetailEvent[] | null;
};

function formatEventDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PlaceDetailEventsTab({ events }: PlaceDetailEventsTabProps) {
  const router = useRouter();
  const { locale, t } = useI18n();

  return (
    <View className="pb-2 pt-4">
      <Text className="text-lg font-bold text-gray-900 dark:text-white">
        {t('placeDetailRelatedEvents')}
      </Text>
      {events && events.length > 0 ? (
        events.map((event) => (
          <TouchableOpacity
            key={event.id}
            onPress={() =>
              router.push({
                pathname: '/event/[id]',
                params: { id: event.id },
              })
            }
            className="mt-4 flex-row rounded-3xl bg-gray-50 p-3 dark:bg-gray-800"
          >
            <MediaFrame
              source={getImageUrl(event.coverUrl) || PLACE_PLACEHOLDER}
              className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-gray-800"
            />
            <View className="ml-4 flex-1 justify-center">
              <Text className="text-base font-semibold text-gray-900 dark:text-white" numberOfLines={1}>
                {event.title}
              </Text>
              <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {formatEventDate(event.startTime, locale)}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        ))
      ) : (
        <Text className="mt-3 text-base text-gray-500 dark:text-gray-400">
          {t('placeDetailNoRelatedEvents')}
        </Text>
      )}
    </View>
  );
}
