import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileStats from '../../components/profile/ProfileStats';
import PostItem from '../../components/social/PostItem';
import { SkeletonBlock } from '../../components/ui/Skeleton';
import Tabs from '../../components/ui/Tabs';
import { getImageUrl } from '../../services/api';
import { useUserProfile } from '../../hooks/useUserProfile';

const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';
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

function EmptyPanel({
  icon,
  color,
  title,
  description,
  actionLabel,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  description: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  return (
    <View className="items-center rounded-[28px] bg-gray-50 px-6 py-12 dark:bg-gray-900">
      <View
        className="h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}20` }}
      >
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </Text>
      <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
        {description}
      </Text>
      {actionLabel && onPress ? (
        <TouchableOpacity
          onPress={onPress}
          className="mt-5 rounded-full px-5 py-3"
          style={{ backgroundColor: color }}
        >
          <Text className="font-semibold text-white">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const {
    user,
    posts,
    outings,
    savedPlaces,
    organizerEvents,
    ownedPlaces,
    connectionsCount,
    loading,
    deletePost,
  } = useUserProfile();

  const isOrganizer =
    user?.role === 'ORGANIZER' || user?.role === 'PLACE_OWNER';
  const [activeTab, setActiveTab] = useState('');

  React.useEffect(() => {
    if (!user || activeTab) {
      return;
    }

    setActiveTab(isOrganizer ? 'overview' : 'outings');
  }, [activeTab, isOrganizer, user]);

  const displayUser = useMemo(() => {
    if (isOrganizer && user?.OrganizerProfile) {
      return {
        ...user,
        displayName: user.OrganizerProfile.companyName,
        username:
          user.displayName || user.username
            ? `${user.displayName || user.username} · ${
                user.OrganizerProfile.jobTitle || 'Gerant'
              }`
            : user.username,
      };
    }

    return user;
  }, [isOrganizer, user]);

  const sortedOutings = useMemo(
    () =>
      [...outings].sort(
        (left, right) =>
          new Date(left.scheduledDate).getTime() -
          new Date(right.scheduledDate).getTime(),
      ),
    [outings],
  );
  const featuredOuting = sortedOutings[0] ?? null;
  const tabItems = isOrganizer
    ? [
        { id: 'overview', label: 'Vue d ensemble' },
        { id: 'places', label: 'Lieux' },
        { id: 'events', label: 'Evenements' },
      ]
    : [
        { id: 'outings', label: 'Sorties' },
        { id: 'saved', label: 'Envies' },
        { id: 'posts', label: 'Posts' },
      ];

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost(postId);
      Alert.alert('Succes', 'Post supprime.');
    } catch {
      Alert.alert('Erreur', 'Impossible de supprimer le post.');
    }
  };

  const handleEditPost = (post: {
    id: string;
    content?: string | null;
    visibility?: 'public' | 'friends' | 'private';
  }) => {
    router.push({
      pathname: '/post',
      params: {
        postId: post.id,
        content: post.content,
        visibility: post.visibility,
      },
    });
  };

  const handleCommentPost = (post: { id: string }) => {
    router.push({ pathname: '/comments', params: { postId: post.id } });
  };

  if (loading && !user) {
    return (
      <ScrollView className="flex-1 bg-white dark:bg-black" showsVerticalScrollIndicator={false}>
        <View className="h-44 bg-gray-200 dark:bg-gray-800" />
        <View className="-mt-10 px-5">
          <SkeletonBlock className="h-20 w-20 rounded-full border-4 border-white dark:border-black" />
          <SkeletonBlock className="mt-4 h-6 w-40 rounded-lg" />
          <SkeletonBlock className="mt-2 h-4 w-56 rounded-lg" />
        </View>

        <View className="mt-6 flex-row justify-between px-5">
          {[0, 1, 2, 3].map((item) => (
            <View key={`stat-${item}`} className="items-center">
              <SkeletonBlock className="h-6 w-12 rounded-lg" />
              <SkeletonBlock className="mt-2 h-3 w-16 rounded-lg" />
            </View>
          ))}
        </View>

        <View className="mt-8 px-5">
          <SkeletonBlock className="h-10 w-full rounded-full" />
          <View className="mt-6">
            <SkeletonBlock className="h-28 w-full rounded-[28px]" />
            <SkeletonBlock className="mt-4 h-28 w-full rounded-[28px]" />
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black" showsVerticalScrollIndicator={false}>
      <ProfileHeader
        user={displayUser}
        isOrganizer={isOrganizer}
        onImagePress={setPreviewImage}
      />

      <ProfileStats
        postsCount={posts.length}
        outingsCount={outings.length}
        connectionsCount={connectionsCount}
        savedCount={savedPlaces.length}
        isOrganizer={isOrganizer}
        placesCount={ownedPlaces.length}
        eventsCount={organizerEvents.length}
        onConnectionsPress={() => router.push('/connections')}
      />

      <View className="mt-8 pb-10">
        <Tabs items={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />
        <View className="min-h-[220px] pt-5">
          {!isOrganizer && activeTab === 'outings' ? (
            <View className="px-5">
              {featuredOuting ? (
                <>
                <TouchableOpacity
                  onPress={() =>
                    router.push({
                      pathname: '/outing/[id]',
                      params: { id: featuredOuting.id },
                    })
                  }
                  className="rounded-[28px] bg-[#4c669f]/10 p-5"
                >
                  <Text className="text-xs uppercase tracking-widest text-[#4c669f]">
                    A ne pas oublier
                  </Text>
                  <Text className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                    {featuredOuting.title}
                  </Text>
                  <View className="mt-4 rounded-3xl bg-white p-4 dark:bg-gray-900">
                    <Text className="text-sm text-gray-700 dark:text-gray-200">
                      {formatEventDate(featuredOuting.scheduledDate)}
                    </Text>
                    <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {featuredOuting.Place?.name ||
                        featuredOuting.Place?.City?.name ||
                        featuredOuting.Place?.address ||
                        'Lieu libre'}
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/outing')}
                  className="mt-4 items-center rounded-full bg-[#4c669f] px-5 py-3"
                >
                  <Text className="font-semibold text-white">Nouvelle sortie</Text>
                </TouchableOpacity>
                </>
              ) : (
                <EmptyPanel
                  icon="calendar-outline"
                  color="#4c669f"
                  title="Aucune sortie planifiee"
                  description="Quand un lieu ou un evenement te tente, transforme-le en sortie."
                  actionLabel="Organiser une sortie"
                  onPress={() => router.push('/outing')}
                />
              )}
            </View>
          ) : null}

          {!isOrganizer && activeTab === 'saved' ? (
            <View className="px-5">
              {savedPlaces.length > 0 ? (
                <>
                <View className="mb-5 rounded-[28px] bg-[#2ecc71]/10 p-5">
                  <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-[#2ecc71]">
                    Tes envies
                  </Text>
                  <Text className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
                    Garde les meilleurs spots sous la main
                  </Text>
                </View>
                {savedPlaces.map((place) => (
                  <TouchableOpacity
                    key={place.id}
                    onPress={() =>
                      router.push({
                        pathname: '/place/[id]',
                        params: { id: place.id },
                      })
                    }
                    className="mb-4 flex-row rounded-3xl bg-gray-50 p-3 dark:bg-gray-900"
                  >
                    <Image
                      source={{
                        uri: getImageUrl(place.coverUrl) || PLACE_PLACEHOLDER,
                      }}
                      className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-gray-800"
                      resizeMode="cover"
                    />
                    <View className="ml-4 flex-1 justify-center">
                      <Text className="text-base font-semibold text-gray-900 dark:text-white">
                        {place.name}
                      </Text>
                      <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {place.City?.name || place.address || 'Adresse a confirmer'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                ))}
                </>
              ) : (
                <EmptyPanel
                  icon="heart-outline"
                  color="#2ecc71"
                  title="Aucune envie enregistree"
                  description="Enregistre un lieu depuis sa fiche pour le retrouver ici."
                  actionLabel="Explorer les lieux"
                  onPress={() => router.push('/(tabs)/home')}
                />
              )}
            </View>
          ) : null}

          {!isOrganizer && activeTab === 'posts' ? (
            posts.length > 0 ? (
              posts.map((post) => (
                <PostItem
                  key={post.id}
                  item={post}
                  onDelete={handleDeletePost}
                  onEdit={handleEditPost}
                  onComment={handleCommentPost}
                />
              ))
            ) : (
              <EmptyPanel
                icon="create-outline"
                color="#f39c12"
                title="Aucun post pour le moment"
                description="Quand tu voudras publier, passe simplement par le bouton + central."
              />
            )
          ) : null}

          {isOrganizer && activeTab === 'overview' ? (
            <View className="px-5">
              <View className="rounded-3xl bg-gray-50 p-5 dark:bg-gray-900">
                <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  Structure
                </Text>
                <Text className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                  {user?.OrganizerProfile?.companyName || 'Organisation'}
                </Text>
                <Text className="mt-2 text-base text-gray-600 dark:text-gray-300">
                  {user?.bio || 'Ajoute une courte description pour rendre le profil plus credible.'}
                </Text>
              </View>
            </View>
          ) : null}

          {isOrganizer && activeTab === 'places'
            ? (
              <View className="px-5">
                {ownedPlaces.map((place) => (
                  <TouchableOpacity
                    key={place.id}
                    onPress={() =>
                      router.push({
                        pathname: '/place/[id]',
                        params: { id: place.id },
                      })
                    }
                    className="mb-4 flex-row rounded-3xl bg-gray-50 p-3 dark:bg-gray-900"
                  >
                    <Image
                      source={{ uri: getImageUrl(place.coverUrl) || PLACE_PLACEHOLDER }}
                      className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-gray-800"
                      resizeMode="cover"
                    />
                    <View className="ml-4 flex-1 justify-center">
                      <Text className="text-base font-semibold text-gray-900 dark:text-white">
                        {place.name}
                      </Text>
                      <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {place.City?.name || place.address || 'Adresse a confirmer'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )
            : null}

          {isOrganizer && activeTab === 'events'
            ? (
              <View className="px-5">
                {organizerEvents.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    onPress={() =>
                      router.push({
                        pathname: '/event/[id]',
                        params: { id: event.id },
                      })
                    }
                    className="mb-4 flex-row rounded-3xl bg-gray-50 p-3 dark:bg-gray-900"
                  >
                    <Image
                      source={{ uri: getImageUrl(event.coverUrl) || EVENT_PLACEHOLDER }}
                      className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-gray-800"
                      resizeMode="cover"
                    />
                    <View className="ml-4 flex-1 justify-center">
                      <Text className="text-base font-semibold text-gray-900 dark:text-white">
                        {event.title}
                      </Text>
                      <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {formatEventDate(event.startTime)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )
            : null}
        </View>
      </View>

      <Modal
        visible={!!previewImage}
        transparent
        onRequestClose={() => setPreviewImage(null)}
        animationType="fade"
      >
        <View className="flex-1 items-center justify-center bg-black">
          <TouchableOpacity
            className="absolute right-5 top-12 z-10 rounded-full bg-gray-800/50 p-2"
            onPress={() => setPreviewImage(null)}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          {previewImage ? (
            <Image
              source={{ uri: previewImage }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </ScrollView>
  );
}
