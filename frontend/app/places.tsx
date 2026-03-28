import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
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
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { uiTokens } from '@/theme/tokens';

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

export default function PlacesScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const cachedPlaces = getCache<PlaceItem[]>('places');
  const [places, setPlaces] = useState<PlaceItem[]>(cachedPlaces ?? []);
  const [loading, setLoading] = useState(!cachedPlaces);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<PlaceFilter>('all');
  const { filterByLocation, locationLabel } = useLocationScope({
    defaultCountry: t('homeLocationCountry'),
    currentLabel: t('homeLocationCurrentLabel'),
    allCitiesLabel: t('homeLocationAllCities'),
    allCountriesLabel: t('homeLocationAllCountries'),
  });

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
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, t('commonErrorTitle')));
      if (!getCache('places')) {
        setPlaces([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    void fetchPlaces();
  }, [fetchPlaces]);

  useFocusEffect(
    useCallback(() => {
      void fetchPlaces(true);
    }, [fetchPlaces]),
  );

  const filterOptions = useMemo<readonly FilterChipOption<PlaceFilter>[]>(
    () => [
      { key: 'all', label: t('placesFilterAll') },
      { key: 'top', label: t('placesFilterTop') },
      { key: 'budget', label: t('placesFilterBudget') },
    ],
    [t],
  );

  const filteredPlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const locationFilteredPlaces = filterByLocation(places, (place) => ({
      city: place.City?.name,
      country: place.City?.country,
      address: place.address,
    }));

    return locationFilteredPlaces
      .filter((place) => {
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
  }, [activeFilter, filterByLocation, places, query]);

  return (
    <CatalogScreenLayout
      label={t('placesLabel')}
      title={t('placesTitle')}
      subtitle={t('placesSubtitle')}
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
          placeholder={t('placesSearchPlaceholder')}
          value={query}
          onChangeText={setQuery}
        />
      }
      filterBar={
        <FilterChipsBar
          options={filterOptions}
          activeKey={activeFilter}
          onChange={setActiveFilter}
          activeColor="#2ecc71"
        />
      }
    >
      {!loading && errorMessage && places.length === 0 ? (
        <ScreenState
          mode="error"
          title={t('commonErrorTitle')}
          description={errorMessage}
          actionLabel={t('commonRetry')}
          onAction={() => {
            void fetchPlaces(true);
          }}
          containerClassName="px-5 py-10"
        />
      ) : loading && places.length === 0 ? (
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
          contentContainerStyle={{
            paddingHorizontal: uiTokens.spacing.screenX,
            paddingBottom: 120,
          }}
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
            <EntityCard
              imageUrl={getImageUrl(item.coverUrl) || PLACE_PLACEHOLDER}
              title={item.name}
              subtitle={item.address || item.City?.name || t('homeAddressToConfirm')}
              badge={{
                label: item.City?.name || t('placesLocationToDiscover'),
                color: '#2ecc71',
              }}
              footerLeft={
                <View className="flex-row items-center">
                  <Ionicons name="star" size={14} color="#f59e0b" />
                  <Text className="ml-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                    {typeof item.avgRating === 'number' && item.avgRating > 0
                      ? item.avgRating.toFixed(1)
                      : t('placesNewBadge')}
                  </Text>
                </View>
              }
              onPress={() =>
                router.push({
                  pathname: '/place/[id]',
                  params: { id: item.id },
                })
              }
            />
          )}
        />
      )}
    </CatalogScreenLayout>
  );
}

