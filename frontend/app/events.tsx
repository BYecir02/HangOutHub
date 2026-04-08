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
import { EntityCoverCard } from '@/components/ui/EntityCard';
import FilterChipsBar, { type FilterChipOption } from '@/components/ui/FilterChipsBar';
import EventInspirationCard from '@/components/ui/EventInspirationCard';
import MasonryGrid from '@/components/ui/MasonryGrid';
import LocationScopeBar from '@/components/ui/LocationScopeBar';
import SearchBar from '@/components/ui/SearchBar';
import ScreenState from '@/components/ui/ScreenState';
import api, { getApiErrorMessage, getImageUrl } from '@/services/api';
import { getCache, setCache } from '@/services/dataCache';
import { formatEventCardPriceLabel, formatEventDate, formatPrice } from '@/services/formatters';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { uiTokens } from '@/theme/tokens';
import { useVisibleItemAutoplay } from '@/hooks/useVisibleItemAutoplay';

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
type EventViewMode = 'list' | 'inspiration';

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

function estimateEventCardHeight(index: number) {
  const imageHeights = [184, 242, 208, 264, 196, 232];
  return imageHeights[index % imageHeights.length] + 116;
}

function EventFiltersModal({
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
  activeFilter: EventFilter;
  onChangeFilter: (next: EventFilter) => void;
  viewMode: EventViewMode;
  onChangeViewMode: (next: EventViewMode) => void;
  filterOptions: readonly FilterChipOption<EventFilter>[];
  viewOptions: readonly FilterChipOption<EventViewMode>[];
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
            className="flex-1 items-center rounded-2xl bg-[#4c669f] px-4 py-3"
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
            activeColor="#4c669f"
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

function EventInspirationMasonry({
  events,
  onPressEvent,
  fallbackCityLabel,
  fallbackPlaceLabel,
  locale,
  freeLabel,
  soldOutLabel,
  activeItemId,
  registerLayout,
}: {
  events: EventItem[];
  onPressEvent: (event: EventItem) => void;
  fallbackCityLabel: string;
  fallbackPlaceLabel: string;
  locale: 'en-US' | 'fr-FR';
  freeLabel: string;
  soldOutLabel: string;
  activeItemId: string | null;
  registerLayout: (id: string, layout: { y: number; height: number }) => void;
}) {
  return (
    <MasonryGrid
      items={events}
      getKey={(event) => event.id}
      estimateItemHeight={(_, index) => estimateEventCardHeight(index)}
      onItemLayout={(event, layout) => {
        registerLayout(event.id, layout);
      }}
      renderItem={(event, index) => {
        const imageHeights = [184, 242, 208, 264, 196, 232];

        return (
          <EventInspirationCard
            event={event}
            imageHeight={imageHeights[index % imageHeights.length]}
            cityLabel={event.Place?.City?.name || fallbackCityLabel}
            placeLabel={event.Place?.name || event.address || fallbackPlaceLabel}
            dateLabel={formatEventDate(event.startTime, locale, {
              includeWeekday: true,
            })}
            priceLabel={formatEventCardPriceLabel(event, locale, {
              freeLabel,
              soldOutLabel,
            })}
            onPress={() => onPressEvent(event)}
            shouldPlay={activeItemId === event.id}
          />
        );
      }}
    />
  );
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
  const [activeFilter, setActiveFilter] = useState<EventFilter>('all');
  const [viewMode, setViewMode] = useState<EventViewMode>('inspiration');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const { filterByLocation, locationValueLabel } = useLocationScope({
    defaultCountry: t('homeLocationCountry'),
    currentLabel: t('homeLocationCurrentLabel'),
    allCitiesLabel: t('homeLocationAllCities'),
    allCountriesLabel: t('homeLocationAllCountries'),
  });

  const fetchEvents = useCallback(
    async (forceRefresh = false) => {
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
    },
    [t],
  );

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

  const viewOptions = useMemo<readonly FilterChipOption<EventViewMode>[]>(
    () => [
      { key: 'list', label: t('eventsViewList') },
      { key: 'inspiration', label: t('eventsViewInspiration') },
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

  const inspirationAutoplay = useVisibleItemAutoplay(filteredEvents, (event) => event.id);

  const renderListEventItem = useCallback(
    ({ item }: { item: EventItem }) => (
      <EntityCoverCard
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
                {formatEventCardPriceLabel(item, locale, {
                  freeLabel: t('homePriceFree'),
                  soldOutLabel: t('homePriceSoldOut'),
                })}
              </Text>
            </View>
            {item.Place?.City?.name ? (
              <View className="rounded-full bg-gray-100 px-3 py-2 dark:bg-gray-800">
                <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                  {item.Place.City.name}
                </Text>
              </View>
            ) : null}
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
    ),
    [locale, router, t],
  );

  return (
    <CatalogScreenLayout
      label={t('eventsLabel')}
      title={t('eventsTitle')}
      subtitle={t('eventsSubtitle')}
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
              <Ionicons name="options-outline" size={14} color="#4c669f" />
              <Text className="ml-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
                {t('eventsFiltersQuickAction')}
              </Text>
            </TouchableOpacity>
          }
        />
      }
    >
      <EventFiltersModal
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
        searchPlaceholder={t('eventsSearchPlaceholder')}
        resetLabel={t('eventsFiltersReset')}
        closeLabel={t('eventsFiltersClose')}
        title={t('eventsFiltersTitle')}
        description={t('eventsFiltersDescription')}
        searchSectionLabel={t('eventsFiltersSearchSection')}
        filterSectionLabel={t('eventsFiltersSection')}
        viewSectionLabel={t('eventsFiltersViewSection')}
      />

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
      ) : viewMode === 'inspiration' ? (
        <ScrollView
          onLayout={inspirationAutoplay.onLayout}
          onScroll={inspirationAutoplay.onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void fetchEvents(true);
              }}
              tintColor="#4c669f"
            />
          }
          contentContainerStyle={{
            paddingHorizontal: uiTokens.spacing.screenX,
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="pb-4 text-sm text-gray-500 dark:text-gray-400">
            {t('eventsResultsCount', { count: filteredEvents.length })}
          </Text>

          {filteredEvents.length === 0 ? (
            <View className="items-center rounded-3xl bg-white px-6 py-12 dark:bg-gray-900">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('eventsEmptyTitle')}
              </Text>
              <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
                {t('eventsEmptyDescription')}
              </Text>
            </View>
          ) : (
            <EventInspirationMasonry
              events={filteredEvents}
              fallbackCityLabel=""
              fallbackPlaceLabel={t('homeLocationToConfirm')}
              locale={locale}
              freeLabel={t('homePriceFree')}
              soldOutLabel={t('homePriceSoldOut')}
              activeItemId={inspirationAutoplay.activeId}
              registerLayout={inspirationAutoplay.registerLayout}
              onPressEvent={(event) =>
                router.push({
                  pathname: '/event/[id]',
                  params: { id: event.id },
                })
              }
            />
          )}
        </ScrollView>
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
          renderItem={renderListEventItem}
        />
      )}
    </CatalogScreenLayout>
  );
}
