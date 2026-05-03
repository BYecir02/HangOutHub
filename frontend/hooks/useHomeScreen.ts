import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import api, { clearAuthState, isUnauthorizedError, storage } from '@/services/api';
import { getCache, getCategoryCache, setCache, setCategoryCache } from '@/services/dataCache';
import { formatEventCardPriceLabel, formatEventDate } from '@/services/formatters';
import { getFriendshipOverview } from '@/services/friendships';
import { getRecommendationOnboardingPreferences } from '@/services/recommendation-onboarding';
import { setStoredLocation, type StoredLocation } from '@/services/location-preferences';
import { resolveStoredUserSession } from '@/services/user-session';
import { useI18n } from '@/hooks/use-i18n';
import { useLocationScope } from '@/hooks/useLocationScope';
import type { Category } from '@/types';
import type { OutingInvitation } from '@/types/social';
import type {
  OnboardingBudgetPreference,
  OnboardingRadiusPreference,
} from '@/services/recommendation-onboarding';

import type {
  HomeEvent,
  HomeFeaturedItem,
  HomePlace,
  HomeRecommendationItem,
  NotificationCountResponse,
} from '@/components/home/home.types';

type RecommendationPreferencesSnapshot = {
  tagIds: number[];
  cityIds: number[];
  budget: OnboardingBudgetPreference;
  radiusKm: OnboardingRadiusPreference;
};

type CandidateTagRelation = {
  tagId?: number | null;
  Tag?: {
    id?: number | null;
  } | null;
} | null;

