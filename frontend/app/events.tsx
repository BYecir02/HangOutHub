import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import SearchBar from '@/components/ui/SearchBar';
import api, { getImageUrl } from '@/services/api';
import { getCache, setCache } from '@/services/dataCache';
import { SkeletonBlock } from '@/components/ui/Skeleton';

interface EventItem {
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
    } | null;
  } | null;
  address?: string | null;
}

type EventFilter = 'all' | 'upcoming' | 'free' | 'week';

const EVENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200';

function formatEventDate(value: string) {
  return new Date(value).toLocaleString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatPrice(value: number | string | null) {
  const amount = Number(value || 0);
  return amount > 0 ? `${amount.toLocaleString('fr-FR')} FCFA` : 'Gratuit';
}

function isWithinNextWeek(value: string) {
  const eventDate = new Date(value).getTime();
  const now = Date.now();
  const oneWeekLater = now + 7 * 24 * 60 * 60 * 1000;

  return eventDate >= now && eventDate <= oneWeekLater;
}

const FILTERS: { id: EventFilter; label: string }[] = [
  { id: 'all', label: 'Tout' },
  { id: 'upcoming', label: 'A venir' },
  { id: 'free', label: 'Gratuits' },
  { id: 'week', label: 'Cette semaine' },
];

export default function EventsScreen() {
  const router = useRouter();
  const cachedEvents = getCache<EventItem[]>('events');
  const [events, setEvents] = useState<EventItem[]>(cachedEvents ?? []);
  const [loading, setLoading] = useState(!cachedEvents);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<EventFilter>('upcoming');

  const fetchEvents = useCallback(async (forceRefresh = false) => {
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
    } catch {
      if (!getCache('events')) {
        setEvents([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return events
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
  }, [activeFilter, events, query]);

  return (
    <View className="flex-1 bg-gray-50 pt-16 dark:bg-black">
      <View className="px-5 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-4 rounded-full bg-white p-3 dark:bg-gray-900"
          >
            <Ionicons name="arrow-back" size={22} color="#4c669f" />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-xs uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
              A la une
            </Text>
            <Text className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              Tous les evenements
            </Text>
            <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Parcours tous les evenements a venir et affine rapidement selon ton
              envie du moment.
            </Text>
          </View>
        </View>
      </View>

      <SearchBar
        placeholder="Rechercher un evenement, un lieu, une ville..."
        value={query}
        onChangeText={setQuery}
      />

      <FlatList
        horizontal
        data={FILTERS}
        keyExtractor={(item) => item.id}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{
          paddingHorizontal: 20,
          paddingTop: 18,
          paddingBottom: 10,
        }}
        renderItem={({ item }) => {
          const active = activeFilter === item.id;

          return (
            <TouchableOpacity
              onPress={() => setActiveFilter(item.id)}
              className="mr-3 rounded-full bg-white px-4 py-2.5 dark:bg-gray-900"
              style={active ? { backgroundColor: '#4c669f' } : undefined}
            >
              <Text
                className={`text-sm font-semibold ${
                  active
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        }}
        style={{ flexGrow: 0 }}
      />

      {loading && events.length === 0 ? (
        <FlatList
          data={[0, 1, 2]}
          keyExtractor={(item) => `skeleton-${item}`}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListHeaderComponent={
            <Text className="pb-4 text-sm text-gray-500 dark:text-gray-400">
              Chargement des evenements...
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
      ) : (
        <FlatList
          data={filteredEvents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListHeaderComponent={
            <Text className="pb-4 text-sm text-gray-500 dark:text-gray-400">
              {filteredEvents.length} resultat(s)
            </Text>
          }
          ListEmptyComponent={
            <View className="items-center rounded-3xl bg-white px-6 py-12 dark:bg-gray-900">
              <Text className="text-lg font-semibold text-gray-900 dark:text-white">
                Aucun evenement ne correspond
              </Text>
              <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
                Essaie une autre recherche ou reviens au filtre complet.
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
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/event/[id]',
                  params: { id: item.id },
                })
              }
              className="overflow-hidden rounded-[28px] border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900"
            >
              <Image
                source={{
                  uri: getImageUrl(item.coverUrl) || EVENT_PLACEHOLDER,
                }}
                className="h-52 w-full bg-gray-200 dark:bg-gray-800"
                resizeMode="cover"
              />

              <View className="p-5">
                <View className="flex-row flex-wrap items-center gap-2">
                  <View className="rounded-full bg-red-100 px-3 py-2 dark:bg-red-900/30">
                    <Text className="text-xs font-semibold text-red-700 dark:text-red-300">
                      {formatPrice(item.entryFee)}
                    </Text>
                  </View>
                  <View className="rounded-full bg-gray-100 px-3 py-2 dark:bg-gray-800">
                    <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      {item.Place?.City?.name || 'Ville a confirmer'}
                    </Text>
                  </View>
                </View>

                <Text className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
                  {item.title}
                </Text>

                <View className="mt-3 flex-row items-center">
                  <Ionicons name="time-outline" size={16} color="#ff4757" />
                  <Text className="ml-2 text-sm text-gray-600 dark:text-gray-300">
                    {formatEventDate(item.startTime)}
                  </Text>
                </View>

                <View className="mt-2 flex-row items-center">
                  <Ionicons name="location-outline" size={16} color="#4c669f" />
                  <Text
                    className="ml-2 flex-1 text-sm text-gray-500 dark:text-gray-400"
                    numberOfLines={1}
                  >
                    {item.Place?.name || item.address || 'Lieu a confirmer'}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}
    </View>
  );
}
