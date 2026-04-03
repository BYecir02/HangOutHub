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
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { useI18n } from '@/hooks/use-i18n';
import { useLocationScope } from '@/hooks/useLocationScope';
import CatalogScreenLayout from '@/components/ui/CatalogScreenLayout';
import BottomSheetModal from '@/components/ui/BottomSheetModal';
import EntityCard from '@/components/ui/EntityCard';
import FilterChipsBar, { type FilterChipOption } from '@/components/ui/FilterChipsBar';
import LocationScopeBar from '@/components/ui/LocationScopeBar';
import SearchBar from '@/components/ui/SearchBar';
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
type DiscoverViewMode = 'list' | 'inspiration';

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

function estimateDiscoverCardHeight(index: number) {
  const imageHeights = [182, 240, 208, 262, 194, 228];
  return imageHeights[index % imageHeights.length] + 124;
}

function DiscoverInspirationCard({
  item,
  imageHeight,
  onPress,
}: {
  item: DiscoverItem;
  imageHeight: number;
  onPress: () => void;
}) {
  const isEvent = item.type === 'event';
  const borderColor = item.actionColor;

  return (
    <TouchableOpacity
      onPress={onPress}
      className="mb-4 overflow-hidden rounded-[30px] border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900"
      activeOpacity={0.92}
      style={{
        borderColor,
        borderWidth: 2,
      }}
    >
      <View className="relative">
        <Image
          source={{ uri: item.image }}
          className="w-full bg-gray-200 dark:bg-gray-800"
          style={{ height: imageHeight }}
          resizeMode="cover"
        />

        {isEvent ? (
          <View className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1.5">
            <View className="flex-row items-center">
              <Ionicons name="time-outline" size={10} color="#ffffff" />
              <Text className="ml-1 text-[10px] font-semibold text-white">
                {item.meta}
              </Text>
            </View>
          </View>
        ) : (
          <View className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1.5">
            <Text className="text-[10px] font-semibold text-white">{item.meta}</Text>
          </View>
        )}
      </View>

      <View className="p-4">
        <Text className="text-base font-bold text-gray-900 dark:text-white" numberOfLines={2}>
          {item.title}
        </Text>

        {item.subtitle ? (
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400" numberOfLines={2}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function DiscoverFiltersModal({
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
  activeFilter: DiscoverFilter;
  onChangeFilter: (next: DiscoverFilter) => void;
  viewMode: DiscoverViewMode;
  onChangeViewMode: (next: DiscoverViewMode) => void;
  filterOptions: readonly FilterChipOption<DiscoverFilter>[];
  viewOptions: readonly FilterChipOption<DiscoverViewMode>[];
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
      maxHeight={760}
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
            className="flex-1 items-center rounded-2xl bg-[#f39c12] px-4 py-3"
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
            activeColor="#f39c12"
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

function DiscoverInspirationMasonry({
  items,
  onPressItem,
}: {
  items: DiscoverItem[];
  onPressItem: (item: DiscoverItem) => void;
}) {
  const columns = useMemo(() => {
    const nextColumns: Array<Array<{ item: DiscoverItem; imageHeight: number }>> = [
      [],
      [],
    ];
    const columnHeights = [0, 0];

    items.forEach((item, index) => {
      const imageHeight = [182, 240, 208, 262, 194, 228][index % 6];
      const targetColumn = columnHeights[0] <= columnHeights[1] ? 0 : 1;
      nextColumns[targetColumn].push({ item, imageHeight });
      columnHeights[targetColumn] += estimateDiscoverCardHeight(index);
    });

    return nextColumns;
  }, [items]);

  return (
    <View className="flex-row items-start gap-3">
      {columns.map((column, columnIndex) => (
        <View key={`discover-column-${columnIndex}`} className="min-w-0 flex-1">
          {column.map(({ item, imageHeight }) => (
            <DiscoverInspirationCard
              key={item.id}
              item={item}
              imageHeight={imageHeight}
              onPress={() => onPressItem(item)}
            />
          ))}
        </View>
      ))}
    </View>
  );
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<DiscoverFilter>('all');
  const [viewMode, setViewMode] = useState<DiscoverViewMode>('inspiration');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const { filterByLocation, locationValueLabel } = useLocationScope({
    defaultCountry: t('homeLocationCountry'),
    currentLabel: t('homeLocationCurrentLabel'),
    allCitiesLabel: t('homeLocationAllCities'),
    allCountriesLabel: t('homeLocationAllCountries'),
  });

  const fetchDiscoverData = useCallback(
    async (forceRefresh = false) => {
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
    },
    [t],
  );

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

  const viewOptions = useMemo<readonly FilterChipOption<DiscoverViewMode>[]>(
    () => [
      { key: 'list', label: t('discoverViewList') },
      { key: 'inspiration', label: t('discoverViewInspiration') },
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
      subtitle: event.Place?.name || event.address || '',
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
        subtitle: place.City?.name || place.address || '',
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
      if (activeFilter === 'events' && item.type !== 'event') {
        return false;
      }

      if (activeFilter === 'places' && item.type !== 'place') {
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

  const handlePressItem = useCallback(
    (item: DiscoverItem) => {
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
      );
    },
    [router],
  );

  return (
    <CatalogScreenLayout
      label={t('discoverLabel')}
      title={t('discoverTitle')}
      subtitle={t('discoverSubtitle')}
      onBack={() => router.back()}
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
              <Ionicons name="options-outline" size={14} color="#f39c12" />
              <Text className="ml-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
                {t('discoverFiltersQuickAction')}
              </Text>
            </TouchableOpacity>
          }
        />
      }
    >
      <DiscoverFiltersModal
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
        searchPlaceholder={t('discoverSearchPlaceholder')}
        resetLabel={t('discoverFiltersReset')}
        closeLabel={t('discoverFiltersClose')}
        title={t('discoverFiltersTitle')}
        description={t('discoverFiltersDescription')}
        searchSectionLabel={t('discoverFiltersSearchSection')}
        filterSectionLabel={t('discoverFiltersCategorySection')}
        viewSectionLabel={t('discoverFiltersViewSection')}
      />

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
      ) : viewMode === 'inspiration' ? (
        <ScrollView
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void fetchDiscoverData(true);
              }}
              tintColor="#f39c12"
            />
          }
          contentContainerStyle={{
            paddingHorizontal: uiTokens.spacing.screenX,
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="pb-4 text-sm text-gray-500 dark:text-gray-400">
            {t('discoverSuggestionsCount', { count: filteredItems.length })}
          </Text>

          {filteredItems.length === 0 ? (
            <View className="items-center rounded-3xl bg-white px-6 py-12 dark:bg-gray-900">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('discoverEmptyTitle')}
              </Text>
              <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
                {t('discoverEmptyDescription')}
              </Text>
            </View>
          ) : (
            <DiscoverInspirationMasonry
              items={filteredItems}
              onPressItem={handlePressItem}
            />
          )}
        </ScrollView>
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
              subtitle={item.subtitle || undefined}
              badge={{ label: item.badge, color: item.actionColor }}
              meta={item.meta}
              onPress={() => handlePressItem(item)}
            />
          )}
        />
      )}
    </CatalogScreenLayout>
  );
}
