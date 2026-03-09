import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import PlaceCard from '@/components/ui/PlaceCard';
import SearchBar from '@/components/ui/SearchBar';
import api, { getImageUrl } from '@/services/api';

interface PlaceItem {
  id: string;
  name: string;
  coverUrl: string | null;
  avgRating?: number | null;
  City?: {
    name?: string | null;
  } | null;
  address?: string | null;
}

export default function PlacesScreen() {
  const router = useRouter();
  const [places, setPlaces] = useState<PlaceItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchPlaces = async () => {
      try {
        const response = await api.get('/places');
        if (isMounted) {
          setPlaces(response.data);
        }
      } catch {
        if (isMounted) {
          setPlaces([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchPlaces();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black pt-16">
      <View className="flex-row items-center px-5 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#2ecc71" />
        </TouchableOpacity>
        <View>
          <Text className="text-gray-500 dark:text-gray-400 text-xs uppercase tracking-widest">
            Decouvrir
          </Text>
          <Text className="text-2xl font-bold text-gray-900 dark:text-white">
            Tous les lieux
          </Text>
        </View>
      </View>

      <SearchBar placeholder="Rechercher un lieu..." />

      {loading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2ecc71" />
        </View>
      ) : (
        <FlatList
          data={places}
          numColumns={2}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 12, paddingTop: 24, paddingBottom: 120 }}
          columnWrapperStyle={{ justifyContent: 'space-between', marginBottom: 12 }}
          ListEmptyComponent={
            <View className="w-full items-center py-16">
              <Text className="text-lg font-semibold text-gray-800 dark:text-white">
                Aucun lieu publie
              </Text>
              <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
                Les lieux crees apparaitront ici.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <PlaceCard
              name={item.name}
              location={item.City?.name || item.address || 'Adresse a confirmer'}
              imageUrl={
                getImageUrl(item.coverUrl) ||
                'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200'
              }
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
      )}
    </View>
  );
}
