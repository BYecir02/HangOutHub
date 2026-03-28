import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useRouter, type Href } from 'expo-router';

import CategoryCard from '@/components/ui/CategoryCard';
import EventCard from '@/components/ui/EventCard';
import Header from '@/components/ui/Header';
import PlaceCard from '@/components/ui/PlaceCard';
import SuggestionCard from '@/components/ui/SuggestionCard';
import { useI18n } from '@/hooks/use-i18n';
import { useLocationScope } from '@/hooks/useLocationScope';
import api, { getImageUrl, storage } from '@/services/api';
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

const EVENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200';
const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';

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

    try {
      const [unreadResult, friendshipsResult, invitationsResult] =
        await Promise.allSettled([
          api.get<NotificationCountResponse>('/notifications/unread-count'),
          getFriendshipOverview(),
          api.get<OutingInvitation[]>('/outings/invitations'),
        ]);

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
    } catch (error) {
      if (!isUnauthorized(error)) {
        console.error('Erreur chargement notifications:', error);
      }
    }
  }, [isUnauthorized]);

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

    const [categoriesResult, eventsResult, placesResult] = results;

    if (categoriesResult.status === 'fulfilled') {
      setCategories(categoriesResult.value.data);
      setCache('categories', categoriesResult.value.data);
    } else {
      console.error('Erreur chargement categories:', categoriesResult.reason);
      setCategories([]);
    }

    if (eventsResult.status === 'fulfilled') {
      setEvents(eventsResult.value.data);
      setCache('events', eventsResult.value.data);
    } else {
      console.error('Erreur chargement evenements:', eventsResult.reason);
      setEvents([]);
    }

    if (placesResult.status === 'fulfilled') {
      setPlaces(placesResult.value.data);
      setCache('places', placesResult.value.data);
    } else {
      console.error('Erreur chargement lieux:', placesResult.reason);
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
  }, [loadNotificationCount]);

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
  const suggestions = useMemo(
    () =>
      featuredEvents.slice(0, 3).map((event, index) => ({
        id: event.id,
        title: event.title,
        category: event.Place?.name || event.address || t('homeLocationToConfirm'),
        date: formatEventDate(event.startTime, locale),
        image: getImageUrl(event.coverUrl) || EVENT_PLACEHOLDER,
        reason:
          index === 0
            ? t('homeReasonTrending')
            : index === 1
              ? t('homeReasonMustSee')
              : t('homeReasonLocalSelection'),
      })),
    [featuredEvents, locale, t],
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
        ) : featuredEvents.length > 0 ? (
          <FlatList
            data={featuredEvents}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={276}
            decelerationRate="fast"
            snapToAlignment="start"
            contentContainerStyle={{ paddingHorizontal: 20 }}
            renderItem={({ item }) => (
              <EventCard
                title={item.title}
                date={formatEventDate(item.startTime, locale)}
                location={item.Place?.name || item.address || t('homeLocationToConfirm')}
                imageUrl={getImageUrl(item.coverUrl) || EVENT_PLACEHOLDER}
                price={formatEventPriceLabel(item, locale, t)}
                onPress={() =>
                  router.push({
                    pathname: '/event/[id]',
                    params: { id: item.id },
                  })
                }
              />
            )}
          />
        ) : (
          <SectionPlaceholder message={t('homeNoEvents')} />
        )}
      </View>

      <View className="mt-8">
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
            contentContainerStyle={{ paddingHorizontal: 20 }}
            renderItem={({ item }) => (
              <PlaceCard
                name={item.name}
                location={item.City?.name || item.address || t('homeAddressToConfirm')}
                imageUrl={getImageUrl(item.coverUrl) || PLACE_PLACEHOLDER}
                rating={item.avgRating ?? undefined}
                onPress={() =>
                  router.push({
                    pathname: '/place/[id]',
                    params: { id: item.id },
                  })
                }
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
        ) : suggestions.length > 0 ? (
          suggestions.map((item) => (
            <SuggestionCard
              key={item.id}
              title={item.title}
              category={item.category}
              date={item.date}
              image={item.image}
              reason={item.reason}
              onPress={() =>
                router.push({
                  pathname: '/event/[id]',
                  params: { id: item.id },
                })
              }
            />
          ))
        ) : (
          <SectionPlaceholder message={t('homeNoSuggestions')} />
        )}
      </View>
    </ScrollView>

  </View>
  );
}
