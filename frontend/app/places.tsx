import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Alert,
  RefreshControl,
  ScrollView,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { useI18n } from '@/hooks/use-i18n';
import { useLocationScope } from '@/hooks/useLocationScope';
import CatalogScreenLayout from '@/components/ui/CatalogScreenLayout';
import BottomSheetModal from '@/components/ui/BottomSheetModal';
import FilterChipsBar, { type FilterChipOption } from '@/components/ui/FilterChipsBar';
import LocationScopeBar from '@/components/ui/LocationScopeBar';
import MasonryGrid from '@/components/ui/MasonryGrid';
import SearchBar from '@/components/ui/SearchBar';
import PlaceCard from '@/components/ui/PlaceCard';
import PlaceInspirationCard from '@/components/ui/PlaceInspirationCard';
import ScreenState from '@/components/ui/ScreenState';
import api, {
  clearAuthState,
  getApiErrorMessage,
  getImageUrl,
  storage,
} from '@/services/api';
import { getCache, setCache } from '@/services/dataCache';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { uiTokens } from '@/theme/tokens';
import { useVisibleItemAutoplay } from '@/hooks/useVisibleItemAutoplay';

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
type PlaceViewMode = 'list' | 'inspiration';

function estimatePlaceCardHeight(index: number) {
  const imageHeights = [184, 248, 210, 276, 196, 232];
  return imageHeights[index % imageHeights.length] + 144;
}

