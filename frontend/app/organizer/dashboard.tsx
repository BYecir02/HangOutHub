import React from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';

import { useUserProfile } from '@/hooks/useUserProfile';

function DashboardCard({
  title,
  value,
  accent,
}: {
  title: string;
  value: number | string;
  accent: string;
}) {
  return (
    <View className="flex-1 rounded-3xl bg-white p-5 dark:bg-gray-900">
      <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
        {title}
      </Text>
      <Text className={`mt-3 text-3xl font-bold ${accent}`}>{value}</Text>
    </View>
  );
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user, organizerEvents, ownedPlaces, loading } = useUserProfile();

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black">
      <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
        Dashboard
      </Text>
      <Text className="mt-1 text-3xl font-bold text-gray-900 dark:text-white">
        {user?.OrganizerProfile?.companyName || 'Organisation'}
      </Text>
      <Text className="mt-3 text-base text-gray-500 dark:text-gray-400">
        Vue rapide des contenus publies pour la demo.
      </Text>

      <View className="mt-6 flex-row gap-4">
        <DashboardCard
          title="Lieux"
          value={ownedPlaces.length}
          accent="text-[#2ecc71]"
        />
        <DashboardCard
          title="Evenements"
          value={organizerEvents.length}
          accent="text-[#ff4757]"
        />
      </View>

      <View className="mt-4 rounded-3xl bg-white p-5 dark:bg-gray-900">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          Etat du profil
        </Text>
        <Text className="mt-3 text-gray-600 dark:text-gray-300">
          Statut: {user?.OrganizerProfile?.status || 'INCONNU'}
        </Text>
        <Text className="mt-2 text-gray-600 dark:text-gray-300">
          Type: {user?.OrganizerProfile?.accountType || 'ORGANIZER'}
        </Text>
        <Text className="mt-2 text-gray-600 dark:text-gray-300">
          Fonction: {user?.OrganizerProfile?.jobTitle || 'Gerant'}
        </Text>
      </View>

      <View className="mt-4 flex-row gap-3 pb-24">
        <TouchableOpacity
          onPress={() => router.push('/event')}
          className="flex-1 items-center rounded-2xl bg-[#ff4757] py-4"
        >
          <Text className="font-semibold text-white">Creer un evenement</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.push('/organizer/events')}
          className="flex-1 items-center rounded-2xl bg-gray-900 py-4 dark:bg-gray-700"
        >
          <Text className="font-semibold text-white">Voir mes evenements</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
