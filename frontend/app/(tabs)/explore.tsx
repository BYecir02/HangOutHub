import React, { useCallback, useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import EventCard from '@/components/ui/EventCard';
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
    name?: string | null;
  } | null;
  address?: string | null;
}

function formatEventDate(value: string) {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function ExploreScreen() {
  const router = useRouter();
  const cachedEvents = getCache<EventItem[]>('events');
  const [events, setEvents] = useState<EventItem[]>(cachedEvents ?? []);
  const [loading, setLoading] = useState(!cachedEvents);
  const [refreshing, setRefreshing] = useState(false);

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

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black pt-16">
      <View className="flex-row items-center px-5 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#4c669f" />
        </TouchableOpacity>
        <View>
          <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest">
            Explorer
          </Text>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            Tous les evenements
          </Text>
        </View>
      </View>

      <SearchBar placeholder="Rechercher un evenement..." />

      {loading && events.length === 0 ? (
        <FlatList
          data={[0, 1, 2]}
          keyExtractor={(item) => `skeleton-${item}`}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListEmptyComponent={null}
          renderItem={() => (
            <View className="overflow-hidden rounded-[28px] border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
              <SkeletonBlock className="h-52 w-full" />
              <View className="p-5">
                <SkeletonBlock className="h-5 w-40 rounded-lg" />
                <SkeletonBlock className="mt-2 h-4 w-24 rounded-lg" />
                <SkeletonBlock className="mt-3 h-4 w-32 rounded-lg" />
              </View>
            </View>
          )}
        />
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 24, paddingBottom: 120 }}
          ItemSeparatorComponent={() => <View style={{ height: 16 }} />}
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-lg font-semibold text-gray-800 dark:text-white">
                Aucun evenement disponible
              </Text>
              <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
                Ajoute un premier evenement ou reviens plus tard.
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
            <EventCard
              title={item.title}
              date={formatEventDate(item.startTime)}
              location={item.Place?.name || item.address || 'Lieu a confirmer'}
              imageUrl={
                getImageUrl(item.coverUrl) ||
                'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200'
              }
              price={
                Number(item.entryFee || 0) > 0
                  ? `${item.entryFee} FCFA`
                  : 'Gratuit'
              }
              onPress={() =>
                router.push({
                  pathname: '/event/[id]',
                  params: { id: item.id },
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}
