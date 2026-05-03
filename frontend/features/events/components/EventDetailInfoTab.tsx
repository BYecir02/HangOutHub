import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { formatEventDate } from '@/services/formatters';
import type { EventDetail } from '@/hooks/useEventDetail';
import type { TranslationKey } from '@/services/i18n';

type TranslateFn = (key: TranslationKey, params?: Record<string, string | number>) => string;

type EventDetailInfoTabProps = {
  event: EventDetail;
  t: TranslateFn;
  locale: string;
  eventStartTime: string;
  eventLocationLabel: string;
  eventAddressLabel: string;
  onOpenPlace: () => void;
  onContactOrganizer: () => void;
};

export default function EventDetailInfoTab({
  event,
  t,
  locale,
  eventStartTime,
  eventLocationLabel,
  eventAddressLabel,
  onOpenPlace,
  onContactOrganizer,
}: EventDetailInfoTabProps) {
  const authorRole = (event.User?.role || '').toUpperCase();
  const isHangOutHubAdminPublisher = authorRole === 'ADMIN' || authorRole === 'SUPER_ADMIN';
  const authorSectionLabel = isHangOutHubAdminPublisher
    ? t('placeDetailPublishedBy')
    : t('eventDetailOrganizer');

  return (
    <View className="pt-5">
      <View className="mt-5 flex-row items-start">
        <Ionicons name="calendar-outline" size={20} color="#ff4757" />
        <View className="ml-3 flex-1">
          <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('eventDetailStart')}
          </Text>
          <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
            {formatEventDate(eventStartTime, locale, {
              includeWeekday: true,
              fallback: t('eventDetailDateToConfirm'),
            })}
          </Text>
        </View>
      </View>

      <View className="mt-5 flex-row items-start">
        <Ionicons name="location-outline" size={20} color="#ff4757" />
        <View className="ml-3 flex-1">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {t('eventDetailPlace')}
              </Text>
              <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                {eventLocationLabel}
                {event.Place?.City?.name ? ` — ${event.Place.City.name}` : ''}
              </Text>
              <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {t('eventDetailAddressLabel')}: {eventAddressLabel}
              </Text>
            </View>
            {event.Place ? (
              <TouchableOpacity
                onPress={onOpenPlace}
                className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 dark:border-emerald-900/40 dark:bg-emerald-900/25"
              >
                <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-200">
                  {t('eventDetailViewPlace')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      <View className="mt-5 flex-row items-start">
        <Ionicons name="person-outline" size={20} color="#f39c12" />
        <View className="ml-3 flex-1">
          <View className="flex-row items-start justify-between gap-3">
            <View className="flex-1">
              <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {authorSectionLabel}
              </Text>
              <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                {event.User?.displayName ||
                  event.User?.username ||
                  t('eventDetailUnknownOrganizer')}
              </Text>
            </View>
            {event.User?.id ? (
              <TouchableOpacity
                onPress={onContactOrganizer}
                className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 dark:border-blue-900/40 dark:bg-blue-900/25"
              >
                <Text className="text-xs font-semibold text-blue-700 dark:text-blue-200">
                  {t('directChatContactOrganizer')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      <View className="mt-6 rounded-3xl bg-gray-50 p-5 dark:bg-gray-800">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {t('eventDetailAbout')}
        </Text>
        <Text className="mt-4 text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
          {t('eventDetailAboutDescriptionTitle')}
        </Text>
        <Text className="mt-3 text-base leading-7 text-gray-600 dark:text-gray-300">
          {event.description || t('eventDetailDescriptionFallback')}
        </Text>
      </View>
    </View>
  );
}