function PlaceFiltersModal({
  visible,
  onClose,
  query,
  onChangeQuery,
  activeFilter,
  onChangeFilter,
  viewMode,
  onChangeViewMode,
  filterOptions,
  viewOptions,
  searchPlaceholder,
  resetLabel,
  closeLabel,
  title,
  description,
  searchSectionLabel,
  filterSectionLabel,
  viewSectionLabel,
}: {
  visible: boolean;
  onClose: () => void;
  query: string;
  onChangeQuery: (text: string) => void;
  activeFilter: PlaceFilter;
  onChangeFilter: (next: PlaceFilter) => void;
  viewMode: PlaceViewMode;
  onChangeViewMode: (next: PlaceViewMode) => void;
  filterOptions: readonly FilterChipOption<PlaceFilter>[];
  viewOptions: readonly FilterChipOption<PlaceViewMode>[];
  searchPlaceholder: string;
  resetLabel: string;
  closeLabel: string;
  title: string;
  description: string;
  searchSectionLabel: string;
  filterSectionLabel: string;
  viewSectionLabel: string;
}) {
  return (
    <BottomSheetModal
      visible={visible}
      onClose={onClose}
      title={title}
      subtitle={description}
      maxHeight={700}
      contentMode="auto"
      footer={
        <View className="flex-row gap-3">
          <TouchableOpacity
              onPress={() => {
                onChangeQuery('');
                onChangeFilter('all');
                onChangeViewMode('inspiration');
              }}
            className="flex-1 items-center rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-800 dark:bg-gray-900"
          >
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {resetLabel}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            className="flex-1 items-center rounded-2xl bg-[#2ecc71] px-4 py-3"
          >
            <Text className="text-sm font-semibold text-white">{closeLabel}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      <View className="gap-5">
        <View className="mb-5">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            {searchSectionLabel}
          </Text>
          <SearchBar
            placeholder={searchPlaceholder}
            value={query}
            onChangeText={onChangeQuery}
          />
        </View>

        <View className="mb-5">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            {filterSectionLabel}
          </Text>
          <FilterChipsBar
            options={filterOptions}
            activeKey={activeFilter}
            onChange={onChangeFilter}
            activeColor="#2ecc71"
            horizontalPadding={0}
            paddingTop={0}
            paddingBottom={0}
          />
        </View>

        <View className="mb-1">
          <Text className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400">
            {viewSectionLabel}
          </Text>
          <View className="flex-row rounded-2xl bg-gray-100 p-1 dark:bg-gray-900">
            {viewOptions.map((option) => {
              const active = viewMode === option.key;

              return (
                <TouchableOpacity
                  key={option.key}
                  onPress={() => onChangeViewMode(option.key)}
                  className="flex-1 items-center rounded-xl px-3 py-3"
                  style={
                    active
                      ? {
                          backgroundColor:
                            option.key === 'list' ? '#2ecc71' : '#4c669f',
                        }
                      : undefined
                  }
                >
                  <Text
                    className={`text-sm font-semibold ${
                      active ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                    }`}
                  >
                    {option.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>
      </View>
    </BottomSheetModal>
  );
}

function PlaceInspirationMasonry({
  places,
  onPressPlace,
  fallbackNewLabel,
  isPlaceSaved,
  isSavingPlace,
  onToggleSavePlace,
  activeItemId,
  registerLayout,
}: {
  places: PlaceItem[];
  onPressPlace: (place: PlaceItem) => void;
  fallbackNewLabel: string;
  isPlaceSaved: (placeId: string) => boolean;
  isSavingPlace: (placeId: string) => boolean;
  onToggleSavePlace: (placeId: string) => void;
  activeItemId: string | null;
  registerLayout: (id: string, layout: { y: number; height: number }) => void;
}) {
  return (
    <MasonryGrid
      items={places}
      getKey={(place) => place.id}
      estimateItemHeight={(_, index) => estimatePlaceCardHeight(index)}
      onItemLayout={(place, layout) => {
        registerLayout(place.id, layout);
      }}
      renderItem={(place, index) => {
        const imageHeights = [184, 248, 210, 276, 196, 232];

        return (
          <PlaceInspirationCard
            place={place}
            imageHeight={imageHeights[index % imageHeights.length]}
            fallbackNewLabel={fallbackNewLabel}
            onPress={() => onPressPlace(place)}
            isSaved={isPlaceSaved(place.id)}
            onToggleSave={() => onToggleSavePlace(place.id)}
            saving={isSavingPlace(place.id)}
            shouldPlay={activeItemId === place.id}
          />
        );
      }}
    />
  );
}

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
  const [viewMode, setViewMode] = useState<PlaceViewMode>('inspiration');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());
  const [savingPlaceIds, setSavingPlaceIds] = useState<Set<string>>(new Set());
  const { filterByLocation, locationLabel, locationValueLabel } = useLocationScope({
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
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as { response?: { status?: number } }).response?.status === 401
      ) {
        await clearAuthState();
        router.replace('/');
        return;
      }

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

  const loadSavedPlaces = useCallback(async () => {
    const token = await storage.getItem('userToken');

    if (!token) {
      setSavedPlaceIds(new Set());
      return;
    }

    try {
      const response = await api.get<{ id: string }[]>('/places/saved/mine');
      setSavedPlaceIds(new Set(response.data.map((place) => place.id)));
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as { response?: { status?: number } }).response?.status === 401
      ) {
        await clearAuthState();
        router.replace('/');
        return;
      }

      setSavedPlaceIds(new Set());
    }
  }, [router]);

  useEffect(() => {
    void loadSavedPlaces();
  }, [loadSavedPlaces]);

  useFocusEffect(
    useCallback(() => {
      void loadSavedPlaces();
    }, [loadSavedPlaces]),
  );

  const filterOptions = useMemo<readonly FilterChipOption<PlaceFilter>[]>(
    () => [
      { key: 'all', label: t('placesFilterAll') },
      { key: 'top', label: t('placesFilterTop') },
      { key: 'budget', label: t('placesFilterBudget') },
    ],
    [t],
  );

  const viewOptions = useMemo<readonly FilterChipOption<PlaceViewMode>[]>(
    () => [
      { key: 'list', label: t('placesViewList') },
      { key: 'inspiration', label: t('placesViewInspiration') },
    ],
    [t],
  );

  const activeFiltersCount = useMemo(() => {
    return [
      query.trim().length > 0,
      activeFilter !== 'all',
      viewMode !== 'inspiration',
    ].filter(Boolean).length;
  }, [activeFilter, query, viewMode]);

  const activeFilterLabel = useMemo(() => {
    if (activeFilter === 'top') {
      return t('placesFilterTop');
    }

    if (activeFilter === 'budget') {
      return t('placesFilterBudget');
    }

    return t('placesFilterAll');
  }, [activeFilter, t]);

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

  const inspirationAutoplay = useVisibleItemAutoplay(filteredPlaces, (place) => place.id);

  const handleTogglePlaceSave = useCallback(
    async (placeId: string) => {
      const token = await storage.getItem('userToken');

      if (!token) {
        Alert.alert(
          t('placeDetailLoginRequiredTitle'),
          t('placeDetailLoginRequiredMessage'),
        );
        return;
      }

      if (savingPlaceIds.has(placeId)) {
        return;
      }

      setSavingPlaceIds((current) => {
        const next = new Set(current);
        next.add(placeId);
        return next;
      });

      try {
        const response = await api.post<{ saved: boolean }>(`/places/${placeId}/save`);
        setSavedPlaceIds((current) => {
          const next = new Set(current);
          if (response.data.saved) {
            next.add(placeId);
          } else {
            next.delete(placeId);
          }
          return next;
        });
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          (error as { response?: { status?: number } }).response?.status === 401
        ) {
          await clearAuthState();
          router.replace('/');
          return;
        }

        Alert.alert(t('commonErrorTitle'), t('placeDetailSaveUpdateFailed'));
      } finally {
        setSavingPlaceIds((current) => {
          const next = new Set(current);
          next.delete(placeId);
          return next;
        });
      }
    },
    [savingPlaceIds, t],
  );

  const renderListPlaceItem = useCallback(
    ({ item }: { item: PlaceItem }) => {
      const cityLabel = item.City?.name?.trim().toLowerCase() || '';
      const addressLabel = item.address?.trim() || '';
      const subtitle =
        addressLabel && addressLabel.toLowerCase() !== cityLabel ? addressLabel : undefined;

      return (
        <PlaceCard
          name={item.name}
          location={subtitle || item.City?.name || t('homeLocationToConfirm')}
          imageUrl={getImageUrl(item.coverUrl)}
          rating={typeof item.avgRating === 'number' && item.avgRating > 0 ? item.avgRating : undefined}
          fallbackRatingLabel={t('placesNewBadge')}
          badgeLabel={item.City?.name || undefined}
          badgeTone="success"
          showSaveButton
          isSaved={savedPlaceIds.has(item.id)}
          saving={savingPlaceIds.has(item.id)}
          onToggleSave={() => {
            void handleTogglePlaceSave(item.id);
          }}
          onPress={() =>
            router.push({
              pathname: '/place/[id]',
              params: { id: item.id },
            })
          }
        />
      );
    },
    [handleTogglePlaceSave, router, t, savedPlaceIds],
  );

  const inspirationColumns = useMemo(() => {
    const nextColumns: Array<Array<{ place: PlaceItem; imageHeight: number }>> = [
      [],
      [],
    ];
    const columnHeights = [0, 0];
    const imageHeights = [184, 248, 210, 276, 196, 232];

    filteredPlaces.forEach((place, index) => {
      const imageHeight = imageHeights[index % imageHeights.length];
      const targetColumn = columnHeights[0] <= columnHeights[1] ? 0 : 1;
      nextColumns[targetColumn].push({ place, imageHeight });
      columnHeights[targetColumn] += estimatePlaceCardHeight(index);
    });

    return nextColumns;
  }, [filteredPlaces]);

  return (
    <CatalogScreenLayout
      label={t('placesLabel')}
      title={t('placesTitle')}
      subtitle={t('placesSubtitle')}
      onBack={() => router.back()}
      withHeroBackground
      locationScopeBar={
        <LocationScopeBar
          locationLabel={locationValueLabel}
          actionLabel={t('homeLocationChangeCta')}
          onPressAction={() => router.push('/location')}
          rightSlot={
            <TouchableOpacity
              onPress={() => setFiltersVisible(true)}
              className="flex-row items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-700 dark:bg-gray-800"
            >
              <Ionicons
                name="options-outline"
                size={14}
                color="#2ecc71"
              />
              <Text className="ml-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
                {t('placesFiltersQuickAction')}
              </Text>
            </TouchableOpacity>
          }
        />
      }
    >
      <PlaceFiltersModal
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        query={query}
        onChangeQuery={setQuery}
        activeFilter={activeFilter}
        onChangeFilter={setActiveFilter}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        filterOptions={filterOptions}
        viewOptions={viewOptions}
        searchPlaceholder={t('placesSearchPlaceholder')}
        resetLabel={t('placesFiltersReset')}
        closeLabel={t('placesFiltersClose')}
        title={t('placesFiltersTitle')}
        description={t('placesFiltersDescription')}
        searchSectionLabel={t('placesFiltersSearchSection')}
        filterSectionLabel={t('placesFiltersCategorySection')}
        viewSectionLabel={t('placesFiltersViewSection')}
      />

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
      ) : viewMode === 'inspiration' ? (
        <ScrollView
          onLayout={inspirationAutoplay.onLayout}
          onScroll={inspirationAutoplay.onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void fetchPlaces(true);
              }}
              tintColor="#2ecc71"
            />
          }
          contentContainerStyle={{
            paddingHorizontal: uiTokens.spacing.screenX,
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="pb-4 text-sm text-gray-500 dark:text-gray-400">
            {t('placesResultsCount', { count: filteredPlaces.length })}
          </Text>

          {filteredPlaces.length === 0 ? (
            <View className="items-center rounded-3xl bg-white px-6 py-12 dark:bg-gray-900">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('placesEmptyTitle')}
              </Text>
              <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
                {t('placesEmptyDescription')}
              </Text>
            </View>
          ) : (
            <PlaceInspirationMasonry
              places={filteredPlaces}
              fallbackNewLabel={t('placesNewBadge')}
              onPressPlace={(place) =>
                router.push({
                  pathname: '/place/[id]',
                  params: { id: place.id },
                })
              }
              isPlaceSaved={(placeId) => savedPlaceIds.has(placeId)}
              isSavingPlace={(placeId) => savingPlaceIds.has(placeId)}
              onToggleSavePlace={handleTogglePlaceSave}
              activeItemId={inspirationAutoplay.activeId}
              registerLayout={inspirationAutoplay.registerLayout}
            />
          )}
        </ScrollView>
      ) : (
        <FlatList
          key="places-list"
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
          renderItem={renderListPlaceItem}
        />
      )}
    </CatalogScreenLayout>
  );
}

