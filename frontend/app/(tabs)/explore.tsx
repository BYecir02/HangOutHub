import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import EventCard from '@/components/ui/EventCard';
import LocationScopeBar from '@/components/ui/LocationScopeBar';
import SearchBar from '@/components/ui/SearchBar';
import ScreenState from '@/components/ui/ScreenState';
import { useI18n } from '@/hooks/use-i18n';
import { useLocationScope } from '@/hooks/useLocationScope';
import { useScreenAsync } from '@/hooks/useScreenAsync';
import api, { getApiErrorMessage, getImageUrl } from '@/services/api';
import { getCache, setCache } from '@/services/dataCache';
import { formatEventCardPriceLabel, formatEventDate } from '@/services/formatters';
import { SkeletonBlock } from '@/components/ui/Skeleton';

interface EventItem {
  id: string;
  title: string;
  startTime: string;
  coverUrl: string | null;
  entryFee: number | string | null;
  TicketType?: {
    id?: string;
    price: number | string;
    quantity: number;
  }[];
  Place?: {
    name?: string | null;
    address?: string | null;
    City?: {
      name?: string | null;
      country?: string | null;
    } | null;
  } | null;
  address?: string | null;
}

export default function ExploreScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const cachedEvents = getCache<EventItem[]>('events');
  const [events, setEvents] = useState<EventItem[]>(cachedEvents ?? []);
  const [query, setQuery] = useState('');
  const {
    loading,
    refreshing,
    error,
    runInitial,
    runRefresh,
  } = useScreenAsync({
    initialLoading: !cachedEvents,
  });
  const { filterByLocation, locationLabel } = useLocationScope({
    defaultCountry: t('homeLocationCountry'),
    currentLabel: t('homeLocationCurrentLabel'),
    allCitiesLabel: t('homeLocationAllCities'),
    allCountriesLabel: t('homeLocationAllCountries'),
  });

  const fetchEvents = useCallback(
    async (mode: 'initial' | 'refresh' = 'initial') => {
      const runner = mode === 'refresh' ? runRefresh : runInitial;
      const nextEvents = await runner(
        async () => {
          const response = await api.get<EventItem[]>('/events');
          setCache('events', response.data);
          return response.data;
        },
        {
          mapError: (errorValue) =>
            getApiErrorMessage(errorValue, t('commonErrorTitle')),
        },
      );

      if (nextEvents) {
        setEvents(nextEvents);
        return;
      }

      if (!getCache('events')) {
        setEvents([]);
      }
    },
    [runRefresh, runInitial, t],
  );

  useEffect(() => {
    void fetchEvents('initial');
  }, [fetchEvents]);

  useFocusEffect(
    useCallback(() => {
      void fetchEvents('refresh');
    }, [fetchEvents]),
  );

  const filteredEvents = useMemo(() => {
    const locationFilteredEvents = filterByLocation(events, (event) => ({
      city: event.Place?.City?.name || event.Place?.name,
      country: event.Place?.City?.country,
      address: event.Place?.address || event.address,
    }));
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return locationFilteredEvents;
    }

    return locationFilteredEvents.filter((event) =>
      `${event.title} ${event.Place?.name || ''} ${event.address || ''}`
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [events, filterByLocation, query]);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black pt-16">
      <View className="flex-row items-center px-5 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#4c669f" />
        </TouchableOpacity>
        <View>
          <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest">
            {t('exploreLabel')}
          </Text>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            {t('exploreTitle')}
          </Text>
        </View>
      </View>

      <LocationScopeBar
        locationLabel={locationLabel}
        actionLabel={t('homeLocationChangeCta')}
        onPressAction={() => router.push('/location')}
      />

      <SearchBar
        placeholder={t('exploreSearchPlaceholder')}
        value={query}
        onChangeText={setQuery}
      />

      {!loading && error && events.length === 0 ? (
        <ScreenState
          mode="error"
          title={t('commonErrorTitle')}
          description={error}
          actionLabel={t('commonRetry')}
          onAction={() => {
            void fetchEvents('refresh');
          }}
          containerClassName="px-5 py-6"
        />
      ) : null}

      {loading && events.length === 0 ? (
        <FlatList
          data={[0, 1, 2]}
          keyExtractor={(item) => `skeleton-${item}`}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListEmptyComponent={null}
          renderItem={() => (
            <View className="overflow-hidden rounded-[28px] border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
              <SkeletonBlock className="h-52 w-full" />
              <View className="p-5">
                <SkeletonBlock className="h-5 w-40 rounded-lg" />
                <SkeletonBlock className="mt-2 h-4 w-24 rounded-lg" />
                <SkeletonBlock className="mt-3 h-4 w-32 rounded-lg" />
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-lg font-semibold text-gray-800 dark:text-white">
                {t('exploreEmptyTitle')}
              </Text>
              <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
                {t('exploreEmptyDescription')}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void fetchEvents('refresh');
              }}
              tintColor="#4c669f"
            />
          }
          renderItem={({ item }) => (
            <EventCard
              title={item.title}
              date={formatEventDate(item.startTime, locale)}
              location={item.Place?.name || item.address || t('homeLocationToConfirm')}
              imageUrl={
                getImageUrl(item.coverUrl) ||
                'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200'
              }
              price={formatEventCardPriceLabel(item, locale, {
                freeLabel: t('homePriceFree'),
                soldOutLabel: t('homePriceSoldOut'),
              })}
              onPress={() =>
                router.push({
                  pathname: '/event/[id]',
                  params: { id: item.id },
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}
