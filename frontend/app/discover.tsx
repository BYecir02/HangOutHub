import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { useI18n } from '@/hooks/use-i18n';
import SearchBar from '@/components/ui/SearchBar';
import api, { getImageUrl } from '@/services/api';
import { getCache, setCache } from '@/services/dataCache';
import { SkeletonBlock } from '@/components/ui/Skeleton';

interface DiscoverEvent {
  id: string;
  title: string;
  startTime: string;
  coverUrl: string | null;
  entryFee: number | string | null;
  Place?: {
    id?: string;
    name?: string | null;
  } | null;
  address?: string | null;
}

interface DiscoverPlace {
  id: string;
  name: string;
  coverUrl: string | null;
  avgRating?: number | null;
  City?: {
    name?: string | null;
  } | null;
  address?: string | null;
}

type DiscoverFilter = 'all' | 'events' | 'places';

type DiscoverItem =
  | {
      id: string;
      type: 'event';
      title: string;
      subtitle: string;
      meta: string;
      image: string;
      badge: string;
      actionColor: string;
      targetId: string;
    }
  | {
      id: string;
      type: 'place';
      title: string;
      subtitle: string;
      meta: string;
      image: string;
      badge: string;
      actionColor: string;
      targetId: string;
    };

const EVENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200';
const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';

const FILTERS: DiscoverFilter[] = ['all', 'events', 'places'];

function formatEventDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function DiscoverScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const cachedDiscover = getCache<{
    events: DiscoverEvent[];
    places: DiscoverPlace[];
  }>('discover');
  const [events, setEvents] = useState<DiscoverEvent[]>(
    cachedDiscover?.events ?? [],
  );
  const [places, setPlaces] = useState<DiscoverPlace[]>(
    cachedDiscover?.places ?? [],
  );
  const [loading, setLoading] = useState(!cachedDiscover);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<DiscoverFilter>('all');

  const fetchDiscoverData = useCallback(async (forceRefresh = false) => {
    const isRefresh = forceRefresh || getCache('discover') !== null;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    const results = await Promise.allSettled([
      api.get<DiscoverEvent[]>('/events'),
      api.get<DiscoverPlace[]>('/places'),
    ]);

    const [eventsResult, placesResult] = results;
    const nextEvents =
      eventsResult.status === 'fulfilled' ? eventsResult.value.data : [];
    const nextPlaces =
      placesResult.status === 'fulfilled' ? placesResult.value.data : [];

    setEvents(nextEvents);
    setPlaces(nextPlaces);
    setCache('discover', { events: nextEvents, places: nextPlaces });
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void fetchDiscoverData();
  }, [fetchDiscoverData]);

  useFocusEffect(
    useCallback(() => {
      void fetchDiscoverData(true);
    }, [fetchDiscoverData]),
  );

  const filterLabels: Record<DiscoverFilter, string> = {
    all: t('discoverFilterAll'),
    events: t('discoverFilterEvents'),
    places: t('discoverFilterPlaces'),
  };

  const discoverItems = useMemo<DiscoverItem[]>(() => {
    const topEvents = events.slice(0, 6).map((event) => ({
      id: `event-${event.id}`,
      type: 'event' as const,
      title: event.title,
      subtitle: event.Place?.name || event.address || t('homeLocationToConfirm'),
      meta: formatEventDate(event.startTime, locale),
      image: getImageUrl(event.coverUrl) || EVENT_PLACEHOLDER,
      badge:
        Number(event.entryFee || 0) > 0
          ? t('discoverEventBadge')
          : t('discoverEventBadgeFree'),
      actionColor: '#ff4757',
      targetId: event.id,
    }));

    const topPlaces = [...places]
      .sort((left, right) => (right.avgRating || 0) - (left.avgRating || 0))
      .slice(0, 6)
      .map((place) => ({
        id: `place-${place.id}`,
        type: 'place' as const,
        title: place.name,
        subtitle: place.City?.name || place.address || t('homeAddressToConfirm'),
        meta:
          typeof place.avgRating === 'number' && place.avgRating > 0
            ? t('discoverPlaceMetaRated', { rating: place.avgRating.toFixed(1) })
            : t('discoverPlaceMetaDiscover'),
        image: getImageUrl(place.coverUrl) || PLACE_PLACEHOLDER,
        badge: t('discoverPlaceBadge'),
        actionColor: '#2ecc71',
        targetId: place.id,
      }));

    return [...topEvents, ...topPlaces];
  }, [events, locale, places, t]);

  const filteredItems = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return discoverItems.filter((item) => {
      if (activeFilter !== 'all' && item.type !== activeFilter.slice(0, -1)) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return `${item.title} ${item.subtitle} ${item.meta}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [activeFilter, discoverItems, query]);

  return (
    <View className="flex-1 bg-gray-50 pt-16 dark:bg-black">
      <View className="px-5 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-4 rounded-full bg-white p-3 dark:bg-gray-900"
          >
            <Ionicons name="arrow-back" size={22} color="#f39c12" />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-xs uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
              {t('discoverLabel')}
            </Text>
            <Text className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {t('discoverTitle')}
            </Text>
            <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('discoverSubtitle')}
            </Text>
          </View>
        </View>
      </View>

      <SearchBar
        placeholder={t('discoverSearchPlaceholder')}
        value={query}
        onChangeText={setQuery}
      />

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(item) => item}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: 10,
        }}
        renderItem={({ item }) => {
          const active = activeFilter === item;

          return (
            <TouchableOpacity
              onPress={() => setActiveFilter(item)}
              className="mr-3 rounded-full bg-white px-4 py-2.5 dark:bg-gray-900"
              style={active ? { backgroundColor: '#f39c12' } : undefined}
            >
              <Text
                className={`text-sm font-semibold ${
                  active
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                {filterLabels[item]}
              </Text>
            </TouchableOpacity>
          );
        }}
        style={{ flexGrow: 0 }}
      />

      {loading && discoverItems.length === 0 ? (
        <FlatList
          data={[0, 1, 2]}
          keyExtractor={(item) => `skeleton-${item}`}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          ListHeaderComponent={
            <Text className="pb-4 text-sm text-gray-500 dark:text-gray-400">
              {t('discoverLoading')}
            </Text>
          }
          renderItem={() => (
            <View className="flex-row overflow-hidden rounded-[28px] border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <SkeletonBlock className="h-28 w-28 rounded-2xl" />
              <View className="ml-4 flex-1 justify-between py-1">
                <View>
                  <SkeletonBlock className="h-6 w-24 rounded-full" />
                  <SkeletonBlock className="mt-3 h-5 w-3/4 rounded-lg" />
                  <SkeletonBlock className="mt-2 h-4 w-2/3 rounded-lg" />
                </View>
                <View className="mt-3 flex-row items-center justify-between">
                  <SkeletonBlock className="h-4 w-20 rounded-lg" />
                  <SkeletonBlock className="h-6 w-6 rounded-full" />
                </View>
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          ListHeaderComponent={
            <Text className="pb-4 text-sm text-gray-500 dark:text-gray-400">
              {t('discoverSuggestionsCount', { count: filteredItems.length })}
            </Text>
          }
          ListEmptyComponent={
            <View className="items-center rounded-3xl bg-white px-6 py-12 dark:bg-gray-900">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('discoverEmptyTitle')}
              </Text>
              <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
                {t('discoverEmptyDescription')}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void fetchDiscoverData(true);
              }}
              tintColor="#f39c12"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push(
                  item.type === 'event'
                    ? {
                        pathname: '/event/[id]',
                        params: { id: item.targetId },
                      }
                    : {
                        pathname: '/place/[id]',
                        params: { id: item.targetId },
                      },
                )
              }
              className="flex-row overflow-hidden rounded-[28px] border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
            >
              <Image
                source={{ uri: item.image }}
                className="h-28 w-28 rounded-2xl bg-gray-200 dark:bg-gray-800"
                resizeMode="cover"
              />

              <View className="ml-4 flex-1 justify-between py-1">
                <View>
                  <View
                    className="self-start rounded-full px-3 py-1.5"
                    style={{ backgroundColor: `${item.actionColor}20` }}
                  >
                    <Text
                      className="text-xs font-semibold"
                      style={{ color: item.actionColor }}
                    >
                      {item.badge}
                    </Text>
                  </View>

                  <Text
                    className="mt-3 text-lg font-bold text-gray-900 dark:text-white"
                    numberOfLines={2}
                  >
                    {item.title}
                  </Text>
                  <Text
                    className="mt-1 text-sm text-gray-500 dark:text-gray-400"
                    numberOfLines={1}
                  >
                    {item.subtitle}
                  </Text>
                </View>

                <View className="mt-3 flex-row items-center justify-between">
                  <Text className="text-sm font-medium text-gray-600 dark:text-gray-300">
                    {item.meta}
                  </Text>
                  <Ionicons
                    name="arrow-forward-circle"
                    size={24}
                    color={item.actionColor}
                  />
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
