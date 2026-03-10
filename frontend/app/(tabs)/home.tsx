import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter, type Href } from 'expo-router';

import CategoryCard from '@/components/ui/CategoryCard';
import EventCard from '@/components/ui/EventCard';
import Header from '@/components/ui/Header';
import PlaceCard from '@/components/ui/PlaceCard';
import SuggestionCard from '@/components/ui/SuggestionCard';
import api, { getImageUrl } from '@/services/api';
import { getCategoryCache, setCache, setCategoryCache } from '@/services/dataCache';
import { Category } from '@/types';

interface HomeEvent {
  id: string;
  title: string;
  startTime: string;
  coverUrl: string | null;
  entryFee: number | string | null;
  Place?: {
    name?: string | null;
  } | null;
  address?: string | null;
}

interface HomePlace {
  id: string;
  name: string;
  coverUrl: string | null;
  avgRating?: number | null;
  City?: {
    name?: string | null;
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

function formatEventDate(value: string) {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatEventPrice(value: number | string | null) {
  const amount = Number(value || 0);
  return amount > 0 ? `${amount.toLocaleString('fr-FR')} FCFA` : 'Gratuit';
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
  const [categories, setCategories] = useState<Category[]>([]);
  const [events, setEvents] = useState<HomeEvent[]>([]);
  const [places, setPlaces] = useState<HomePlace[]>([]);
  const [notificationCount, setNotificationCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const isUnauthorized = (error: unknown) => {
      if (!error || typeof error !== 'object') {
        return false;
      }

      const response = (error as { response?: { status?: number } }).response;
      return response?.status === 401;
    };

    const loadHomeData = async () => {
      const results = await Promise.allSettled([
        api.get<Category[]>('/categories'),
        api.get<HomeEvent[]>('/events'),
        api.get<HomePlace[]>('/places'),
        api.get<NotificationCountResponse>('/notifications/unread-count'),
      ]);

      if (!isMounted) {
        return;
      }

      const [
        categoriesResult,
        eventsResult,
        placesResult,
        notificationsResult,
      ] = results;

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

      let nextNotificationCount = 0;

      if (notificationsResult.status === 'fulfilled') {
        nextNotificationCount += notificationsResult.value.data.unreadCount;
      } else if (!isUnauthorized(notificationsResult.reason)) {
        console.error(
          'Erreur chargement notifications:',
          notificationsResult.reason,
        );
      }

      setNotificationCount(nextNotificationCount);
      setLoading(false);
    };

    void loadHomeData();

    return () => {
      isMounted = false;
    };
  }, []);

  const featuredEvents = useMemo(() => events.slice(0, 5), [events]);
  const popularPlaces = useMemo(() => places.slice(0, 6), [places]);
  const suggestions = useMemo(
    () =>
      featuredEvents.slice(0, 3).map((event, index) => ({
        id: event.id,
        title: event.title,
        category: event.Place?.name || event.address || 'Lieu a confirmer',
        date: formatEventDate(event.startTime),
        image: getImageUrl(event.coverUrl) || EVENT_PLACEHOLDER,
        reason:
          index === 0
            ? 'Tendance du moment'
            : index === 1
              ? 'A ne pas manquer'
              : 'Selection locale',
      })),
    [featuredEvents],
  );

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
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-black"
      showsVerticalScrollIndicator={false}
    >
      <Header
        notificationCount={notificationCount}
        onNotificationPress={() => router.push('/notifications')}
        onSearchPress={() => router.push('/search')}
      />

      <View className="mt-6">
        <Text className="ml-5 mb-4 text-lg font-bold text-gray-800 dark:text-white">
          Categories
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
          <SectionPlaceholder message="Aucune categorie disponible pour le moment." />
        )}
      </View>

      <View className="mt-8">
        <View className="mb-4 flex-row items-end justify-between px-5">
          <Text className="text-lg font-bold text-gray-800 dark:text-white">
            A la une
          </Text>
          <TouchableOpacity onPress={() => router.push(eventsRoute)}>
            <Text className="text-xs font-medium text-[#4c669f]">Voir tout</Text>
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
            contentContainerStyle={{ paddingHorizontal: 20 }}
            renderItem={({ item }) => (
              <EventCard
                title={item.title}
                date={formatEventDate(item.startTime)}
                location={item.Place?.name || item.address || 'Lieu a confirmer'}
                imageUrl={getImageUrl(item.coverUrl) || EVENT_PLACEHOLDER}
                price={formatEventPrice(item.entryFee)}
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
          <SectionPlaceholder message="Aucun evenement publie pour le moment." />
        )}
      </View>

      <View className="mt-8">
        <View className="mb-4 flex-row items-end justify-between px-5">
          <Text className="text-lg font-bold text-gray-800 dark:text-white">
            Lieux populaires
          </Text>
          <TouchableOpacity onPress={() => router.push(placesRoute)}>
            <Text className="text-xs font-medium text-[#4c669f]">Voir tout</Text>
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
                location={item.City?.name || item.address || 'Adresse a confirmer'}
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
          <SectionPlaceholder message="Aucun lieu publie pour le moment." />
        )}
      </View>

      <View className="mt-8 px-5 pb-24">
        <View className="mb-4 flex-row items-end justify-between">
          <Text className="text-lg font-bold text-gray-800 dark:text-white">
            Recommande pour toi
          </Text>
          <TouchableOpacity onPress={() => router.push(discoverRoute)}>
            <Text className="text-xs font-medium text-[#4c669f]">Voir tout</Text>
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
          <SectionPlaceholder message="Les suggestions apparaitront ici des que des evenements seront publies." />
        )}
      </View>
    </ScrollView>
  );
}
