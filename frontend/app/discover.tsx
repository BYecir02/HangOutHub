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
import { getStoredLocation, type StoredLocation } from '@/services/location-preferences';

interface DiscoverEvent {
  id: string;
  title: string;
  startTime: string;
  coverUrl: string | null;
  entryFee: number | string | null;
  Place?: {
    id?: string;
    name?: string | null;
    City?: {
      name?: string | null;
      country?: string | null;
    } | null;
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
    country?: string | null;
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
  const [selectedLocation, setSelectedLocation] =
    useState<StoredLocation | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const hydrateLocation = async () => {
        const storedLocation = await getStoredLocation();
        if (!isMounted) {
          return;
        }

        setSelectedLocation(storedLocation);
      };

      void hydrateLocation();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  const filterLabels: Record<DiscoverFilter, string> = {
    all: t('discoverFilterAll'),
    events: t('discoverFilterEvents'),
    places: t('discoverFilterPlaces'),
  };

  const activeCityName =
    (selectedLocation?.mode === 'city' ||
      (!selectedLocation?.mode && selectedLocation?.cityName)) &&
    selectedLocation.cityName
      ? selectedLocation.cityName.trim().toLowerCase()
      : '';
  const activeCountry =
    selectedLocation?.country?.trim().toLowerCase() || '';
  const defaultCountry = t('homeLocationCountry').trim().toLowerCase();

  const locationFilteredEvents = useMemo(() => {
    if (!activeCityName) {
      if (!activeCountry) {
        return events;
      }

      return events.filter((event) => {
        const eventCountry =
          event.Place?.City?.country?.trim().toLowerCase() ||
          defaultCountry;
        return eventCountry === activeCountry;
      });
    }

    return events.filter((event) => {
      if (activeCountry) {
        const eventCountry =
          event.Place?.City?.country?.trim().toLowerCase() ||
          defaultCountry;
        if (eventCountry !== activeCountry) {
          return false;
        }
      }

      const cityName = event.Place?.City?.name?.trim().toLowerCase();
      const address = event.address?.trim().toLowerCase();
      return (
        cityName === activeCityName ||
        (!!address && address.includes(activeCityName))
      );
    });
  }, [activeCityName, activeCountry, defaultCountry, events]);

  const locationFilteredPlaces = useMemo(() => {
    if (!activeCityName) {
      if (!activeCountry) {
        return places;
      }

      return places.filter((place) => {
        const placeCountry =
          place.City?.country?.trim().toLowerCase() || defaultCountry;
        return placeCountry === activeCountry;
      });
    }

    return places.filter((place) => {
      if (activeCountry) {
        const placeCountry =
          place.City?.country?.trim().toLowerCase() || defaultCountry;
        if (placeCountry !== activeCountry) {
          return false;
        }
      }

      const cityName = place.City?.name?.trim().toLowerCase();
      const address = place.address?.trim().toLowerCase();
      return (
        cityName === activeCityName ||
        (!!address && address.includes(activeCityName))
      );
    });
  }, [activeCityName, activeCountry, defaultCountry, places]);

  const discoverItems = useMemo<DiscoverItem[]>(() => {
    const topEvents = locationFilteredEvents.slice(0, 6).map((event) => ({
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

    const topPlaces = [...locationFilteredPlaces]
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
  }, [locationFilteredEvents, locale, locationFilteredPlaces, t]);

  const activeLocationLabel = activeCityName
    ? `${t('homeLocationCurrentLabel')}: ${selectedLocation?.cityName}, ${
        selectedLocation?.country || t('homeLocationCountry')
      }`
    : selectedLocation?.country
      ? `${t('homeLocationCurrentLabel')}: ${t('homeLocationAllCities')} • ${
          selectedLocation.country
        }`
      : `${t('homeLocationCurrentLabel')}: ${t('homeLocationAllCountries')}`;

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

      <View className="flex-row items-center justify-between px-5 pb-2">
        <View className="rounded-full bg-white px-3 py-1.5 dark:bg-gray-800">
          <Text className="text-xs font-semibold text-gray-600 dark:text-gray-100">
            {activeLocationLabel}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/location')}
          className="rounded-full border border-gray-200 px-3 py-1.5 dark:border-gray-700"
        >
          <Text className="text-xs font-semibold text-gray-600 dark:text-gray-300">
            {t('homeLocationChangeCta')}
          </Text>
        </TouchableOpacity>
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
              className={`mr-3 rounded-full border px-4 py-2.5 ${
                active
                  ? 'border-[#f39c12] bg-[#f39c12]'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  active ? 'text-white' : 'text-gray-700 dark:text-gray-200'
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
