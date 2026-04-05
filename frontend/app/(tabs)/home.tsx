import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
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
import InspirationCard from '@/components/ui/InspirationCard';
import PlaceInspirationCard from '@/components/ui/PlaceInspirationCard';
import { useI18n } from '@/hooks/use-i18n';
import { useLocationScope } from '@/hooks/useLocationScope';
import api, { clearAuthState, getImageUrl, storage } from '@/services/api';
import { getCategoryCache, setCache, setCategoryCache } from '@/services/dataCache';
import { formatEventDate, formatPrice } from '@/services/formatters';
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
      title: string;
      subtitle: string;
      imageUrl: string;
      accentColor: string;
      badgeLabel: string;
      metaLabel: string;
      metaIcon: keyof typeof Ionicons.glyphMap;
      targetId: string;
    }
  | {
      id: string;
      type: 'place';
      title: string;
      subtitle: string;
      imageUrl: string;
      accentColor: string;
      badgeLabel: string;
      metaLabel: string;
      metaIcon: keyof typeof Ionicons.glyphMap;
      targetId: string;
    };

const EVENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200';
const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';

function useCarouselAutoplay<T>(items: T[], getId: (item: T) => string) {
  const [activeId, setActiveId] = useState<string | null>(
    items[0] ? getId(items[0]) : null,
  );
  const getIdRef = React.useRef(getId);

  useEffect(() => {
    getIdRef.current = getId;
  }, [getId]);

  useEffect(() => {
    if (items.length === 0) {
      setActiveId(null);
      return;
    }

    setActiveId((current) => {
      if (current && items.some((item) => getIdRef.current(item) === current)) {
        return current;
      }

      return getIdRef.current(items[0]);
    });
  }, [items]);

  const viewabilityConfig = React.useRef({
    itemVisiblePercentThreshold: 60,
  }).current;

  const onViewableItemsChanged = React.useRef(
    ({
      viewableItems,
    }: {
      viewableItems: Array<{ item: T; isViewable?: boolean }>;
    }) => {
      const firstVisible = viewableItems.find(
        (token) => token.isViewable && token.item,
      );

      if (firstVisible) {
        setActiveId(getIdRef.current(firstVisible.item));
      }
    },
  ).current;

  return { activeId, onViewableItemsChanged, viewabilityConfig };
}

function formatEventPriceLabel(
  event: HomeEvent,
  locale: string,
  t: (key: 'homePriceFree' | 'homePriceFrom' | 'homePriceSoldOut', params?: { price: string }) => string,
) {
  const ticketTypes = event.TicketType || [];
  if (ticketTypes.length > 0) {
    const available = ticketTypes.filter((ticket) => Number(ticket.quantity || 0) > 0);
    if (available.length === 0) {
      return t('homePriceSoldOut');
    }

    const minPrice = Math.min(
      ...available.map((ticket) => Number(ticket.price || 0)),
    );

    if (minPrice <= 0) {
      return t('homePriceFree');
    }

    return t('homePriceFrom', {
      price: minPrice.toLocaleString(locale),
    });
  }

  return formatPrice(event.entryFee, locale, { freeLabel: t('homePriceFree') });
}

