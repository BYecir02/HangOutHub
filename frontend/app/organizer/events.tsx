import React from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useUserProfile } from '@/hooks/useUserProfile';
import { getImageUrl } from '@/services/api';

const EVENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200';

function formatEventDate(value: string) {
  return new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OrganizerEventsScreen() {
  const router = useRouter();
  const { organizerEvents, loading } = useUserProfile();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#ff4757" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black">
      <View className="flex-row items-center justify-between">
        <View>
          <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
            Organisateur
          </Text>
          <Text className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
            Mes evenements
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => router.push('/event')}
          className="rounded-full bg-[#ff4757] p-3"
        >
          <Ionicons name="add" size={22} color="white" />
        </TouchableOpacity>
      </View>

      <Text className="mt-3 text-base text-gray-500 dark:text-gray-400">
        Gere les evenements publies et verifie leur rendu public.
      </Text>

      <View className="mt-6 pb-24">
        {organizerEvents.length > 0 ? (
          organizerEvents.map((event) => (
            <TouchableOpacity
              key={event.id}
              onPress={() =>
                router.push({
                  pathname: '/event/[id]',
                  params: { id: event.id },
                })
              }
              className="mb-4 flex-row rounded-3xl bg-white p-3 dark:bg-gray-900"
            >
              <Image
                source={{
                  uri: getImageUrl(event.coverUrl) || EVENT_PLACEHOLDER,
                }}
                className="h-24 w-24 rounded-2xl bg-gray-200 dark:bg-gray-800"
                resizeMode="cover"
              />
              <View className="ml-4 flex-1 justify-center">
                <Text
                  className="text-lg font-semibold text-gray-900 dark:text-white"
                  numberOfLines={1}
                >
                  {event.title}
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {formatEventDate(event.startTime)}
                </Text>
                <Text className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                  {event.Place?.name || 'Lieu a confirmer'}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          ))
        ) : (
          <View className="items-center rounded-3xl bg-white px-6 py-10 dark:bg-gray-900">
            <Text className="text-center text-lg font-semibold text-gray-900 dark:text-white">
              Aucun evenement publie
            </Text>
            <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
              Cree ton premier evenement pour rendre ton profil plus credible.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/event')}
              className="mt-5 rounded-xl bg-[#ff4757] px-5 py-3"
            >
              <Text className="font-semibold text-white">
                Creer un evenement
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
