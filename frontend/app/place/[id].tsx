import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import api, { getImageUrl, storage } from '@/services/api';

interface RelatedEvent {
  id: string;
  title: string;
  startTime: string;
  coverUrl: string | null;
  entryFee?: number | string | null;
}

interface PlaceDetail {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  coverUrl?: string | null;
  images: string[];
  avgRating?: number | null;
  priceLevel?: number | null;
  City?: {
    name?: string | null;
  } | null;
  Owner?: {
    displayName?: string | null;
    username?: string | null;
  } | null;
  Event?: RelatedEvent[];
}

const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';

function formatPriceLevel(level?: number | null) {
  if (!level || level < 1) {
    return 'Prix non renseigne';
  }

  return `${'$'.repeat(level)} · Niveau ${level}`;
}

function formatEventDate(value: string) {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function PlaceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [canSave, setCanSave] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const fetchPlace = async () => {
      if (!params.id) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const response = await api.get<PlaceDetail>(`/places/${params.id}`);
        if (isMounted) {
          setPlace(response.data);
        }

        const token = await storage.getItem('userToken');
        if (!token) {
          if (isMounted) {
            setCanSave(false);
            setIsSaved(false);
          }
          return;
        }

        try {
          const savedPlacesResponse = await api.get<{ id: string }[]>(
            '/places/saved/mine',
          );
          if (isMounted) {
            setCanSave(true);
            setIsSaved(
              savedPlacesResponse.data.some(
                (savedPlace) => savedPlace.id === params.id,
              ),
            );
          }
        } catch {
          if (isMounted) {
            setCanSave(true);
            setIsSaved(false);
          }
        }
      } catch {
        if (isMounted) {
          setPlace(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchPlace();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  if (!place) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8 dark:bg-black">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          Lieu introuvable
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-[#2ecc71] px-5 py-3"
        >
          <Text className="font-semibold text-white">Retour</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const heroImage = getImageUrl(place.coverUrl) || PLACE_PLACEHOLDER;
  const gallery =
    place.images?.length > 0
      ? place.images.map((image) => getImageUrl(image) || PLACE_PLACEHOLDER)
      : [heroImage];

  const handleCreateOuting = () => {
    router.push({
      pathname: '/outing',
      params: {
        title: `Sortie a ${place.name}`,
        placeId: place.id,
        sourceLabel: place.name,
      },
    });
  };

  const handleToggleSave = async () => {
    if (!canSave) {
      Alert.alert('Connexion requise', 'Connecte-toi pour enregistrer un lieu.');
      return;
    }

    setSaveLoading(true);

    try {
      const response = await api.post<{ saved: boolean }>(`/places/${place.id}/save`);
      setIsSaved(response.data.saved);
      Alert.alert(
        'Succes',
        response.data.saved
          ? 'Lieu ajoute a tes envies.'
          : 'Lieu retire de tes envies.',
      );
    } catch {
      Alert.alert('Erreur', "Impossible de mettre a jour tes envies.");
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-black"
      showsVerticalScrollIndicator={false}
    >
      <View className="relative">
        <Image source={{ uri: heroImage }} className="h-80 w-full" resizeMode="cover" />
        <View className="absolute inset-x-0 top-0 flex-row items-center justify-between px-5 pt-14">
          <TouchableOpacity
            onPress={() => router.back()}
            className="rounded-full bg-black/45 p-3"
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View className="rounded-full bg-black/45 px-3 py-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-white">
              Lieu
            </Text>
          </View>
        </View>
      </View>

      <View className="-mt-8 rounded-t-[28px] bg-gray-50 px-5 pt-6 dark:bg-black">
        <Text className="text-3xl font-bold text-gray-900 dark:text-white">
          {place.name}
        </Text>

        <View className="mt-4 flex-row flex-wrap gap-2">
          <View className="rounded-full bg-green-100 px-3 py-2 dark:bg-green-900/30">
            <Text className="text-xs font-semibold text-green-700 dark:text-green-300">
              {place.City?.name || 'Ville non renseignee'}
            </Text>
          </View>
          <View className="rounded-full bg-gray-200 px-3 py-2 dark:bg-gray-800">
            <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {formatPriceLevel(place.priceLevel)}
            </Text>
          </View>
          {typeof place.avgRating === 'number' && place.avgRating > 0 ? (
            <View className="flex-row items-center rounded-full bg-yellow-100 px-3 py-2 dark:bg-yellow-900/30">
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text className="ml-1 text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                {place.avgRating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-6 rounded-3xl bg-white p-5 dark:bg-gray-900">
          <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Prochaine action
          </Text>
          <Text className="mt-2 text-base leading-7 text-gray-700 dark:text-gray-200">
            Garde ce lieu pour plus tard ou transforme-le tout de suite en vraie
            sortie.
          </Text>

          <View className="mt-4 flex-row gap-3">
            <TouchableOpacity
              onPress={handleCreateOuting}
              className="flex-1 items-center rounded-2xl bg-[#4c669f] px-4 py-4"
            >
              <Text className="text-sm font-semibold text-white">
                Organiser une sortie
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleToggleSave}
              disabled={saveLoading}
              className={`flex-1 items-center rounded-2xl border px-4 py-4 ${
                isSaved
                  ? 'border-[#2ecc71] bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
              }`}
            >
              {saveLoading ? (
                <ActivityIndicator color={isSaved ? '#2ecc71' : '#4c669f'} />
              ) : (
                <Text
                  className={`text-sm font-semibold ${
                    isSaved
                      ? 'text-[#2ecc71]'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {isSaved ? 'Enregistre' : 'Enregistrer'}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-6 rounded-3xl bg-white p-5 dark:bg-gray-900">
          <View className="flex-row items-start">
            <Ionicons name="location-outline" size={20} color="#2ecc71" />
            <View className="ml-3 flex-1">
              <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Adresse
              </Text>
              <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                {place.address || 'Adresse a confirmer'}
              </Text>
            </View>
          </View>

          <View className="mt-5 flex-row items-start">
            <Ionicons name="person-outline" size={20} color="#4c669f" />
            <View className="ml-3 flex-1">
              <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                Publie par
              </Text>
              <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                {place.Owner?.displayName ||
                  place.Owner?.username ||
                  'Organisateur inconnu'}
              </Text>
            </View>
          </View>
        </View>

        <View className="mt-6">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            A propos
          </Text>
          <Text className="mt-3 text-base leading-7 text-gray-600 dark:text-gray-300">
            {place.description || 'Aucune description disponible pour le moment.'}
          </Text>
        </View>

        <View className="mt-6">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            Galerie
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
          >
            {gallery.map((image, index) => (
              <Image
                key={`${place.id}-gallery-${index}`}
                source={{ uri: image }}
                className="mr-3 h-28 w-40 rounded-2xl bg-gray-200 dark:bg-gray-800"
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        </View>

        <View className="mt-6 pb-24">
          <Text className="text-lg font-bold text-gray-900 dark:text-white">
            Evenements lies au lieu
          </Text>
          {place.Event && place.Event.length > 0 ? (
            place.Event.map((event) => (
              <TouchableOpacity
                key={event.id}
                onPress={() =>
                  router.push({
                    pathname: '/event/[id]',
                    params: { id: event.id },
                  })
                }
                className="mt-4 flex-row rounded-3xl bg-white p-3 dark:bg-gray-900"
              >
                <Image
                  source={{
                    uri: getImageUrl(event.coverUrl) || PLACE_PLACEHOLDER,
                  }}
                  className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-gray-800"
                  resizeMode="cover"
                />
                <View className="ml-4 flex-1 justify-center">
                  <Text
                    className="text-base font-semibold text-gray-900 dark:text-white"
                    numberOfLines={1}
                  >
                    {event.title}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {formatEventDate(event.startTime)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
              </TouchableOpacity>
            ))
          ) : (
            <Text className="mt-3 text-base text-gray-500 dark:text-gray-400">
              Aucun evenement rattache a ce lieu pour le moment.
            </Text>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
