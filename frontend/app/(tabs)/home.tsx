import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  Animated,
  FlatList,
  Easing,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter, type Href } from 'expo-router';

import CategoryCard from '@/components/ui/CategoryCard';
import EventInspirationCard from '@/components/ui/EventInspirationCard';
import Header from '@/components/ui/Header';
import MasonryGrid from '@/components/ui/MasonryGrid';
import PlaceInspirationCard from '@/components/ui/PlaceInspirationCard';
import { useI18n } from '@/hooks/use-i18n';
import { useLocationScope } from '@/hooks/useLocationScope';
import { useVisibleItemAutoplay } from '@/hooks/useVisibleItemAutoplay';
import api, { clearAuthState, storage } from '@/services/api';
import { getCategoryCache, setCache, setCategoryCache } from '@/services/dataCache';
import { formatEventCardPriceLabel, formatEventDate } from '@/services/formatters';
import { getFriendshipOverview } from '@/services/friendships';
import {
  setStoredLocation,
  type StoredLocation,
} from '@/services/location-preferences';
import { Category } from '@/types';
import type { OutingInvitation } from '@/types/social';

interface HomeEvent {
  id: string;
  title: string;
  startTime: string;
  coverUrl: string | null;
  entryFee: number | string | null;
  TicketType?: {
    id: string;
    price: number | string;
    quantity: number;
  }[];
  Place?: {
    name?: string | null;
    City?: {
      id?: number;
      name?: string | null;
      country?: string | null;
    } | null;
  } | null;
  address?: string | null;
}

interface HomePlace {
  id: string;
  name: string;
  coverUrl: string | null;
  avgRating?: number | null;
  City?: {
    id?: number;
    name?: string | null;
    country?: string | null;
  } | null;
  address?: string | null;
}

interface NotificationCountResponse {
  unreadCount: number;
}

type HomeRecommendationItem =
  | {
      id: string;
      type: 'event';
      event: HomeEvent;
      cityLabel: string;
      placeLabel: string;
      dateLabel: string;
      priceLabel: string;
    }
  | {
      id: string;
      type: 'place';
      place: HomePlace;
      fallbackNewLabel: string;
      accentColor: string;
    };

function SectionPlaceholder({ message }: { message: string }) {
  return (
    <View className="px-5 py-4">
      <Text className="text-sm text-gray-500 dark:text-gray-400">
        {message}
      </Text>
    </View>
  );
}

function estimateRecommendationCardHeight(index: number) {
  const imageHeights = [182, 240, 208, 262, 194, 228];
  return imageHeights[index % imageHeights.length] + 124;
}

