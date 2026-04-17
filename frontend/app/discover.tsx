import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
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
import MediaFrame from '@/components/ui/MediaFrame';
import CatalogScreenLayout from '@/components/ui/CatalogScreenLayout';
import BottomSheetModal from '@/components/ui/BottomSheetModal';
import { EntityRowCard } from '@/components/ui/EntityCard';
import FilterChipsBar, { type FilterChipOption } from '@/components/ui/FilterChipsBar';
import MasonryGrid from '@/components/ui/MasonryGrid';
import LocationScopeBar from '@/components/ui/LocationScopeBar';
import SearchBar from '@/components/ui/SearchBar';
import EventInspirationCard from '@/components/ui/EventInspirationCard';
import PlaceInspirationCard from '@/components/ui/PlaceInspirationCard';
import ScreenState from '@/components/ui/ScreenState';
import api, {
  clearAuthState,
  getApiErrorMessage,
  getImageUrl,
  storage,
} from '@/services/api';
import { getCache, setCache } from '@/services/dataCache';
import { formatEventCardPriceLabel, formatEventDate } from '@/services/formatters';
import { getRecommendationOnboardingPreferences } from '@/services/recommendation-onboarding';
import { resolveStoredUserSession } from '@/services/user-session';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { uiTokens } from '@/theme/tokens';
import { useVisibleItemAutoplay } from '@/hooks/useVisibleItemAutoplay';

interface DiscoverEvent {
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
      id?: number | null;
      name?: string | null;
      country?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    } | null;
  } | null;
  address?: string | null;
  City?: {
    id?: number | null;
    name?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  EventTag?: Array<{
    tagId?: number | null;
    Tag?: {
      id?: number | null;
    } | null;
  } | null>;
}

