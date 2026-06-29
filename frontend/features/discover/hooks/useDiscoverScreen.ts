import { useCallback, useEffect, useMemo, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';

import type {
  DiscoverEvent,
  DiscoverFilter,
  DiscoverItem,
  DiscoverPlace,
  DiscoverViewMode,
  RecommendationPreferencesSnapshot,
} from '@/features/discover/components/discover.types';
import { scoreDiscoverEvent, scoreDiscoverPlace } from '@/features/discover/components/discover.scoring';
import { useI18n } from '@/shared/hooks/use-i18n';
import { useLocationScope } from '@/shared/hooks/useLocationScope';
import { useVisibleItemAutoplay } from '@/shared/hooks/useVisibleItemAutoplay';
import api, {
  clearAuthState,
  getApiErrorMessage,
  getImageUrl,
  storage,
} from '@/services/api';
import { getCache, setCache } from '@/services/api/dataCache';
import { usePlaceSaveSet } from '@/features/places/hooks/usePlaceSaveSet';
import { formatEventDate } from '@/services/shared/formatters';
import { getRecommendationOnboardingPreferences } from '@/services/shared/recommendation-onboarding';
import { resolveStoredUserSession } from '@/services/auth/user-session';
import {
  EVENT_PLACEHOLDER as EVENT_PLACEHOLDER_IMAGE,
  PLACE_PLACEHOLDER as PLACE_PLACEHOLDER_IMAGE,
} from '@/features/discover/components/discover.types';

export function useDiscoverScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();

  const cachedDiscover = getCache<{
    events: DiscoverEvent[];
    places: DiscoverPlace[];
  }>('discover');

  const [events, setEvents] = useState<DiscoverEvent[]>(cachedDiscover?.events ?? []);
  const [places, setPlaces] = useState<DiscoverPlace[]>(cachedDiscover?.places ?? []);
  const [loading, setLoading] = useState(!cachedDiscover);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<DiscoverFilter>('all');
  const [viewMode, setViewMode] = useState<DiscoverViewMode>('inspiration');
  const [filtersVisible, setFiltersVisible] = useState(false);
  const { savedPlaceIds, setSavedPlaceIds, savingPlaceIds, toggleSave } =
    usePlaceSaveSet();
  const [recommendationPreferences, setRecommendationPreferences] =
    useState<RecommendationPreferencesSnapshot>({
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
        api.get<{ items: DiscoverEvent[]; nextCursor: string | null; hasMore: boolean }>('/events?upcoming=true&limit=100'),
        api.get<DiscoverPlace[]>('/places'),
      ]);

      const [eventsResult, placesResult] = results;
      const nextEvents =
        eventsResult.status === 'fulfilled' ? eventsResult.value.data.items : [];
      const nextPlaces =
        placesResult.status === 'fulfilled' ? placesResult.value.data : [];

      if (eventsResult.status === 'rejected' && placesResult.status === 'rejected') {
        setErrorMessage(getApiErrorMessage(eventsResult.reason, t('commonErrorTitle')));
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

  const filterOptions = useMemo(
    () => [
      { key: 'all' as const, label: t('discoverFilterAll') },
      { key: 'events' as const, label: t('discoverFilterEvents') },
      { key: 'places' as const, label: t('discoverFilterPlaces') },
    ],
    [t],
  );

  const viewOptions = useMemo(
    () => [
      { key: 'list' as const, label: t('discoverViewList') },
      { key: 'inspiration' as const, label: t('discoverViewInspiration') },
    ],
    [t],
  );

  const locationFilteredEvents = useMemo(
    () =>
      filterByLocation(events, (event) => ({
        city: event.City?.name || event.Place?.City?.name,
        country: event.City?.country || event.Place?.City?.country,
        address: event.address,
      })),
    [events, filterByLocation],
  );

  const locationFilteredPlaces = useMemo(
    () =>
      filterByLocation(places, (place) => ({
        city: place.City?.name,
        country: place.City?.country,
        address: place.address,
      })),
    [filterByLocation, places],
  );

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
        image: getImageUrl(event.coverUrl) || EVENT_PLACEHOLDER_IMAGE,
        badge: {
          label:
            Number(event.entryFee || 0) > 0
              ? t('discoverEventBadge')
              : t('discoverEventBadgeFree'),
          color: '#ff4757',
        },
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
          right.score - left.score || (right.place.avgRating || 0) - (left.place.avgRating || 0),
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
        image: getImageUrl(place.coverUrl) || PLACE_PLACEHOLDER_IMAGE,
        badge: { label: t('discoverPlaceBadge'), color: '#2ecc71' },
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

  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  const handleOpenLocation = useCallback(() => {
    router.push('/location');
  }, [router]);

  const handleOpenFilters = useCallback(() => {
    setFiltersVisible(true);
  }, []);

  const handleCloseFilters = useCallback(() => {
    setFiltersVisible(false);
  }, []);

  const handleRefresh = useCallback(() => {
    void fetchDiscoverData(true);
  }, [fetchDiscoverData]);

  const handleResetFilters = useCallback(() => {
    setQuery('');
    setActiveFilter('all');
  }, []);

  return {
    locale,
    t,
    loading,
    refreshing,
    errorMessage,
    query,
    setQuery,
    activeFilter,
    setActiveFilter,
    viewMode,
    setViewMode,
    filtersVisible,
    handleOpenFilters,
    handleCloseFilters,
    savedPlaceIds,
    savingPlaceIds,
    discoverItems,
    filteredItems,
    discoverAutoplay,
    locationValueLabel,
    filterOptions,
    viewOptions,
    handleRefresh,
    handleTogglePlaceSave: toggleSave,
    handlePressItem,
    handleBack,
    handleOpenLocation,
    handleResetFilters,
  };
}
