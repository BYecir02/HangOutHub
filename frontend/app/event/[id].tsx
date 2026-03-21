import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useI18n } from '@/hooks/use-i18n';
import api, { getImageUrl } from '@/services/api';

interface EventDetail {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime?: string | null;
  coverUrl?: string | null;
  images: string[];
  entryFee?: number | string | null;
  address?: string | null;
  User?: {
    displayName?: string | null;
    username?: string | null;
  } | null;
  Place?: {
    id: string;
    name?: string | null;
    address?: string | null;
    City?: {
      name?: string | null;
    } | null;
  } | null;
}

const EVENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200';

function formatEventDate(
  value: string | null | undefined,
  locale: string,
  fallback: string,
) {
  if (!value) {
    return fallback;
  }

  return new Date(value).toLocaleString(locale, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(
  value: number | string | null | undefined,
  locale: string,
  freeLabel: string,
) {
  const amount = Number(value || 0);
  return amount > 0 ? `${amount.toLocaleString(locale)} FCFA` : freeLabel;
}

export default function EventDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { locale, t } = useI18n();
  const [event, setEvent] = useState<EventDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchEvent = async () => {
      if (!params.id) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const response = await api.get<EventDetail>(`/events/${params.id}`);
        if (isMounted) {
          setEvent(response.data);
        }
      } catch {
        if (isMounted) {
          setEvent(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchEvent();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#ff4757" />
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8 dark:bg-black">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          {t('eventDetailNotFound')}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-[#ff4757] px-5 py-3"
        >
          <Text className="font-semibold text-white">{t('publicProfileBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const heroImage = getImageUrl(event.coverUrl) || EVENT_PLACEHOLDER;
  const gallery =
    event.images?.length > 0
      ? event.images.map((image) => getImageUrl(image) || EVENT_PLACEHOLDER)
      : [heroImage];

  const handleCreateOuting = () => {
    router.push({
      pathname: '/outing',
      params: {
        title: t('eventDetailOutingTitle', { title: event.title }),
        placeId: event.Place?.id || undefined,
        scheduledDate: event.startTime,
        sourceLabel: event.title,
      },
    });
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-black"
      showsVerticalScrollIndicator={false}
    >
      <View className="relative">
        <Image source={{ uri: heroImage }} className="h-80 w-full" resizeMode="cover" />
        <View className="absolute inset-x-0 top-0 flex-row items-center justify-between px-5 pt-14">
          <TouchableOpacity
            onPress={() => router.back()}
            className="rounded-full bg-black/45 p-3"
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View className="rounded-full bg-black/45 px-3 py-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-white">
              {t('eventDetailTypeLabel')}
            </Text>
          </View>
        </View>
      </View>

      <View className="-mt-8 rounded-t-[28px] bg-gray-50 px-5 pt-6 dark:bg-black">
        <Text className="text-3xl font-bold text-gray-900 dark:text-white">
          {event.title}
        </Text>

        <View className="mt-4 flex-row flex-wrap gap-2">
          <View className="rounded-full bg-red-100 px-3 py-2 dark:bg-red-900/30">
            <Text className="text-xs font-semibold text-red-700 dark:text-red-300">
              {formatPrice(event.entryFee, locale, t('homePriceFree'))}
            </Text>
          </View>
          <View className="rounded-full bg-gray-200 px-3 py-2 dark:bg-gray-800">
            <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {event.Place?.City?.name || t('eventDetailCityUnknown')}
            </Text>
          </View>
        </View>

        <View className="mt-6 rounded-3xl bg-white p-5 dark:bg-gray-900">
          <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('eventDetailActionTitle')}
          </Text>
          <Text className="mt-2 text-base leading-7 text-gray-700 dark:text-gray-200">
            {t('eventDetailActionDescription')}
          </Text>

          <View className="mt-4 flex-row gap-3">
            <TouchableOpacity
              onPress={handleCreateOuting}
              className="flex-1 items-center rounded-2xl bg-[#4c669f] px-4 py-4"
            >
              <Text className="text-sm font-semibold text-white">
                {t('profileOrganizeOutingCta')}
              </Text>
            </TouchableOpacity>
            {event.Place ? (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/place/[id]',
                    params: { id: event.Place?.id || '' },
                  })
                }
                className="flex-1 items-center rounded-2xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-700 dark:bg-gray-800"
              >
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {t('eventDetailViewPlace')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <View className="mt-6 rounded-3xl bg-white p-5 dark:bg-gray-900">
          <View className="flex-row items-start">
            <Ionicons name="time-outline" size={20} color="#ff4757" />
            <View className="ml-3 flex-1">
              <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {t('eventDetailStart')}
              </Text>
              <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                {formatEventDate(event.startTime, locale, t('eventDetailDateToConfirm'))}
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-start">
            <Ionicons name="hourglass-outline" size={20} color="#4c669f" />
            <View className="ml-3 flex-1">
              <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {t('eventDetailEnd')}
              </Text>
              <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                {formatEventDate(event.endTime, locale, t('eventDetailDateToConfirm'))}
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-start">
            <Ionicons name="location-outline" size={20} color="#2ecc71" />
            <View className="ml-3 flex-1">
              <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {t('eventDetailPlace')}
              </Text>
              {event.Place ? (
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/place/[id]',
                      params: { id: event.Place?.id || '' },
                    })
                  }
                >
                  <Text className="mt-1 text-base font-semibold text-gray-800 dark:text-gray-100">
                    {event.Place.name || t('homeLocationToConfirm')}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {event.Place.address || event.address || t('homeAddressToConfirm')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                  {event.address || t('homeLocationToConfirm')}
                </Text>
              )}
            </View>
          </View>

          <View className="mt-5 flex-row items-start">
            <Ionicons name="person-outline" size={20} color="#f39c12" />
            <View className="ml-3 flex-1">
              <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {t('eventDetailOrganizer')}
              </Text>
              <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                {event.User?.displayName ||
                  event.User?.username ||
                  t('eventDetailUnknownOrganizer')}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-6">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            {t('eventDetailAbout')}
          </Text>
          <Text className="mt-3 text-base leading-7 text-gray-600 dark:text-gray-300">
            {event.description || t('eventDetailDescriptionFallback')}
          </Text>
        </View>

        <View className="mt-6 pb-24">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            {t('eventDetailGallery')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
          >
            {gallery.map((image, index) => (
              <Image
                key={`${event.id}-gallery-${index}`}
                source={{ uri: image }}
                className="mr-3 h-28 w-40 rounded-2xl bg-gray-200 dark:bg-gray-800"
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        </View>
      </View>
    </ScrollView>
  );
}