interface DiscoverPlace {
  id: string;
  name: string;
  coverUrl: string | null;
  avgRating?: number | null;
  City?: {
    id?: number | null;
    name?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  address?: string | null;
  PlaceTag?: Array<{
    tagId?: number | null;
    Tag?: {
      id?: number | null;
    } | null;
  } | null>;
}

type DiscoverFilter = 'all' | 'events' | 'places';
type DiscoverViewMode = 'list' | 'inspiration';

type RecommendationPreferencesSnapshot = {
  tagIds: number[];
  cityIds: number[];
  budget: 'low' | 'medium' | 'high';
  radiusKm: 2 | 5 | 10 | 20 | 'unlimited';
};

type StoredLocationLike = {
  cityId?: number | null;
  cityName?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
} | null;

type CandidateLocation = {
  cityId?: number | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type CandidateTagRelation = {
  tagId?: number | null;
  Tag?: {
    id?: number | null;
  } | null;
} | null;

function normalizeText(value?: string | null): string {
  return value?.trim().toLowerCase() || '';
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function extractCandidateTagIds(relations?: CandidateTagRelation[] | null): number[] {
  if (!Array.isArray(relations)) {
    return [];
  }

  return relations
    .map((relation) => relation?.tagId ?? relation?.Tag?.id ?? null)
    .filter((value): value is number => typeof value === 'number');
}

function getCandidateLocation(candidate: {
  Place?: { City?: DiscoverEvent['Place'] extends infer P ? P extends { City?: infer C } ? C : never : never } | null;
  City?: DiscoverPlace['City'];
}): CandidateLocation {
  const sourceLocation = candidate.Place?.City || candidate.City || null;

  return {
    cityId: sourceLocation?.id ?? null,
    city: sourceLocation?.name ?? null,
    country: sourceLocation?.country ?? null,
    latitude: sourceLocation?.latitude ?? null,
    longitude: sourceLocation?.longitude ?? null,
  };
}

function haversineDistanceKm(
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number,
): number {
  const earthRadiusKm = 6371;
  const latitudeDelta = ((endLatitude - startLatitude) * Math.PI) / 180;
  const longitudeDelta = ((endLongitude - startLongitude) * Math.PI) / 180;
  const startLatitudeRadians = (startLatitude * Math.PI) / 180;
  const endLatitudeRadians = (endLatitude * Math.PI) / 180;

  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2) *
      Math.cos(startLatitudeRadians) *
      Math.cos(endLatitudeRadians);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreLocationMatch(
  selectedLocation: StoredLocationLike,
  candidate: CandidateLocation,
): number {
  if (!selectedLocation) {
    return 0;
  }

  let score = 0;

  if (
    typeof selectedLocation.cityId === 'number' &&
    typeof candidate.cityId === 'number' &&
    selectedLocation.cityId === candidate.cityId
  ) {
    score += 5;
  } else if (
    normalizeText(selectedLocation.cityName) &&
    normalizeText(candidate.city) &&
    normalizeText(selectedLocation.cityName) === normalizeText(candidate.city)
  ) {
    score += 3.5;
  }

  if (
    normalizeText(selectedLocation.country) &&
    normalizeText(candidate.country) &&
    normalizeText(selectedLocation.country) === normalizeText(candidate.country)
  ) {
    score += 1.5;
  }

  return score;
}

function scoreRadiusMatch(
  selectedLocation: StoredLocationLike,
  candidate: CandidateLocation,
  radiusKm: RecommendationPreferencesSnapshot['radiusKm'],
): number {
  if (radiusKm === 'unlimited') {
    return 0;
  }

  const selectedLatitude = toFiniteNumber(selectedLocation?.latitude);
  const selectedLongitude = toFiniteNumber(selectedLocation?.longitude);
  const candidateLatitude = toFiniteNumber(candidate.latitude);
  const candidateLongitude = toFiniteNumber(candidate.longitude);

  if (
    selectedLatitude === null ||
    selectedLongitude === null ||
    candidateLatitude === null ||
    candidateLongitude === null
  ) {
    return 0;
  }

  const distanceKm = haversineDistanceKm(
    selectedLatitude,
    selectedLongitude,
    candidateLatitude,
    candidateLongitude,
  );

  if (distanceKm <= radiusKm) {
    return 3;
  }

  if (distanceKm <= radiusKm * 2) {
    return 1;
  }

  return -1;
}

function getEventBasePrice(event: DiscoverEvent): number | null {
  const ticketPrices = (event.TicketType || [])
    .map((ticketType) => toFiniteNumber(ticketType.price))
    .filter((value): value is number => value !== null);

  if (ticketPrices.length > 0) {
    return Math.min(...ticketPrices);
  }

  return toFiniteNumber(event.entryFee);
}

function scoreBudgetMatch(
  price: number | null,
  budget: RecommendationPreferencesSnapshot['budget'],
): number {
  if (price === null) {
    return 0;
  }

  const priceBand = price <= 15 ? 'low' : price <= 45 ? 'medium' : 'high';

  if (priceBand === budget) {
    return 3;
  }

  if (budget === 'medium' && priceBand !== 'high') {
    return 1.5;
  }

  if (budget === 'low' && priceBand === 'medium') {
    return 1;
  }

  if (budget === 'high' && priceBand === 'medium') {
    return 1;
  }

  return 0.5;
}

function scoreTagMatch(candidateTagIds: number[], preferredTagIds: Set<number>): number {
  if (preferredTagIds.size === 0 || candidateTagIds.length === 0) {
    return 0;
  }

  let matches = 0;

  for (const tagId of candidateTagIds) {
    if (preferredTagIds.has(tagId)) {
      matches += 1;
    }
  }

  return matches * 6;
}

function scoreSoonness(startTime: string): number {
  const startDate = new Date(startTime);

  if (Number.isNaN(startDate.getTime())) {
    return 0;
  }

  const diffDays = (startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

  if (diffDays <= 2) {
    return 2;
  }

  if (diffDays <= 7) {
    return 1;
  }

  return 0;
}

function scoreRatingMatch(avgRating?: number | null): number {
  if (typeof avgRating !== 'number' || !Number.isFinite(avgRating)) {
    return 0;
  }

  return Math.min(avgRating, 5) * 0.75;
}

function scoreDiscoverEvent(
  event: DiscoverEvent,
  selectedLocation: StoredLocationLike,
  preferences: RecommendationPreferencesSnapshot,
  preferredTagSet: Set<number>,
): number {
  const candidateLocation = getCandidateLocation(event);
  const candidateTagIds = extractCandidateTagIds(event.EventTag);

  return (
    scoreTagMatch(candidateTagIds, preferredTagSet) +
    (preferences.cityIds.includes(candidateLocation.cityId || -1) ? 4 : 0) +
    scoreLocationMatch(selectedLocation, candidateLocation) +
    scoreRadiusMatch(selectedLocation, candidateLocation, preferences.radiusKm) +
    scoreBudgetMatch(getEventBasePrice(event), preferences.budget) +
    scoreSoonness(event.startTime)
  );
}

function scoreDiscoverPlace(
  place: DiscoverPlace,
  selectedLocation: StoredLocationLike,
  preferences: RecommendationPreferencesSnapshot,
  preferredTagSet: Set<number>,
): number {
  const candidateLocation = getCandidateLocation(place);
  const candidateTagIds = extractCandidateTagIds(place.PlaceTag);

  return (
    scoreTagMatch(candidateTagIds, preferredTagSet) +
    (preferences.cityIds.includes(candidateLocation.cityId || -1) ? 4 : 0) +
    scoreLocationMatch(selectedLocation, candidateLocation) +
    scoreRadiusMatch(selectedLocation, candidateLocation, preferences.radiusKm) +
    scoreRatingMatch(place.avgRating)
  );
}

type DiscoverItem =
  | {
      id: string;
      type: 'event';
  event: DiscoverEvent;
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
      place: DiscoverPlace;
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
  shouldPlay = false,
  onPress,
}: {
  item: DiscoverItem;
  imageHeight: number;
  shouldPlay?: boolean;
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
        <MediaFrame
          source={item.image}
          className="w-full bg-gray-200 dark:bg-gray-800"
          style={{ height: imageHeight }}
          shouldPlay={shouldPlay}
          adaptiveHeight
          minHeight={imageHeight}
          maxHeight={380}
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
  activeItemId,
  registerLayout,
  onPressItem,
  savedPlaceIds,
  savingPlaceIds,
  onTogglePlaceSave,
  locale,
  freeLabel,
  soldOutLabel,
}: {
  items: DiscoverItem[];
  activeItemId: string | null;
  registerLayout: (id: string, layout: { y: number; height: number }) => void;
  onPressItem: (item: DiscoverItem) => void;
  savedPlaceIds: Set<string>;
  savingPlaceIds: Set<string>;
  onTogglePlaceSave: (placeId: string) => void;
  locale: string;
  freeLabel: string;
  soldOutLabel: string;
}) {
  return (
    <MasonryGrid
      items={items}
      getKey={(item) => item.id}
      estimateItemHeight={(_, index) => estimateDiscoverCardHeight(index)}
      onItemLayout={(item, layout) => {
        registerLayout(item.id, layout);
      }}
      renderItem={(item, index) => {
        const imageHeights = [182, 240, 208, 262, 194, 228];

        if (item.type === 'event') {
          return (
            <EventInspirationCard
              event={item.event}
              imageHeight={imageHeights[index % imageHeights.length]}
              cityLabel={item.event.City?.name || item.event.Place?.City?.name || ''}
              placeLabel={item.event.Place?.name || item.event.address || ''}
              dateLabel={formatEventDate(item.event.startTime, locale, {
                includeWeekday: true,
              })}
              priceLabel={formatEventCardPriceLabel(item.event, locale, {
                freeLabel,
                soldOutLabel,
              })}
              borderColor={item.actionColor}
              onPress={() => onPressItem(item)}
              shouldPlay={activeItemId === item.id}
              adaptiveHeight={false}
            />
          );
        }

        if (item.type === 'place') {
          return (
            <PlaceInspirationCard
              place={item.place}
              imageHeight={imageHeights[index % imageHeights.length]}
              fallbackNewLabel={item.meta}
              borderColor={item.actionColor}
              onPress={() => onPressItem(item)}
              isSaved={savedPlaceIds.has(item.place.id)}
              onToggleSave={() => void handleTogglePlaceSave(item.place.id)}
              saving={savingPlaceIds.has(item.place.id)}
              shouldPlay={activeItemId === item.id}
              adaptiveHeight={false}
            />
          );
        }
      }}
    />
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
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());
  const [savingPlaceIds, setSavingPlaceIds] = useState<Set<string>>(new Set());
  const [recommendationPreferences, setRecommendationPreferences] = useState<RecommendationPreferencesSnapshot>({
    tagIds: [],
    cityIds: [],
    budget: 'medium',
    radiusKm: 5,
  });
  const { filterByLocation, locationValueLabel, selectedLocation } = useLocationScope({
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
        api.get<DiscoverEvent[]>('/events?upcoming=true'),
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

      try {
        const storedSession = await resolveStoredUserSession();
        const onboardingPreferences = await getRecommendationOnboardingPreferences(
          storedSession?.id || null,
        );

        setRecommendationPreferences({
          tagIds: storedSession?.tagInterestIds || [],
          cityIds: storedSession?.cityInterestIds || [],
          budget: onboardingPreferences.budget,
          radiusKm: onboardingPreferences.radiusKm,
        });
      } catch (error) {
        console.error('Erreur chargement preferences recommandations discover:', error);
        setRecommendationPreferences({
          tagIds: [],
          cityIds: [],
          budget: 'medium',
          radiusKm: 5,
        });
      }
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

  const handleTogglePlaceSave = useCallback(
    async (placeId: string) => {
      const token = await storage.getItem('userToken');

      if (!token) {
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
      } finally {
        setSavingPlaceIds((current) => {
          const next = new Set(current);
          next.delete(placeId);
          return next;
        });
      }
    },
    [router, savingPlaceIds],
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
      city: event.City?.name || event.Place?.City?.name,
      country: event.City?.country || event.Place?.City?.country,
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
    const preferredTagSet = new Set(recommendationPreferences.tagIds);

    const topEvents = [...locationFilteredEvents]
      .map((event) => ({
        event,
        score: scoreDiscoverEvent(
          event,
          selectedLocation,
          recommendationPreferences,
          preferredTagSet,
        ),
      }))
      .sort(
        (left, right) =>
          right.score - left.score ||
          new Date(left.event.startTime).getTime() - new Date(right.event.startTime).getTime(),
      )
      .slice(0, 6)
      .map(({ event }) => ({
        id: `event-${event.id}`,
        type: 'event' as const,
        event,
        title: event.title,
        subtitle: event.Place?.name || event.City?.name || event.address || '',
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
      .map((place) => ({
        place,
        score: scoreDiscoverPlace(
          place,
          selectedLocation,
          recommendationPreferences,
          preferredTagSet,
        ),
      }))
      .sort(
        (left, right) =>
          right.score - left.score ||
          (right.place.avgRating || 0) - (left.place.avgRating || 0),
      )
      .slice(0, 6)
      .map(({ place }) => ({
        id: `place-${place.id}`,
        type: 'place' as const,
        place,
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
  }, [
    locale,
    locationFilteredEvents,
    locationFilteredPlaces,
    recommendationPreferences,
    selectedLocation,
    t,
  ]);

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

  const discoverAutoplay = useVisibleItemAutoplay(filteredItems, (item) => item.id);

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
          onLayout={discoverAutoplay.onLayout}
          onScroll={discoverAutoplay.onScroll}
          scrollEventThrottle={16}
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
              activeItemId={discoverAutoplay.activeId}
              registerLayout={discoverAutoplay.registerLayout}
              onPressItem={handlePressItem}
              savedPlaceIds={savedPlaceIds}
              savingPlaceIds={savingPlaceIds}
              onTogglePlaceSave={handleTogglePlaceSave}
              locale={locale}
              freeLabel={t('homePriceFree')}
              soldOutLabel={t('homePriceSoldOut')}
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
            <ScreenState
              mode="empty"
              variant="plain"
              title={t('discoverEmptyTitle')}
              description={t('discoverEmptyDescription')}
              containerClassName="px-0 py-12"
            />
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
            <EntityRowCard
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
