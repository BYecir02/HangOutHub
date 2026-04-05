import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import api, { clearAuthState, getImageUrl } from '../../services/api';
import PostItem from '../../components/social/PostItem';

const isUnauthorized = (error: unknown) =>
  (error as { response?: { status?: number } }).response?.status === 401;

interface PublicUserProfile {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  coverUrl?: string | null;
  bio?: string | null;
  role?: string;
  OrganizerProfile?: {
    companyName?: string | null;
    jobTitle?: string | null;
    status?: string | null;
  } | null;
  OwnedPlaces?: {
    id: string;
    name: string;
    coverUrl?: string | null;
    City?: {
      id: number;
      name: string;
    } | null;
  }[];
  _count?: {
    Post?: number;
    Outing?: number;
  };
}

interface UserPost {
  id: string;
  content: string;
  images: string[];
  isLiked: boolean;
  visibility?: 'public' | 'friends' | 'private' | 'custom';
  createdAt?: string;
  User?: {
    username?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
  _count?: {
    likes: number;
    comments: number;
  };
}

const COVER_PLACEHOLDER =
  'https://images.unsplash.com/photo-1557683316-973673baf926';

export default function PublicProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  useColorScheme();
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<PublicUserProfile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);

  const handleInvalidSession = useCallback(async () => {
    await clearAuthState();
    router.replace('/');
  }, [router]);

  const loadProfile = useCallback(async () => {
    if (!params.id) {
      return;
    }

    setLoading(true);

    try {
      const [profileResponse, postsResponse] = await Promise.all([
        api.get<PublicUserProfile>(`/users/public/${params.id}`),
        api.get<UserPost[]>(`/posts/user/${params.id}`),
      ]);

      setProfile(profileResponse.data);
      setPosts(postsResponse.data);
    } catch (error) {
      if (isUnauthorized(error)) {
        await handleInvalidSession();
        return;
      }

      console.error('Erreur chargement profil public:', error);
      setProfile(null);
      setPosts([]);
    } finally {
      setLoading(false);
    }
  }, [handleInvalidSession, params.id]);

  useFocusEffect(
    useCallback(() => {
      void loadProfile();
    }, [loadProfile]),
  );

  const handleCommentPost = (post: { id: string }) => {
    router.push({ pathname: '/comments', params: { postId: post.id } });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }

  if (!profile) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <Text className="text-lg font-semibold text-gray-900 dark:text-white">
          {t('publicProfileNotFound')}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-full bg-[#4c669f] px-5 py-3"
        >
          <Text className="font-semibold text-white">{t('publicProfileBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const isOrganizer =
    profile.role === 'ORGANIZER' || profile.role === 'PLACE_OWNER';
  const coverUrl = getImageUrl(profile.coverUrl) || COVER_PLACEHOLDER;
  const avatarUrl = getImageUrl(profile.avatarUrl) || 'https://i.pravatar.cc/150';
  const publicProfileLabel =
    profile.role === 'PLACE_OWNER'
      ? t('publicProfileLabelPlaceOwner')
      : profile.role === 'ORGANIZER'
        ? t('publicProfileLabelOrganizer')
        : t('publicProfileLabel');

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-black"
      showsVerticalScrollIndicator={false}
    >
      <View className="h-48 bg-gray-200 dark:bg-gray-800">
        <Image source={{ uri: coverUrl }} className="h-full w-full" resizeMode="cover" />
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute left-5 top-14 rounded-full bg-white/80 p-2"
        >
          <Ionicons name="arrow-back" size={20} color="#111827" />
        </TouchableOpacity>
      </View>

      <View className="-mt-12 px-5">
        <View className="flex-row items-end justify-between">
          <Image
            source={{ uri: avatarUrl }}
            className="h-24 w-24 rounded-full border-4 border-white bg-gray-200 dark:border-black dark:bg-gray-800"
          />
          <View className="items-end">
            <Text className="text-xs uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">
              {publicProfileLabel}
            </Text>
            {isOrganizer && profile.OrganizerProfile?.jobTitle ? (
              <Text className="mt-1 text-sm font-semibold text-gray-700 dark:text-gray-300">
                {profile.OrganizerProfile.jobTitle}
              </Text>
            ) : null}
          </View>
        </View>

        <Text className="mt-4 text-2xl font-bold text-gray-900 dark:text-white">
          {profile.displayName || profile.username}
        </Text>
        <Text className="text-sm font-medium text-gray-500 dark:text-gray-400">
          @{profile.username}
        </Text>
        <Text className="mt-3 text-base text-gray-600 dark:text-gray-300">
          {profile.bio || t('profileNoBioYet')}
        </Text>

        <View className="mt-5 flex-row rounded-2xl border border-gray-100 bg-gray-50 px-1 py-3 dark:border-gray-800 dark:bg-gray-900">
          <View className="flex-1 items-center">
            <Text className="text-base font-bold text-gray-900 dark:text-white">
              {profile._count?.Post || posts.length}
            </Text>
            <Text className="mt-1 text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
              {t('profileStatsPosts')}
            </Text>
          </View>
          {isOrganizer ? (
            <View className="flex-1 items-center border-l border-gray-100 dark:border-gray-800">
              <Text className="text-base font-bold text-gray-900 dark:text-white">
                {profile.OwnedPlaces?.length || 0}
              </Text>
              <Text className="mt-1 text-[11px] uppercase tracking-wide text-gray-400 dark:text-gray-500">
                {t('profileStatsPlaces')}
              </Text>
            </View>
          ) : null}
        </View>
      </View>

      {isOrganizer && profile.OwnedPlaces && profile.OwnedPlaces.length > 0 ? (
        <View className="mt-8 px-5">
          <Text className="mb-4 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('publicProfilePlacesLabel')}
          </Text>
          {profile.OwnedPlaces.map((place) => (
            <TouchableOpacity
              key={place.id}
              onPress={() =>
                router.push({
                  pathname: '/place/[id]',
                  params: { id: place.id },
                })
              }
              className="mb-3 flex-row items-center rounded-2xl bg-gray-50 p-3 dark:bg-gray-900"
            >
              <Image
                source={{
                  uri:
                    getImageUrl(place.coverUrl) ||
                    'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200',
                }}
                className="h-16 w-16 rounded-xl bg-gray-200 dark:bg-gray-800"
                resizeMode="cover"
              />
              <View className="ml-3 flex-1">
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {place.name}
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {place.City?.name || t('publicProfilePlaceFallback')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}

      <View className="mt-8">
        {posts.length > 0 ? (
          posts.map((post) => (
            <PostItem
              key={post.id}
              item={post}
              onComment={handleCommentPost}
            />
          ))
        ) : (
          <View className="mx-5 items-center rounded-[28px] bg-gray-50 px-6 py-10 dark:bg-gray-900">
            <Text className="text-lg font-semibold text-gray-900 dark:text-white">
              {t('publicProfileNoPostsTitle')}
            </Text>
            <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
              {t('publicProfileNoPostsDescription')}
            </Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}