function SectionPlaceholder({ message }: { message: string }) {
  return (
    <View className="px-5 py-4">
      <Text className="text-sm text-gray-500 dark:text-gray-400">
        {message}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const placesRoute = '/places' as Href;
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
  const popularPlaces = useMemo(
    () => locationFilteredPlaces.slice(0, 6),
    [locationFilteredPlaces],
  );
  const featuredInspiration = useMemo(
    () =>
      featuredEvents.map((event) => ({
        event,
        cityLabel: event.Place?.City?.name || '',
        placeLabel: event.Place?.name || event.address || t('homeLocationToConfirm'),
        dateLabel: formatEventDate(event.startTime, locale),
        priceLabel: formatEventPriceLabel(event, locale, t),
      })),
    [featuredEvents, locale, t],
  );

  const featuredCarousel = useCarouselAutoplay(
    featuredInspiration,
    (item) => item.event.id,
  );
  const popularCarousel = useCarouselAutoplay(popularPlaces, (item) => item.id);

  const recommendedInspiration = useMemo<HomeRecommendationItem[]>(() => {
    const eventSuggestions: HomeRecommendationItem[] = featuredEvents
      .slice(0, 3)
      .map((event) => ({
        id: `event-${event.id}`,
        type: 'event' as const,
        title: event.title,
        subtitle: event.Place?.name || event.address || t('homeLocationToConfirm'),
        imageUrl: getImageUrl(event.coverUrl) || EVENT_PLACEHOLDER,
        accentColor: '#ff4757',
        badgeLabel:
          Number(event.entryFee || 0) > 0
            ? t('discoverEventBadge')
            : t('discoverEventBadgeFree'),
        metaLabel: formatEventDate(event.startTime, locale),
        metaIcon: 'time-outline',
        targetId: event.id,
      }));

    const placeSuggestions: HomeRecommendationItem[] = popularPlaces
      .slice(0, 3)
      .map((place) => ({
        id: `place-${place.id}`,
        type: 'place' as const,
        title: place.name,
        subtitle: place.City?.name || place.address || t('homeAddressToConfirm'),
        imageUrl: getImageUrl(place.coverUrl) || PLACE_PLACEHOLDER,
        accentColor: '#2ecc71',
        badgeLabel: t('discoverPlaceBadge'),
        metaLabel:
          typeof place.avgRating === 'number' && place.avgRating > 0
            ? t('discoverPlaceMetaRated', { rating: place.avgRating.toFixed(1) })
            : t('discoverPlaceMetaDiscover'),
        metaIcon:
          typeof place.avgRating === 'number' && place.avgRating > 0
            ? ('star' as const)
            : ('sparkles' as const),
        targetId: place.id,
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
  }, [featuredEvents, locale, popularPlaces, t]);

  const recommendedCarousel = useCarouselAutoplay(
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

      <View className="mt-6">
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
        ) : featuredInspiration.length > 0 ? (
          <FlatList
            data={featuredInspiration}
            keyExtractor={(item) => item.event.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            viewabilityConfig={featuredCarousel.viewabilityConfig}
            onViewableItemsChanged={featuredCarousel.onViewableItemsChanged}
            snapToInterval={276}
            decelerationRate="fast"
            snapToAlignment="start"
            contentContainerStyle={{ paddingHorizontal: 20 }}
            renderItem={({ item }) => (
              <EventInspirationCard
                event={item.event}
                imageHeight={178}
                adaptiveHeight={false}
                cityLabel={item.cityLabel}
                placeLabel={item.placeLabel}
                dateLabel={item.dateLabel}
                priceLabel={item.priceLabel}
                shouldPlay={featuredCarousel.activeId === item.event.id}
                onPress={() =>
                  router.push({
                    pathname: '/event/[id]',
                    params: { id: item.event.id },
                  })
                }
                style={{ width: 288, marginRight: 16 }}
              />
            )}
          />
        ) : (
          <SectionPlaceholder message={t('homeNoEvents')} />
        )}
      </View>

      <View className="mt-1">
        <Text className="ml-5 mb-4 text-lg font-bold text-gray-800 dark:text-white">
          {t('homeCategories')}
        </Text>
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

      <View className="mt-8">
        <View className="mb-4 flex-row items-end justify-between px-5">
          <Text className="text-lg font-bold text-gray-800 dark:text-white">
            {t('homePopularPlaces')}
          </Text>
          <TouchableOpacity onPress={() => router.push(placesRoute)}>
            <Text className="text-xs font-medium text-[#4c669f]">{t('homeSeeAll')}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#2ecc71" className="mt-4" />
        ) : popularPlaces.length > 0 ? (
          <FlatList
            className="pb-4"
            data={popularPlaces}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            viewabilityConfig={popularCarousel.viewabilityConfig}
            onViewableItemsChanged={popularCarousel.onViewableItemsChanged}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            renderItem={({ item }) => (
              <PlaceInspirationCard
                place={item}
                imageHeight={178}
                adaptiveHeight={false}
                fallbackNewLabel={t('placesNewBadge')}
                shouldPlay={popularCarousel.activeId === item.id}
                onPress={() =>
                  router.push({
                    pathname: '/place/[id]',
                    params: { id: item.id },
                  })
                }
                isSaved={savedPlaceIds.has(item.id)}
                onToggleSave={() => void handleTogglePlaceSave(item.id)}
                saving={savingPlaceIds.has(item.id)}
                style={{ width: 288, marginRight: 16 }}
              />
            )}
          />
        ) : (
          <SectionPlaceholder message={t('homeNoPlaces')} />
        )}
      </View>

      <View className="mt-8 px-5 pb-24">
        <View className="mb-4 flex-row items-end justify-between">
          <Text className="text-lg font-bold text-gray-800 dark:text-white">
            {t('homeRecommended')}
          </Text>
          <TouchableOpacity onPress={() => router.push(discoverRoute)}>
            <Text className="text-xs font-medium text-[#4c669f]">{t('homeSeeAll')}</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator size="large" color="#f39c12" className="mt-4" />
        ) : recommendedInspiration.length > 0 ? (
          <FlatList
            data={recommendedInspiration}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            viewabilityConfig={recommendedCarousel.viewabilityConfig}
            onViewableItemsChanged={recommendedCarousel.onViewableItemsChanged}
            snapToInterval={276}
            decelerationRate="fast"
            snapToAlignment="start"
            contentContainerStyle={{ paddingHorizontal: 20 }}
            renderItem={({ item }) => (
              <InspirationCard
                title={item.title}
                subtitle={item.subtitle || undefined}
                imageUrl={item.imageUrl}
                accentColor={item.accentColor}
                badgeLabel={item.badgeLabel}
                metaLabel={item.metaLabel}
                metaIcon={item.metaIcon}
                adaptiveHeight={false}
                shouldPlay={recommendedCarousel.activeId === item.id}
                onPress={() =>
                  router.push({
                    pathname: item.type === 'event' ? '/event/[id]' : '/place/[id]',
                    params: { id: item.targetId },
                  })
                }
              />
            )}
          />
        ) : (
          <SectionPlaceholder message={t('homeNoSuggestions')} />
        )}
      </View>
    </ScrollView>

  </View>
  );
}
