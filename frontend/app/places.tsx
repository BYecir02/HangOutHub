import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useI18n } from '@/hooks/use-i18n';
import SearchBar from '@/components/ui/SearchBar';
import api, { getImageUrl } from '@/services/api';
import { getCache, setCache } from '@/services/dataCache';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { getStoredLocation, type StoredLocation } from '@/services/location-preferences';

interface PlaceItem {
  id: string;
  name: string;
  coverUrl: string | null;
  avgRating?: number | null;
  priceLevel?: number | null;
  City?: {
    name?: string | null;
    country?: string | null;
  } | null;
  address?: string | null;
}

type PlaceFilter = 'all' | 'top' | 'budget';

const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';

const FILTERS: PlaceFilter[] = ['all', 'top', 'budget'];

export default function PlacesScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const cachedPlaces = getCache<PlaceItem[]>('places');
  const [places, setPlaces] = useState<PlaceItem[]>(cachedPlaces ?? []);
  const [loading, setLoading] = useState(!cachedPlaces);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<PlaceFilter>('all');
  const [selectedLocation, setSelectedLocation] =
    useState<StoredLocation | null>(null);

  const fetchPlaces = useCallback(async (forceRefresh = false) => {
    const isRefresh = forceRefresh || getCache('places') !== null;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get<PlaceItem[]>('/places');
      setPlaces(response.data);
      setCache('places', response.data);
    } catch {
      if (!getCache('places')) {
        setPlaces([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchPlaces();
  }, [fetchPlaces]);

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

  const filterLabels: Record<PlaceFilter, string> = {
    all: t('placesFilterAll'),
    top: t('placesFilterTop'),
    budget: t('placesFilterBudget'),
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

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return places
      .filter((place) => {
        if (activeCountry) {
          const placeCountry =
            place.City?.country?.trim().toLowerCase() || defaultCountry;
          if (placeCountry !== activeCountry) {
            return false;
          }
        }

        if (activeCityName) {
          const cityName = place.City?.name?.trim().toLowerCase();
          const address = place.address?.trim().toLowerCase();
          const matchesCity =
            cityName === activeCityName ||
            (!!address && address.includes(activeCityName));
          if (!matchesCity) {
            return false;
          }
        }

        if (activeFilter === 'top' && (place.avgRating || 0) < 4) {
          return false;
        }

        if (activeFilter === 'budget' && (place.priceLevel || 1) > 2) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        const searchableText = [place.name, place.City?.name, place.address]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        return searchableText.includes(normalizedQuery);
      })
      .sort((left, right) => (right.avgRating || 0) - (left.avgRating || 0));
  }, [activeCityName, activeCountry, activeFilter, defaultCountry, places, query]);

  const activeLocationLabel = activeCityName
    ? `${t('homeLocationCurrentLabel')}: ${selectedLocation?.cityName}, ${
        selectedLocation?.country || t('homeLocationCountry')
      }`
    : selectedLocation?.country
      ? `${t('homeLocationCurrentLabel')}: ${t('homeLocationAllCities')} • ${
          selectedLocation.country
        }`
      : `${t('homeLocationCurrentLabel')}: ${t('homeLocationAllCountries')}`;

  return (
    <View className="flex-1 bg-gray-50 pt-16 dark:bg-black">
      <View className="px-5 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-4 rounded-full bg-white p-3 dark:bg-gray-900"
          >
            <Ionicons name="arrow-back" size={22} color="#2ecc71" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-xs uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
              {t('placesLabel')}
            </Text>
            <Text className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {t('placesTitle')}
            </Text>
            <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('placesSubtitle')}
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
        placeholder={t('placesSearchPlaceholder')}
        value={query}
        onChangeText={setQuery}
      />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: 10,
        }}
        style={{ flexGrow: 0 }}
      >
        {FILTERS.map((filter) => {
          const active = activeFilter === filter;

          return (
            <TouchableOpacity
              key={filter}
              onPress={() => setActiveFilter(filter)}
              className="mr-3 rounded-full border border-gray-200 bg-white px-4 py-2.5 dark:border-gray-700 dark:bg-gray-900"
              style={active ? { backgroundColor: '#2ecc71', borderColor: '#2ecc71' } : undefined}
            >
              <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                {filterLabels[filter]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {loading && places.length === 0 ? (
        <FlatList
          data={[0, 1, 2]}
          keyExtractor={(item) => `skeleton-${item}`}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListHeaderComponent={
            <Text className="pb-4 text-sm text-gray-500 dark:text-gray-400">
              {t('placesLoading')}
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
                  <SkeletonBlock className="h-4 w-16 rounded-lg" />
                  <SkeletonBlock className="h-6 w-6 rounded-full" />
                </View>
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={filteredPlaces}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListHeaderComponent={
            <Text className="pb-4 text-sm text-gray-500 dark:text-gray-400">
              {t('placesResultsCount', { count: filteredPlaces.length })}
            </Text>
          }
          ListEmptyComponent={
            <View className="items-center rounded-3xl bg-white px-6 py-12 dark:bg-gray-900">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('placesEmptyTitle')}
              </Text>
              <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
                {t('placesEmptyDescription')}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void fetchPlaces(true);
              }}
              tintColor="#2ecc71"
            />
          }
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/place/[id]',
                  params: { id: item.id },
                })
              }
              className="flex-row overflow-hidden rounded-[28px] border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900"
            >
              <Image
                source={{
                  uri: getImageUrl(item.coverUrl) || PLACE_PLACEHOLDER,
                }}
                className="h-28 w-28 rounded-2xl bg-gray-200 dark:bg-gray-800"
                resizeMode="cover"
              />

              <View className="ml-4 flex-1 justify-between py-1">
                <View>
                  <View className="self-start rounded-full bg-green-100 px-3 py-1.5 dark:bg-green-900/30">
                    <Text className="text-xs font-semibold text-green-700 dark:text-green-300">
                      {item.City?.name || t('placesLocationToDiscover')}
                    </Text>
                  </View>

                  <Text
                    className="mt-3 text-lg font-bold text-gray-900 dark:text-white"
                    numberOfLines={2}
                  >
                    {item.name}
                  </Text>
                  <Text
                    className="mt-1 text-sm text-gray-500 dark:text-gray-400"
                    numberOfLines={2}
                  >
                    {item.address || item.City?.name || t('homeAddressToConfirm')}
                  </Text>
                </View>

                <View className="mt-3 flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="star" size={14} color="#f59e0b" />
                    <Text className="ml-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                      {typeof item.avgRating === 'number' && item.avgRating > 0
                        ? item.avgRating.toFixed(1)
                        : t('placesNewBadge')}
                    </Text>
                  </View>
                  <Ionicons
                    name="arrow-forward-circle"
                    size={24}
                    color="#2ecc71"
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