type CandidateLocation = {
  cityId?: number | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

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
  Place?: {
    City?: {
      id?: number | null;
      name?: string | null;
      country?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    } | null;
  } | null;
  City?: {
    id?: number | null;
    name?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
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
  selectedLocation: StoredLocation | null,
  candidate: CandidateLocation,
): number {
  if (!selectedLocation) {
    return 0;
  }

  let score = 0;
  const selectedCityId = selectedLocation.cityId;
  const candidateCityId = candidate.cityId;

  if (
    typeof selectedCityId === 'number' &&
    typeof candidateCityId === 'number' &&
    selectedCityId === candidateCityId
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
  selectedLocation: StoredLocation | null,
  candidate: CandidateLocation,
  radiusKm: OnboardingRadiusPreference,
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

function getEventBasePrice(event: HomeEvent): number | null {
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
  budget: OnboardingBudgetPreference,
): number {
  if (price === null) {
    return 0;
  }

  const priceBand =
    price <= 15 ? 'low' : price <= 45 ? 'medium' : 'high';

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

function scoreTagMatch(
  candidateTagIds: number[],
  preferredTagIds: Set<number>,
): number {
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

function scoreEventRecommendation(
  event: HomeEvent,
  selectedLocation: StoredLocation | null,
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

function scorePlaceRecommendation(
  place: HomePlace,
  selectedLocation: StoredLocation | null,
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

export function useHomeScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const cachedHomeEvents = getCache<HomeEvent[]>('homeEvents');
  const [events, setEvents] = useState<HomeEvent[]>(cachedHomeEvents ?? []);
  const [places, setPlaces] = useState<HomePlace[]>([]);
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());
  const [savingPlaceIds, setSavingPlaceIds] = useState<Set<string>>(new Set());
  const [notificationCount, setNotificationCount] = useState(0);
  const [recommendationPreferences, setRecommendationPreferences] =
    useState<RecommendationPreferencesSnapshot>({
      tagIds: [],
      cityIds: [],
      budget: 'medium',
      radiusKm: 5,
    });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const {
    hydrated: locationHydrated,
    selectedLocation,
    filterByLocation,
    setSelectedLocation,
    locationValueLabel,
  } = useLocationScope({
    defaultCountry: t('homeLocationCountry'),
    currentLabel: t('homeLocationCurrentLabel'),
    allCitiesLabel: t('homeLocationAllCities'),
    allCountriesLabel: t('homeLocationAllCountries'),
  });

  const loadNotificationCount = useCallback(async () => {
    const token = await storage.getItem('userToken');

    if (!token) {
      setNotificationCount(0);
      return;
    }

    const [unreadResult, friendshipsResult, invitationsResult] =
      await Promise.allSettled([
        api.get<NotificationCountResponse>('/notifications/unread-count'),
        getFriendshipOverview(),
        api.get<OutingInvitation[]>('/outings/invitations'),
      ]);

    const hasUnauthorized = [unreadResult, friendshipsResult, invitationsResult].some(
      (result) => result.status === 'rejected' && isUnauthorizedError(result.reason),
    );

    if (hasUnauthorized) {
      await clearAuthState();
      router.replace('/');
      return;
    }

    const unreadCount =
      unreadResult.status === 'fulfilled'
        ? Number(unreadResult.value.data.unreadCount || 0)
        : 0;
    const incomingRequests =
      friendshipsResult.status === 'fulfilled'
        ? friendshipsResult.value.counts.incomingRequests || 0
        : 0;
    const outingInvites =
      invitationsResult.status === 'fulfilled'
        ? invitationsResult.value.data?.length || 0
        : 0;

    const computedCount = Math.max(unreadCount, incomingRequests + outingInvites);

    setNotificationCount(computedCount);
  }, [router]);

  const loadHomeData = useCallback(async () => {
    const results = await Promise.allSettled([
      api.get<Category[]>('/categories'),
      api.get<{ items: HomeEvent[]; nextCursor: string | null; hasMore: boolean }>('/events?upcoming=true&limit=100'),
      api.get<HomePlace[]>('/places'),
    ]);

    const unauthorizedResult = results.find(
      (result) => result.status === 'rejected' && isUnauthorizedError(result.reason),
    );

    if (unauthorizedResult) {
      await clearAuthState();
      router.replace('/');
      return;
    }

    const [categoriesResult, eventsResult, placesResult] = results;

    if (categoriesResult.status === 'fulfilled') {
      setCategories(categoriesResult.value.data);
      setCache('categories', categoriesResult.value.data);
    } else {
      if (!isUnauthorizedError(categoriesResult.reason)) {
        console.error('Erreur chargement categories:', categoriesResult.reason);
      }
      setCategories([]);
    }

    if (eventsResult.status === 'fulfilled') {
      setEvents(eventsResult.value.data.items);
      setCache('homeEvents', eventsResult.value.data.items);
    } else {
      if (!isUnauthorizedError(eventsResult.reason)) {
        console.error('Erreur chargement evenements:', eventsResult.reason);
      }
      setEvents(cachedHomeEvents ?? []);
    }

    if (placesResult.status === 'fulfilled') {
      setPlaces(placesResult.value.data);
      setCache('places', placesResult.value.data);
    } else {
      if (!isUnauthorizedError(placesResult.reason)) {
        console.error('Erreur chargement lieux:', placesResult.reason);
      }
      setPlaces([]);
    }

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
      console.error('Erreur chargement preferences recommandations:', error);
      setRecommendationPreferences({
        tagIds: [],
        cityIds: [],
        budget: 'medium',
        radiusKm: 5,
      });
    }

    try {
      await loadNotificationCount();
    } catch (error) {
      console.error('Erreur chargement notifications home:', error);
      setNotificationCount(0);
    }
  }, [loadNotificationCount, router]);

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
      if (isUnauthorizedError(error)) {
        await clearAuthState();
        router.replace('/');
        return;
      }

      setSavedPlaceIds(new Set());
    }
  }, [router]);

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
        if (isUnauthorizedError(error)) {
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
    [router, savingPlaceIds, t],
  );

  useEffect(() => {
    let isMounted = true;

    const run = async () => {
      setLoading(true);

      await Promise.all([loadHomeData(), loadSavedPlaces()]);

      if (isMounted) {
        setLoading(false);
      }
    };

    void run();

    return () => {
      isMounted = false;
    };
  }, [loadHomeData, loadSavedPlaces]);

  useEffect(() => {
    if (!locationHydrated) {
      return;
    }

    if (selectedLocation) {
      return;
    }

    const nextLocation: StoredLocation = {
      mode: 'city',
      cityName: 'Cotonou',
      region: null,
      country: t('homeLocationCountry'),
    };

    setSelectedLocation(nextLocation);
    void setStoredLocation(nextLocation);
  }, [locationHydrated, selectedLocation, setSelectedLocation, t]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);

    try {
      await loadHomeData();
    } finally {
      setRefreshing(false);
    }
  }, [loadHomeData]);

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

  const featuredEvents = useMemo(() => locationFilteredEvents.slice(0, 5), [
    locationFilteredEvents,
  ]);

  const featuredInspiration = useMemo<HomeFeaturedItem[]>(
    () =>
      featuredEvents.map((event) => ({
        event,
        cityLabel: event.City?.name || event.Place?.City?.name || '',
        placeLabel: event.Place?.name || event.address || t('homeLocationToConfirm'),
        dateLabel: formatEventDate(event.startTime, locale),
        priceLabel: formatEventCardPriceLabel(event, locale, {
          freeLabel: t('homePriceFree'),
          soldOutLabel: t('homePriceSoldOut'),
        }),
      })),
    [featuredEvents, locale, t],
  );

  const recommendedInspiration = useMemo<HomeRecommendationItem[]>(() => {
    const preferredTagSet = new Set(recommendationPreferences.tagIds);

    const rankedEventSuggestions: HomeRecommendationItem[] = [...locationFilteredEvents]
      .map((event) => ({
        event,
        score: scoreEventRecommendation(
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
      .slice(0, 3)
      .map(({ event }) => ({
        id: `event-${event.id}`,
        type: 'event' as const,
        event,
        cityLabel: event.City?.name || event.Place?.City?.name || '',
        placeLabel: event.Place?.name || event.address || t('homeLocationToConfirm'),
        dateLabel: formatEventDate(event.startTime, locale),
        priceLabel: formatEventCardPriceLabel(event, locale, {
          freeLabel: t('homePriceFree'),
          soldOutLabel: t('homePriceSoldOut'),
        }),
        accentColor: '#ff4757',
      }));

    const rankedPlaceSuggestions: HomeRecommendationItem[] = [...locationFilteredPlaces]
      .map((place) => ({
        place,
        score: scorePlaceRecommendation(
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
      .slice(0, 3)
      .map(({ place }) => ({
        id: `place-${place.id}`,
        type: 'place' as const,
        place,
        fallbackNewLabel: t('discoverPlaceMetaDiscover'),
        accentColor: '#2ecc71',
      }));

    const nextItems: HomeRecommendationItem[] = [];
    const maxLength = Math.max(
      rankedEventSuggestions.length,
      rankedPlaceSuggestions.length,
    );

    for (let index = 0; index < maxLength; index += 1) {
      if (rankedEventSuggestions[index]) {
        nextItems.push(rankedEventSuggestions[index]);
      }

      if (rankedPlaceSuggestions[index]) {
        nextItems.push(rankedPlaceSuggestions[index]);
      }
    }

    return nextItems.slice(0, 6);
  }, [
    locale,
    locationFilteredEvents,
    locationFilteredPlaces,
    recommendationPreferences,
    selectedLocation,
    t,
  ]);

  const handleCategoryPress = useCallback(
    (categoryId: number) => {
      const id = String(categoryId);

      if (!getCategoryCache(id)) {
        void api
          .get(`/categories/${id}/discover`)
          .then((response) => {
            setCategoryCache(id, response.data);
          })
          .catch(() => {});
      }

      router.push({
        pathname: '/category/[id]',
        params: { id },
      });
    },
    [router],
  );

  return {
    categories,
    featuredInspiration,
    handleCategoryPress,
    handleTogglePlaceSave,
    loading,
    locationLabel: locationValueLabel,
    notificationCount,
    onRefresh,
    refreshing,
    recommendedInspiration,
    savedPlaceIds,
    savingPlaceIds,
  };
}
