import React from 'react';
import {
  Image,
  Text,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { getImageUrl } from '../../services/api';

interface ProfileHeaderProps {
  user: any;
  isOrganizer?: boolean;
  onImagePress: (url: string) => void;
}

function getStatusColors(status?: string) {
  if (status === 'APPROVED') {
    return {
      bg: 'bg-green-100 dark:bg-green-900/30',
      text: 'text-green-700 dark:text-green-300',
      label: 'Profil verifie',
    };
  }

  if (status === 'PENDING') {
    return {
      bg: 'bg-amber-100 dark:bg-amber-900/30',
      text: 'text-amber-700 dark:text-amber-300',
      label: 'Validation en attente',
    };
  }

  return {
    bg: 'bg-gray-100 dark:bg-gray-800',
    text: 'text-gray-600 dark:text-gray-300',
    label: 'Profil en cours',
  };
}

export default function ProfileHeader({
  user,
  isOrganizer = false,
  onImagePress,
}: ProfileHeaderProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const coverUrl =
    getImageUrl(user?.coverUrl) ||
    'https://images.unsplash.com/photo-1557683316-973673baf926';
  const avatarUrl = getImageUrl(user?.avatarUrl) || 'https://i.pravatar.cc/150';
  const statusConfig = getStatusColors(user?.OrganizerProfile?.status);

  return (
    <View>
      <View className="h-48 bg-gray-200 dark:bg-gray-800">
        <TouchableOpacity
          activeOpacity={0.9}
          onPress={() => onImagePress(coverUrl)}
          className="h-full w-full"
        >
          <Image source={{ uri: coverUrl }} className="h-full w-full" resizeMode="cover" />
        </TouchableOpacity>

        <View className="absolute -bottom-12 left-5">
          <View className="relative rounded-full bg-white p-1 shadow-sm dark:bg-black">
            <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(avatarUrl)}>
              <Image source={{ uri: avatarUrl }} className="h-24 w-24 rounded-full" resizeMode="cover" />
            </TouchableOpacity>
            <TouchableOpacity className="absolute bottom-0 right-0 rounded-full border-2 border-white bg-blue-500 p-1.5 dark:border-black">
              <Ionicons name="camera" size={14} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View className="mt-14 px-5">
        <View className="flex-row items-start justify-between">
          <View className="flex-1 pr-4">
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">
              {user?.displayName || user?.username || 'Utilisateur'}
            </Text>
            <Text className="font-medium text-gray-500 dark:text-gray-400">
              @{user?.username || 'user'}
            </Text>
          </View>
          <TouchableOpacity
            className="rounded-full border border-gray-100 bg-gray-50 p-2 dark:border-gray-700 dark:bg-gray-800"
            onPress={() => router.push('/settings')}
          >
            <Ionicons
              name="settings-outline"
              size={24}
              color={isDark ? '#fff' : '#333'}
            />
          </TouchableOpacity>
        </View>

        {isOrganizer ? (
          <View className={`mt-3 self-start rounded-full px-3 py-2 ${statusConfig.bg}`}>
            <Text className={`text-xs font-semibold uppercase tracking-widest ${statusConfig.text}`}>
              {statusConfig.label}
            </Text>
          </View>
        ) : null}

        <Text className="mt-3 leading-5 text-gray-700 dark:text-gray-300">
          {user?.bio || 'Aucune biographie pour le moment.'}
        </Text>

        <View className="mt-4 flex-row gap-3">
          <TouchableOpacity
            className="flex-1 items-center rounded-lg border border-gray-200 bg-gray-100 py-2.5 active:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:active:bg-gray-700"
            onPress={() => router.push('/edit-profile')}
          >
            <Text className="text-sm font-bold text-gray-800 dark:text-white">
              Modifier le profil
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            className="flex-1 items-center rounded-lg border border-gray-200 bg-gray-100 py-2.5 active:bg-gray-200 dark:border-gray-700 dark:bg-gray-800 dark:active:bg-gray-700"
            onPress={() =>
              router.push(isOrganizer ? '/organizer/events' : '/preferences')
            }
          >
            <Text className="text-sm font-bold text-gray-800 dark:text-white">
              {isOrganizer ? 'Mes evenements' : 'Mes preferences'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
