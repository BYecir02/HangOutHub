import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
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
    loading,
    deletePost,
  } =
    useUserProfile();

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
        { id: 'infos', label: 'Infos' },
      ];

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost(postId);
      Alert.alert('Succes', 'Post supprime.');
    } catch {
      Alert.alert('Erreur', 'Impossible de supprimer le post.');
    }
  };

  const handleEditPost = (post: any) => {
    router.push({
      pathname: '/post',
      params: {
        postId: post.id,
        content: post.content,
        visibility: post.visibility,
      },
    });
  };

  const handleCommentPost = (post: any) => {
    router.push({
      pathname: '/comments',
      params: { postId: post.id },
    });
  };

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-black"
      showsVerticalScrollIndicator={false}
    >
      <ProfileHeader
        user={displayUser}
        isOrganizer={isOrganizer}
        onImagePress={setPreviewImage}
      />

      {isOrganizer ? (
        <View className="mt-5 px-5">
          <View className="flex-row gap-3">
            <TouchableOpacity
              onPress={() => router.push('/organizer/dashboard')}
              className="flex-1 items-center rounded-2xl bg-gray-100 py-3 dark:bg-gray-800"
            >
              <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                Dashboard
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => router.push('/event')}
              className="flex-1 items-center rounded-2xl bg-[#ff4757] py-3"
            >
              <Text className="text-sm font-semibold text-white">
                Creer un evenement
              </Text>
            </TouchableOpacity>
            {user?.role === 'PLACE_OWNER' ? (
              <TouchableOpacity
                onPress={() => router.push('/place')}
                className="flex-1 items-center rounded-2xl bg-[#2ecc71] py-3"
              >
                <Text className="text-sm font-semibold text-white">
                  Ajouter un lieu
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      ) : null}

      <ProfileStats
        postsCount={posts.length}
        outingsCount={outings.length}
        followersCount={user?.followersCount || 0}
        isOrganizer={isOrganizer}
        placesCount={ownedPlaces.length}
        eventsCount={organizerEvents.length}
      />

      <View className="mt-8 pb-10">
        <Tabs items={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />

        <View className="min-h-[220px]">
          {!isOrganizer && activeTab === 'outings' ? (
            <View className="px-5">
              {outings.length > 0 ? (
                outings.map((outing) => (
                  <View
                    key={outing.id}
                    className="mb-4 rounded-3xl bg-gray-50 p-4 dark:bg-gray-900"
                  >
                    <View className="flex-row items-start justify-between">
                      <View className="flex-1 pr-4">
                        <Text className="text-base font-semibold text-gray-900 dark:text-white">
                          {outing.title}
                        </Text>
                        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {formatEventDate(outing.scheduledDate)}
                        </Text>
                        <Text className="mt-2 text-sm text-gray-400 dark:text-gray-500">
                          {outing.Place?.name ||
                            outing.Place?.City?.name ||
                            outing.Place?.address ||
                            'Lieu libre'}
                        </Text>
                      </View>

                      <View className="rounded-full bg-blue-100 px-3 py-2 dark:bg-blue-900/30">
                        <Text className="text-xs font-semibold uppercase tracking-widest text-blue-700 dark:text-blue-300">
                          {outing.status || 'PLANNED'}
                        </Text>
                      </View>
                    </View>

                    <View className="mt-4 flex-row items-center justify-between">
                      <Text className="text-sm text-gray-500 dark:text-gray-400">
                        {outing._count?.OutingParticipant || 1} participant(s)
                      </Text>
                      <TouchableOpacity
                        onPress={() => router.push('/outing')}
                        className="rounded-full bg-[#4c669f] px-4 py-2"
                      >
                        <Text className="text-sm font-semibold text-white">
                          Nouvelle sortie
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              ) : (
                <View className="items-center py-10">
                  <Text className="text-center text-gray-400">
                    Aucune sortie planifiee pour le moment.
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/outing')}
                    className="mt-4 rounded-xl bg-[#4c669f] px-4 py-3"
                  >
                    <Text className="font-semibold text-white">
                      Organiser une sortie
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}

          {!isOrganizer && activeTab === 'saved' ? (
            <View className="px-5">
              {savedPlaces.length > 0 ? (
                savedPlaces.map((place) => (
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
                      <Text
                        className="text-base font-semibold text-gray-900 dark:text-white"
                        numberOfLines={1}
                      >
                        {place.name}
                      </Text>
                      <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {place.City?.name || place.address || 'Adresse a confirmer'}
                      </Text>
                      {typeof place.avgRating === 'number' &&
                      place.avgRating > 0 ? (
                        <View className="mt-2 self-start rounded-full bg-yellow-100 px-3 py-1.5 dark:bg-yellow-900/30">
                          <Text className="text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                            Note {place.avgRating.toFixed(1)}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                ))
              ) : (
                <View className="items-center py-10">
                  <Text className="text-center text-gray-400">
                    Aucun lieu enregistre pour le moment.
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(tabs)/home')}
                    className="mt-4 rounded-xl bg-[#2ecc71] px-4 py-3"
                  >
                    <Text className="font-semibold text-white">
                      Explorer les lieux
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}

          {!isOrganizer && activeTab === 'posts' ? (
            <View>
              {posts.length > 0 ? (
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
                <View className="w-full items-center py-10">
                  <Text className="text-gray-400">
                    Aucune publication pour le moment.
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {!isOrganizer && activeTab === 'infos' ? (
            <View className="px-5">
              <View className="rounded-3xl bg-gray-50 p-5 dark:bg-gray-900">
                <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  Bio
                </Text>
                <Text className="mt-2 text-base leading-7 text-gray-700 dark:text-gray-200">
                  {user?.bio || 'Aucune bio renseignee.'}
                </Text>

                <View className="mt-5 flex-row flex-wrap gap-2">
                  <View className="rounded-full bg-blue-100 px-3 py-2 dark:bg-blue-900/30">
                    <Text className="text-xs font-semibold text-blue-700 dark:text-blue-300">
                      @{user?.username || 'user'}
                    </Text>
                  </View>
                  <View className="rounded-full bg-gray-200 px-3 py-2 dark:bg-gray-800">
                    <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      Compte {user?.role || 'USER'}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
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
                  {user?.OrganizerProfile?.jobTitle || 'Profil organisateur'}
                </Text>
                <Text className="mt-4 text-base leading-7 text-gray-700 dark:text-gray-200">
                  {user?.bio || 'Ajoute une courte description pour rendre le profil plus credible.'}
                </Text>
              </View>

              <View className="mt-4 rounded-3xl bg-white p-5 dark:bg-gray-900">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">
                  Apercu rapide
                </Text>
                <Text className="mt-3 text-gray-600 dark:text-gray-300">
                  {ownedPlaces.length} lieu(x) publie(s) et {organizerEvents.length}{' '}
                  evenement(s) visible(s).
                </Text>
                <Text className="mt-2 text-gray-500 dark:text-gray-400">
                  Statut du compte: {user?.OrganizerProfile?.status || 'INCONNU'}
                </Text>
              </View>
            </View>
          ) : null}

          {isOrganizer && activeTab === 'places' ? (
            <View className="px-5">
              {ownedPlaces.length > 0 ? (
                ownedPlaces.map((place) => (
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
                      <Text
                        className="text-base font-semibold text-gray-900 dark:text-white"
                        numberOfLines={1}
                      >
                        {place.name}
                      </Text>
                      <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                        {place.City?.name || place.address || 'Adresse a confirmer'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                ))
              ) : (
                <View className="items-center py-10">
                  <Text className="text-gray-400">Aucun lieu publie.</Text>
                  <TouchableOpacity
                    onPress={() => router.push('/place')}
                    className="mt-4 rounded-xl bg-[#2ecc71] px-4 py-3"
                  >
                    <Text className="font-semibold text-white">
                      Ajouter mon premier lieu
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}

          {isOrganizer && activeTab === 'events' ? (
            <View className="px-5">
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
                    className="mb-4 flex-row rounded-3xl bg-gray-50 p-3 dark:bg-gray-900"
                  >
                    <Image
                      source={{
                        uri: getImageUrl(event.coverUrl) || EVENT_PLACEHOLDER,
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
                      <Text className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                        {event.Place?.name || 'Lieu a confirmer'}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                ))
              ) : (
                <View className="items-center py-10">
                  <Text className="text-gray-400">
                    Aucun evenement publie pour le moment.
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/event')}
                    className="mt-4 rounded-xl bg-[#ff4757] px-4 py-3"
                  >
                    <Text className="font-semibold text-white">
                      Creer mon premier evenement
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}
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