export default function HomeScreen() {
  const router = useRouter();
  const eventsRoute = '/events' as Href;
  const discoverRoute = '/discover' as Href;
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

  const isUnauthorized = useCallback((error: unknown) => {
    if (!error || typeof error !== 'object') {
      return false;
    }

    const response = (error as { response?: { status?: number } }).response;
    return response?.status === 401;
  }, []);

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
      (result) => result.status === 'rejected' && isUnauthorized(result.reason),
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
  }, [isUnauthorized, router]);

  useFocusEffect(
    useCallback(() => {
      void loadNotificationCount();
    }, [loadNotificationCount]),
  );

  const loadHomeData = useCallback(async () => {
    const results = await Promise.allSettled([
      api.get<Category[]>('/categories'),
      api.get<HomeEvent[]>('/events'),
      api.get<HomePlace[]>('/places'),
    ]);

    const unauthorizedResult = results.find(
      (result) => result.status === 'rejected' && isUnauthorized(result.reason),
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
      if (!isUnauthorized(categoriesResult.reason)) {
        console.error('Erreur chargement categories:', categoriesResult.reason);
      }
      setCategories([]);
    }

    if (eventsResult.status === 'fulfilled') {
      setEvents(eventsResult.value.data);
      setCache('events', eventsResult.value.data);
    } else {
      if (!isUnauthorized(eventsResult.reason)) {
        console.error('Erreur chargement evenements:', eventsResult.reason);
      }
      setEvents([]);
    }

    if (placesResult.status === 'fulfilled') {
      setPlaces(placesResult.value.data);
      setCache('places', placesResult.value.data);
    } else {
      if (!isUnauthorized(placesResult.reason)) {
        console.error('Erreur chargement lieux:', placesResult.reason);
      }
      setPlaces([]);
    }

    if (
      eventsResult.status === 'fulfilled' &&
      placesResult.status === 'fulfilled'
    ) {
      setCache('discover', {
        events: eventsResult.value.data,
        places: placesResult.value.data,
      });
    }

    await loadNotificationCount();
  }, [isUnauthorized, loadNotificationCount, router]);

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
      if (isUnauthorized(error)) {
        await clearAuthState();
        router.replace('/');
        return;
      }

      setSavedPlaceIds(new Set());
    }
  }, [isUnauthorized, router]);

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
        if (isUnauthorized(error)) {
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
    [isUnauthorized, router, savingPlaceIds, t],
  );

  useEffect(() => {
    let isMounted = true;

    const initialLoad = async () => {
      setLoading(true);
      await loadHomeData();

      if (isMounted) {
        setLoading(false);
      }
    };

    void initialLoad();

    return () => {
      isMounted = false;
    };
  }, [loadHomeData]);

  useFocusEffect(
    useCallback(() => {
      void loadHomeData();
    }, [loadHomeData]),
  );

  useEffect(() => {
    void loadSavedPlaces();
  }, [loadSavedPlaces]);

  useFocusEffect(
    useCallback(() => {
      void loadSavedPlaces();
    }, [loadSavedPlaces]),
  );

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

  const featuredEvents = useMemo(
    () => locationFilteredEvents.slice(0, 5),
    [locationFilteredEvents],
  );
  const featuredInspiration = useMemo(
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
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const [featuredDirection, setFeaturedDirection] = useState<1 | -1>(1);
  const featuredTransition = React.useRef(new Animated.Value(1)).current;
  const firstFeaturedRender = React.useRef(true);

  useEffect(() => {
    if (featuredInspiration.length === 0) {
      setFeaturedIndex(0);
      return;
    }

    setFeaturedIndex((current) => Math.min(current, featuredInspiration.length - 1));
  }, [featuredInspiration.length]);

  useEffect(() => {
    if (firstFeaturedRender.current) {
      firstFeaturedRender.current = false;
      featuredTransition.setValue(1);
      return;
    }

    featuredTransition.stopAnimation();
    featuredTransition.setValue(0);

    Animated.timing(featuredTransition, {
      toValue: 1,
      duration: 260,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [featuredDirection, featuredIndex, featuredTransition]);

  const currentFeaturedItem = featuredInspiration[featuredIndex] || null;
  const canNavigateFeatured = featuredInspiration.length > 1;

  const goToPreviousFeatured = useCallback(() => {
    if (!featuredInspiration.length) {
      return;
    }

    setFeaturedDirection(-1);
    setFeaturedIndex((current) =>
      current <= 0 ? featuredInspiration.length - 1 : current - 1,
    );
  }, [featuredInspiration.length]);

  const goToNextFeatured = useCallback(() => {
    if (!featuredInspiration.length) {
      return;
    }

    setFeaturedDirection(1);
    setFeaturedIndex((current) =>
      current >= featuredInspiration.length - 1 ? 0 : current + 1,
    );
  }, [featuredInspiration.length]);

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

  const recommendedAutoplay = useVisibleItemAutoplay(
    recommendedInspiration,
    (item) => item.id,
  );

  const locationLabel = locationValueLabel;

  const handleCategoryPress = (categoryId: number) => {
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
  };


  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        onLayout={recommendedAutoplay.onLayout}
        onScroll={recommendedAutoplay.onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void onRefresh();
            }}
            tintColor="#4c669f"
          />
        }
      >
      <Header
        notificationCount={notificationCount}
        location={locationLabel}
        locationLabel={t('homeLocationLabel')}
        onLocationPress={() => router.push('/location')}
        onNotificationPress={() => router.push('/notifications')}
      />

      <View className="mt-2">
        <View className="mb-4 flex-row items-end justify-between px-5">
          <Text className="text-lg font-bold text-gray-800 dark:text-white">
            {t('homeFeatured')}
          </Text>
          <TouchableOpacity onPress={() => router.push(eventsRoute)}>
            <Text className="text-xs font-medium text-[#4c669f]">{t('homeSeeAll')}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#4c669f" className="mt-4" />
        ) : currentFeaturedItem ? (
          <View className="px-5">
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={goToPreviousFeatured}
                disabled={!canNavigateFeatured}
                className={`h-11 w-11 items-center justify-center rounded-full border ${
                  canNavigateFeatured
                    ? 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
                    : 'border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900'
                }`}
                style={{ opacity: canNavigateFeatured ? 1 : 0.45 }}
              >
                <Ionicons name="chevron-back" size={22} color="#4c669f" />
              </TouchableOpacity>

              <View className="min-w-0 flex-1">
                <Animated.View
                  style={{
                    opacity: featuredTransition,
                    transform: [
                      {
                        translateX: featuredTransition.interpolate({
                          inputRange: [0, 1],
                          outputRange: [featuredDirection === 1 ? 22 : -22, 0],
                        }),
                      },
                      {
                        scale: featuredTransition.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.985, 1],
                        }),
                      },
                    ],
                  }}
                >
                  <EventInspirationCard
                    event={currentFeaturedItem.event}
                    imageHeight={190}
                    adaptiveHeight={false}
                    cityLabel={currentFeaturedItem.cityLabel}
                    placeLabel={currentFeaturedItem.placeLabel}
                    dateLabel={currentFeaturedItem.dateLabel}
                    priceLabel={currentFeaturedItem.priceLabel}
                    shouldPlay
                    onPress={() =>
                      router.push({
                        pathname: '/event/[id]',
                        params: { id: currentFeaturedItem.event.id },
                      })
                    }
                    style={{ width: '100%' }}
                  />
                </Animated.View>
              </View>

              <TouchableOpacity
                onPress={goToNextFeatured}
                disabled={!canNavigateFeatured}
                className={`h-11 w-11 items-center justify-center rounded-full border ${
                  canNavigateFeatured
                    ? 'border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900'
                    : 'border-gray-100 bg-gray-50 dark:border-gray-800 dark:bg-gray-900'
                }`}
                style={{ opacity: canNavigateFeatured ? 1 : 0.45 }}
              >
                <Ionicons name="chevron-forward" size={22} color="#4c669f" />
              </TouchableOpacity>
            </View>

            <View className="mt-3 flex-row justify-center gap-2">
              {featuredInspiration.map((item, index) => {
                const isActive = index === featuredIndex;

                return (
                  <View
                    key={item.event.id}
                    className={`rounded-full ${
                      isActive ? 'h-2.5 w-6 bg-[#4c669f]' : 'h-2.5 w-2.5 bg-gray-300 dark:bg-gray-700'
                    }`}
                  />
                );
              })}
            </View>
          </View>
        ) : (
          <SectionPlaceholder message={t('homeNoEvents')} />
        )}
      </View>

      <View className="mt-3">
        <View className="mb-4 flex-row items-end justify-between px-5">
          <Text className="text-lg font-bold text-gray-800 dark:text-white">
            {t('homeCategories')}
          </Text>
          <TouchableOpacity onPress={() => router.push('/categories')}>
            <Text className="text-xs font-medium text-[#4c669f]">
              {t('homeSeeAll')}
            </Text>
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator size="large" color="#4c669f" className="mt-4" />
        ) : categories.length > 0 ? (
          <FlatList
            data={categories}
            renderItem={({ item }) => (
              <CategoryCard
                category={item}
                onPress={() => handleCategoryPress(item.id)}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        ) : (
          <SectionPlaceholder message={t('homeNoCategories')} />
        )}
      </View>

      <View className="mt-3 px-5 pb-24">
        <View className="mb-4 flex-row items-end justify-between">
          <Text className="mt-2 text-lg font-bold text-gray-800 dark:text-white">
            {t('homeRecommended')}
          </Text>
          <TouchableOpacity onPress={() => router.push(discoverRoute)}>
            <Text className="text-xs font-medium text-[#4c669f]">{t('homeSeeAll')}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#f39c12" className="mt-4" />
        ) : recommendedInspiration.length > 0 ? (
          <MasonryGrid
            items={recommendedInspiration}
            getKey={(item) => item.id}
            estimateItemHeight={(_, index) => estimateRecommendationCardHeight(index)}
            onItemLayout={(item, layout) => {
              recommendedAutoplay.registerLayout(item.id, layout);
            }}
            renderItem={(item, index) => {
              const imageHeights = [182, 240, 208, 262, 194, 228];

              if (item.type === 'event') {
                return (
                  <EventInspirationCard
                    event={item.event}
                    cityLabel={item.cityLabel}
                    placeLabel={item.placeLabel}
                    dateLabel={item.dateLabel}
                    priceLabel={item.priceLabel}
                    borderColor={item.accentColor}
                    imageHeight={imageHeights[index % imageHeights.length]}
                    adaptiveHeight={false}
                    shouldPlay={recommendedAutoplay.activeId === item.id}
                    onPress={() =>
                      router.push({
                        pathname: '/event/[id]',
                        params: { id: item.event.id },
                      })
                    }
                  />
                );
              }

              return (
                <PlaceInspirationCard
                  place={item.place}
                  imageHeight={imageHeights[index % imageHeights.length]}
                  fallbackNewLabel={item.fallbackNewLabel}
                  borderColor={item.accentColor}
                  adaptiveHeight={false}
                  shouldPlay={recommendedAutoplay.activeId === item.id}
                  isSaved={savedPlaceIds.has(item.place.id)}
                  onToggleSave={() => void handleTogglePlaceSave(item.place.id)}
                  saving={savingPlaceIds.has(item.place.id)}
                  onPress={() =>
                    router.push({
                      pathname: '/place/[id]',
                      params: { id: item.place.id },
                    })
                  }
                />
              );
            }}
          />
        ) : (
          <SectionPlaceholder message={t('homeNoSuggestions')} />
        )}
      </View>
    </ScrollView>

  </View>
  );
}
