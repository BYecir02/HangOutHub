import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert } from 'react-native';
import { useRouter } from 'expo-router';

import api, { clearAuthState, storage } from '@/services/api';
import { getCategoryCache, setCache, setCategoryCache } from '@/services/dataCache';
import { formatEventCardPriceLabel, formatEventDate } from '@/services/formatters';
import { getFriendshipOverview } from '@/services/friendships';
import {
  setStoredLocation,
  type StoredLocation,
} from '@/services/location-preferences';
import { useI18n } from '@/hooks/use-i18n';
import { useLocationScope } from '@/hooks/useLocationScope';
import type { Category } from '@/types';
import type { OutingInvitation } from '@/types/social';

import type {
  HomeEvent,
  HomeFeaturedItem,
  HomePlace,
  HomeRecommendationItem,
  NotificationCountResponse,
} from '@/components/home/home.types';

function isUnauthorizedError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  const response = (error as { response?: { status?: number } }).response;
  return response?.status === 401;
}

export function useHomeScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<HomeEvent[]>([]);
  const [places, setPlaces] = useState<HomePlace[]>([]);
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());
  const [savingPlaceIds, setSavingPlaceIds] = useState<Set<string>>(new Set());
  const [notificationCount, setNotificationCount] = useState(0);
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
      api.get<HomeEvent[]>('/events'),
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
      setEvents(eventsResult.value.data);
      setCache('events', eventsResult.value.data);
    } else {
      if (!isUnauthorizedError(eventsResult.reason)) {
        console.error('Erreur chargement evenements:', eventsResult.reason);
      }
      setEvents([]);
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

    if (eventsResult.status === 'fulfilled' && placesResult.status === 'fulfilled') {
      setCache('discover', {
        events: eventsResult.value.data,
        places: placesResult.value.data,
      });
    }

    await loadNotificationCount();
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

  const featuredEvents = useMemo(() => locationFilteredEvents.slice(0, 5), [
    locationFilteredEvents,
  ]);

  const featuredInspiration = useMemo<HomeFeaturedItem[]>(
    () =>
      featuredEvents.map((event) => ({
        event,
        cityLabel: event.Place?.City?.name || '',
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
    const eventSuggestions: HomeRecommendationItem[] = featuredEvents
      .slice(0, 3)
      .map((event) => ({
        id: `event-${event.id}`,
        type: 'event' as const,
        event,
        cityLabel: event.Place?.City?.name || '',
        placeLabel: event.Place?.name || event.address || t('homeLocationToConfirm'),
        dateLabel: formatEventDate(event.startTime, locale),
        priceLabel: formatEventCardPriceLabel(event, locale, {
          freeLabel: t('homePriceFree'),
          soldOutLabel: t('homePriceSoldOut'),
        }),
        accentColor: '#ff4757',
      }));

    const placeSuggestions: HomeRecommendationItem[] = [...locationFilteredPlaces]
      .sort((left, right) => (right.avgRating || 0) - (left.avgRating || 0))
      .slice(0, 3)
      .map((place) => ({
        id: `place-${place.id}`,
        type: 'place' as const,
        place,
        fallbackNewLabel: t('discoverPlaceMetaDiscover'),
        accentColor: '#2ecc71',
      }));

    const nextItems: HomeRecommendationItem[] = [];
    const maxLength = Math.max(eventSuggestions.length, placeSuggestions.length);

    for (let index = 0; index < maxLength; index += 1) {
      if (eventSuggestions[index]) {
        nextItems.push(eventSuggestions[index]);
      }

      if (placeSuggestions[index]) {
        nextItems.push(placeSuggestions[index]);
      }
    }

    return nextItems.slice(0, 6);
  }, [featuredEvents, locale, locationFilteredPlaces, t]);

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
