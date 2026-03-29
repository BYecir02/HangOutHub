import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import { useI18n } from '@/hooks/use-i18n';
import { useLocationScope } from '@/hooks/useLocationScope';
import SearchBar from '@/components/ui/SearchBar';
import CatalogScreenLayout from '@/components/ui/CatalogScreenLayout';
import EntityCard from '@/components/ui/EntityCard';
import FilterChipsBar, { type FilterChipOption } from '@/components/ui/FilterChipsBar';
import LocationScopeBar from '@/components/ui/LocationScopeBar';
import ScreenState from '@/components/ui/ScreenState';
import api, { getApiErrorMessage, getImageUrl } from '@/services/api';
import { getCache, setCache } from '@/services/dataCache';
import { formatEventDate } from '@/services/formatters';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { uiTokens } from '@/theme/tokens';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<DiscoverFilter>('all');
  const { filterByLocation, locationLabel } = useLocationScope({
    defaultCountry: t('homeLocationCountry'),
    currentLabel: t('homeLocationCurrentLabel'),
    allCitiesLabel: t('homeLocationAllCities'),
    allCountriesLabel: t('homeLocationAllCountries'),
  });

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

    if (eventsResult.status === 'rejected' && placesResult.status === 'rejected') {
      setErrorMessage(
        getApiErrorMessage(eventsResult.reason, t('commonErrorTitle')),
      );
    } else {
      setErrorMessage(null);
    }

    setEvents(nextEvents);
    setPlaces(nextPlaces);
    setCache('discover', { events: nextEvents, places: nextPlaces });
    setLoading(false);
    setRefreshing(false);
  }, [t]);

  useEffect(() => {
    void fetchDiscoverData();
  }, [fetchDiscoverData]);

  useFocusEffect(
    useCallback(() => {
      void fetchDiscoverData(true);
    }, [fetchDiscoverData]),
  );

  const filterOptions = useMemo<readonly FilterChipOption<DiscoverFilter>[]>(
    () => [
      { key: 'all', label: t('discoverFilterAll') },
      { key: 'events', label: t('discoverFilterEvents') },
      { key: 'places', label: t('discoverFilterPlaces') },
    ],
    [t],
  );

  const locationFilteredEvents = useMemo(() => {
    return filterByLocation(events, (event) => ({
      city: event.Place?.City?.name,
      country: event.Place?.City?.country,
      address: event.address,
    }));
  }, [events, filterByLocation]);

  const locationFilteredPlaces = useMemo(() => {
    return filterByLocation(places, (place) => ({
      city: place.City?.name,
      country: place.City?.country,
      address: place.address,
    }));
  }, [filterByLocation, places]);

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
    <CatalogScreenLayout
      label={t('discoverLabel')}
      title={t('discoverTitle')}
      subtitle={t('discoverSubtitle')}
      onBack={() => router.back()}
      locationScopeBar={
        <LocationScopeBar
          locationLabel={locationLabel}
          actionLabel={t('homeLocationChangeCta')}
          onPressAction={() => router.push('/location')}
        />
      }
      searchBar={
        <SearchBar
          placeholder={t('discoverSearchPlaceholder')}
          value={query}
          onChangeText={setQuery}
        />
      }
      filterBar={
        <FilterChipsBar
          options={filterOptions}
          activeKey={activeFilter}
          onChange={setActiveFilter}
          activeColor="#f39c12"
        />
      }
    >
      {!loading && errorMessage && discoverItems.length === 0 ? (
        <ScreenState
          mode="error"
          title={t('commonErrorTitle')}
          description={errorMessage}
          actionLabel={t('commonRetry')}
          onAction={() => {
            void fetchDiscoverData(true);
          }}
          containerClassName="px-5 py-10"
        />
      ) : loading && discoverItems.length === 0 ? (
        <FlatList
          data={[0, 1, 2]}
          keyExtractor={(item) => `skeleton-${item}`}
          contentContainerStyle={{
            paddingHorizontal: uiTokens.spacing.screenX,
            paddingBottom: 120,
          }}
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
          contentContainerStyle={{
            paddingHorizontal: uiTokens.spacing.screenX,
            paddingBottom: 120,
          }}
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
            <EntityCard
              imageUrl={item.image}
              title={item.title}
              subtitle={item.subtitle}
              badge={{ label: item.badge, color: item.actionColor }}
              meta={item.meta}
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
            />
          )}
        />
      )}
    </CatalogScreenLayout>
  );
}

