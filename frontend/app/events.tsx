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
import CatalogScreenLayout from '@/components/ui/CatalogScreenLayout';
import EntityCard from '@/components/ui/EntityCard';
import FilterChipsBar, { type FilterChipOption } from '@/components/ui/FilterChipsBar';
import LocationScopeBar from '@/components/ui/LocationScopeBar';
import SearchBar from '@/components/ui/SearchBar';
import ScreenState from '@/components/ui/ScreenState';
import api, { getApiErrorMessage, getImageUrl } from '@/services/api';
import { getCache, setCache } from '@/services/dataCache';
import { formatEventDate, formatPrice } from '@/services/formatters';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { uiTokens } from '@/theme/tokens';

interface EventItem {
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

type EventFilter = 'all' | 'upcoming' | 'free' | 'week';

const EVENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200';

function isWithinNextWeek(value: string) {
  const eventDate = new Date(value);
  if (Number.isNaN(eventDate.getTime())) {
    return false;
  }

  const now = new Date();
  const dayOfWeek = now.getDay();
  const diffToMonday = (dayOfWeek + 6) % 7;

  const startOfWeek = new Date(now);
  startOfWeek.setHours(0, 0, 0, 0);
  startOfWeek.setDate(startOfWeek.getDate() - diffToMonday);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(endOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  const eventTime = eventDate.getTime();
  const nowTime = now.getTime();

  return eventTime >= nowTime && eventTime <= endOfWeek.getTime();
}

export default function EventsScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const cachedEvents = getCache<EventItem[]>('events');
  const [events, setEvents] = useState<EventItem[]>(cachedEvents ?? []);
  const [loading, setLoading] = useState(!cachedEvents);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<EventFilter>('upcoming');
  const { filterByLocation, locationLabel } = useLocationScope({
    defaultCountry: t('homeLocationCountry'),
    currentLabel: t('homeLocationCurrentLabel'),
    allCitiesLabel: t('homeLocationAllCities'),
    allCountriesLabel: t('homeLocationAllCountries'),
  });

  const fetchEvents = useCallback(async (forceRefresh = false) => {
    const isRefresh = forceRefresh || getCache('events') !== null;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get<EventItem[]>('/events');
      setEvents(response.data);
      setCache('events', response.data);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, t('commonErrorTitle')));
      if (!getCache('events')) {
        setEvents([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  useFocusEffect(
    useCallback(() => {
      void fetchEvents(true);
    }, [fetchEvents]),
  );

  const filterOptions = useMemo<readonly FilterChipOption<EventFilter>[]>(
    () => [
      { key: 'all', label: t('eventsFilterAll') },
      { key: 'upcoming', label: t('eventsFilterUpcoming') },
      { key: 'free', label: t('eventsFilterFree') },
      { key: 'week', label: t('eventsFilterWeek') },
    ],
    [t],
  );

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const locationFilteredEvents = filterByLocation(events, (event) => ({
      city: event.Place?.City?.name,
      country: event.Place?.City?.country,
      address: event.address,
    }));

    return locationFilteredEvents
      .filter((event) => {
        if (activeFilter === 'free' && Number(event.entryFee || 0) > 0) {
          return false;
        }

        if (
          activeFilter === 'upcoming' &&
          new Date(event.startTime).getTime() < Date.now()
        ) {
          return false;
        }

        if (activeFilter === 'week' && !isWithinNextWeek(event.startTime)) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        const searchableText = [
          event.title,
          event.Place?.name,
          event.Place?.City?.name,
          event.address,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .sort(
        (left, right) =>
          new Date(left.startTime).getTime() - new Date(right.startTime).getTime(),
      );
  }, [activeFilter, events, filterByLocation, query]);

  return (
    <CatalogScreenLayout
      label={t('eventsLabel')}
      title={t('eventsTitle')}
      subtitle={t('eventsSubtitle')}
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
          placeholder={t('eventsSearchPlaceholder')}
          value={query}
          onChangeText={setQuery}
        />
      }
      filterBar={
        <FilterChipsBar
          options={filterOptions}
          activeKey={activeFilter}
          onChange={setActiveFilter}
          activeColor="#4c669f"
          textSize="sm"
        />
      }
    >
      {!loading && errorMessage && events.length === 0 ? (
        <ScreenState
          mode="error"
          title={t('commonErrorTitle')}
          description={errorMessage}
          actionLabel={t('commonRetry')}
          onAction={() => {
            void fetchEvents(true);
          }}
          containerClassName="px-5 py-10"
        />
      ) : loading && events.length === 0 ? (
        <FlatList
          data={[0, 1, 2]}
          keyExtractor={(item) => `skeleton-${item}`}
          contentContainerStyle={{
            paddingHorizontal: uiTokens.spacing.screenX,
            paddingBottom: 120,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListHeaderComponent={
            <Text className="pb-4 text-sm text-gray-500 dark:text-gray-400">
              {t('eventsLoading')}
            </Text>
          }
          renderItem={() => (
            <View className="overflow-hidden rounded-[28px] border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
              <SkeletonBlock className="h-52 w-full" />
              <View className="p-5">
                <View className="flex-row items-center">
                  <SkeletonBlock className="mr-3 h-8 w-24 rounded-full" />
                  <SkeletonBlock className="h-8 w-24 rounded-full" />
                </View>
                <SkeletonBlock className="mt-4 h-6 w-2/3 rounded-lg" />
                <View className="mt-3 flex-row items-center">
                  <SkeletonBlock className="h-4 w-4 rounded-full" />
                  <SkeletonBlock className="ml-2 h-4 w-32 rounded-lg" />
                </View>
                <View className="mt-2 flex-row items-center">
                  <SkeletonBlock className="h-4 w-4 rounded-full" />
                  <SkeletonBlock className="ml-2 h-4 w-40 rounded-lg" />
                </View>
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: uiTokens.spacing.screenX,
            paddingBottom: 120,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListHeaderComponent={
            <Text className="pb-4 text-sm text-gray-500 dark:text-gray-400">
              {t('eventsResultsCount', { count: filteredEvents.length })}
            </Text>
          }
          ListEmptyComponent={
            <View className="items-center rounded-3xl bg-white px-6 py-12 dark:bg-gray-900">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('eventsEmptyTitle')}
              </Text>
              <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
                {t('eventsEmptyDescription')}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void fetchEvents(true);
              }}
              tintColor="#4c669f"
            />
          }
          renderItem={({ item }) => (
            <EntityCard
              variant="cover"
              imageUrl={getImageUrl(item.coverUrl) || EVENT_PLACEHOLDER}
              title={item.title}
              onPress={() =>
                router.push({
                  pathname: '/event/[id]',
                  params: { id: item.id },
                })
              }
              topContent={
                <View className="flex-row flex-wrap items-center gap-2">
                  <View className="rounded-full bg-red-100 px-3 py-2 dark:bg-red-900/30">
                    <Text className="text-xs font-semibold text-red-700 dark:text-red-300">
                      {formatPrice(item.entryFee, locale, { freeLabel: t('homePriceFree') })}
                    </Text>
                  </View>
                  <View className="rounded-full bg-gray-100 px-3 py-2 dark:bg-gray-800">
                    <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      {item.Place?.City?.name || t('eventsCityToConfirm')}
                    </Text>
                  </View>
                </View>
              }
              metaRows={[
                {
                  icon: 'time-outline',
                  iconColor: '#ff4757',
                  text: formatEventDate(item.startTime, locale, { includeWeekday: true }),
                },
                {
                  icon: 'location-outline',
                  iconColor: '#4c669f',
                  text: item.Place?.name || item.address || t('homeLocationToConfirm'),
                },
              ]}
            />
          )}
        />
      )}
    </CatalogScreenLayout>
  );
}

