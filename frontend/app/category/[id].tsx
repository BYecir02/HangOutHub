import React, { useEffect, useState } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import EventCard from '@/components/ui/EventCard';
import PlaceCard from '@/components/ui/PlaceCard';
import api, { getImageUrl } from '@/services/api';
import { getCategoryCache, setCategoryCache } from '@/services/dataCache';
import { SkeletonBlock } from '@/components/ui/Skeleton';

interface CategoryTag {
  id: number;
  name: string;
}

interface CategoryResult {
  category: {
    id: number;
    name: string;
    icon: string;
    color: string;
    Tag: CategoryTag[];
  };
  events: {
    id: string;
    title: string;
    startTime: string;
    coverUrl: string | null;
    entryFee: number | string | null;
    Place?: {
      id: string;
      name?: string | null;
      address?: string | null;
      City?: {
        id: number;
        name: string;
      } | null;
    } | null;
    address?: string | null;
  }[];
  places: {
    id: string;
    name: string;
    coverUrl: string | null;
    avgRating?: number | null;
    City?: {
      id: number;
      name: string;
    } | null;
    address?: string | null;
  }[];
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

function EmptyBlock({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <View className="rounded-3xl bg-white px-5 py-6 dark:bg-gray-900">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </Text>
      <Text className="mt-2 text-gray-500 dark:text-gray-400">{message}</Text>
    </View>
  );
}

export default function CategoryDiscoverScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const [data, setData] = useState<CategoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchCategory = async () => {
      if (!params.id) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      const cached = getCategoryCache<CategoryResult>(params.id);
      const isRefresh = !!cached;

      if (cached && isMounted) {
        setData(cached);
        setLoading(false);
        setRefreshing(true);
      } else if (isMounted) {
        setLoading(true);
      }

      try {
        const response = await api.get<CategoryResult>(
          `/categories/${params.id}/discover`,
        );

        if (isMounted) {
          setData(response.data);
          setCategoryCache(params.id, response.data);
        }
      } catch {
        if (isMounted && !isRefresh) {
          setData(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void fetchCategory();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  if (!data && !loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8 dark:bg-black">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          Categorie introuvable
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-[#4c669f] px-5 py-3"
        >
          <Text className="font-semibold text-white">Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-black"
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            if (!params.id) {
              return;
            }

            void (async () => {
              setRefreshing(true);
              try {
                const response = await api.get<CategoryResult>(
                  `/categories/${params.id}/discover`,
                );
                setData(response.data);
                setCategoryCache(params.id, response.data);
              } finally {
                setRefreshing(false);
              }
            })();
          }}
          tintColor="#4c669f"
        />
      }
    >
      {loading && !data ? (
        <View className="px-5 pb-24 pt-16">
          <SkeletonBlock className="h-11 w-11 rounded-full" />
          <SkeletonBlock className="mt-6 h-4 w-24 rounded-lg" />
          <SkeletonBlock className="mt-3 h-8 w-48 rounded-lg" />
          <SkeletonBlock className="mt-4 h-4 w-64 rounded-lg" />

          <View className="mt-10">
            <View className="mb-4 flex-row items-center justify-between">
              <SkeletonBlock className="h-6 w-32 rounded-lg" />
              <SkeletonBlock className="h-4 w-10 rounded-lg" />
            </View>
            <FlatList
              data={[0, 1]}
              keyExtractor={(item) => `event-skeleton-${item}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
              renderItem={() => (
                <View className="mr-4 w-64 overflow-hidden rounded-[28px] border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
                  <SkeletonBlock className="h-36 w-full" />
                  <View className="p-4">
                    <SkeletonBlock className="h-4 w-24 rounded-lg" />
                    <SkeletonBlock className="mt-2 h-5 w-40 rounded-lg" />
                    <SkeletonBlock className="mt-2 h-4 w-28 rounded-lg" />
                  </View>
                </View>
              )}
            />
          </View>

          <View className="mt-10">
            <View className="mb-4 flex-row items-center justify-between">
              <SkeletonBlock className="h-6 w-24 rounded-lg" />
              <SkeletonBlock className="h-4 w-10 rounded-lg" />
            </View>
            <FlatList
              data={[0, 1]}
              keyExtractor={(item) => `place-skeleton-${item}`}
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 8 }}
              renderItem={() => (
                <View className="mr-4 w-64 overflow-hidden rounded-[28px] border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
                  <SkeletonBlock className="h-36 w-full" />
                  <View className="p-4">
                    <SkeletonBlock className="h-4 w-24 rounded-lg" />
                    <SkeletonBlock className="mt-2 h-5 w-40 rounded-lg" />
                    <SkeletonBlock className="mt-2 h-4 w-28 rounded-lg" />
                  </View>
                </View>
              )}
            />
          </View>
        </View>
      ) : null}
      {data ? (
        <>
          <View
            className="px-5 pb-8 pt-16"
            style={{ backgroundColor: `${data.category.color}18` }}
          >
            <TouchableOpacity
              onPress={() => router.back()}
              className="mb-6 h-11 w-11 items-center justify-center rounded-full bg-white/80 dark:bg-black/30"
            >
              <Ionicons name="arrow-back" size={22} color="#111827" />
            </TouchableOpacity>

            <Text className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-300">
              Decouvrir
            </Text>
            <Text className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
              {data.category.name}
            </Text>
            <Text className="mt-3 max-w-[90%] text-base text-gray-600 dark:text-gray-300">
              {data.places.length} lieu(x) et {data.events.length} evenement(s)
              trouves pour cette categorie.
            </Text>

            {data.category.Tag.length > 0 ? (
              <FlatList
                data={data.category.Tag}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 20 }}
                renderItem={({ item }) => (
                  <View className="mr-2 rounded-full bg-white px-3 py-2 dark:bg-gray-900">
                    <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      {item.name}
                    </Text>
                  </View>
                )}
              />
            ) : null}
          </View>

          <View className="px-5 pb-24 pt-6">
            <View className="mb-4 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Evenements
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {data.events.length}
              </Text>
            </View>

            {data.events.length > 0 ? (
              <FlatList
                data={data.events}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
                renderItem={({ item }) => (
                  <EventCard
                    title={item.title}
                    date={formatEventDate(item.startTime)}
                    location={
                      item.Place?.name ||
                      item.Place?.City?.name ||
                      item.address ||
                      'Lieu a confirmer'
                    }
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
              <EmptyBlock
                title="Aucun evenement"
                message="Cette categorie n'a pas encore d'evenement associe."
              />
            )}

            <View className="mb-4 mt-8 flex-row items-center justify-between">
              <Text className="text-xl font-bold text-gray-900 dark:text-white">
                Lieux
              </Text>
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {data.places.length}
              </Text>
            </View>

            {data.places.length > 0 ? (
              <FlatList
                data={data.places}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
                renderItem={({ item }) => (
                  <PlaceCard
                    name={item.name}
                    location={
                      item.City?.name || item.address || 'Adresse a confirmer'
                    }
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
              <EmptyBlock
                title="Aucun lieu"
                message="Cette categorie n'a pas encore de lieu associe."
              />
            )}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}
