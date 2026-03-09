import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import PostItem from './PostItem';
import api, { getImageUrl } from '../../services/api';

interface FeedAuthor {
  id: string;
  username?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

interface FeedPost {
  id: string;
  userId: string;
  content?: string | null;
  images?: string[];
  visibility?: 'public' | 'friends' | 'private';
  createdAt?: string;
  isLiked?: boolean;
  isOwner?: boolean;
  User?: FeedAuthor;
  _count?: {
    likes?: number;
    comments?: number;
  };
}

const AVATAR_PLACEHOLDER = 'https://i.pravatar.cc/150';

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <View className="items-center px-6 py-16">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-[#4c669f]/10">
        <Ionicons name="sparkles-outline" size={28} color="#4c669f" />
      </View>
      <Text className="mt-5 text-xl font-bold text-gray-900 dark:text-white">
        Lance le feed
      </Text>
      <Text className="mt-3 text-center text-base leading-7 text-gray-500 dark:text-gray-400">
        Cree ton premier post pour donner du rythme a la communaute.
      </Text>
      <TouchableOpacity
        onPress={onCreate}
        className="mt-6 rounded-full bg-[#f39c12] px-5 py-3"
      >
        <Text className="font-semibold text-white">Publier maintenant</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function SocialFeed() {
  const router = useRouter();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeed = useCallback(async (isRefreshing = false) => {
    if (isRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get<FeedPost[]>('/posts/feed');
      setPosts(response.data);
    } catch (error) {
      console.error('Erreur chargement feed social:', error);
      if (!isRefreshing) {
        setPosts([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void fetchFeed();
    }, [fetchFeed]),
  );

  const spotlightUsers = useMemo(() => {
    const seen = new Set<string>();

    return posts
      .filter((post) => post.User?.id && !seen.has(post.User.id))
      .map((post) => {
        seen.add(post.User!.id);
        return post.User!;
      })
      .slice(0, 8);
  }, [posts]);

  const handleDeletePost = async (postId: string) => {
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId));
      Alert.alert('Succes', 'Post supprime.');
    } catch {
      Alert.alert('Erreur', 'Impossible de supprimer ce post.');
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
        content: post.content || '',
        visibility: post.visibility || 'public',
      },
    });
  };

  const handleCommentPost = (post: { id: string }) => {
    router.push({
      pathname: '/comments',
      params: { postId: post.id },
    });
  };

  const renderHeader = () => (
    <View className="border-b border-gray-100 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-black">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
            Social
          </Text>
          <Text className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            Vibes locales
          </Text>
          <Text className="mt-3 text-base leading-7 text-gray-500 dark:text-gray-400">
            Suis les dernieres publications, reponds et fais vivre la communaute.
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/post')}
          className="h-12 w-12 items-center justify-center rounded-2xl bg-[#f39c12]"
        >
          <Ionicons name="create-outline" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {spotlightUsers.length > 0 ? (
        <FlatList
          data={spotlightUsers}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          className="mt-6"
          renderItem={({ item }) => (
            <View className="mr-4 items-center">
              <Image
                source={{ uri: getImageUrl(item.avatarUrl) || AVATAR_PLACEHOLDER }}
                className="h-14 w-14 rounded-full border-2 border-[#4c669f]"
              />
              <Text
                className="mt-2 max-w-[72px] text-center text-xs font-medium text-gray-600 dark:text-gray-300"
                numberOfLines={1}
              >
                {item.displayName || item.username || 'Utilisateur'}
              </Text>
            </View>
          )}
        />
      ) : null}
    </View>
  );

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }

  return (
    <FlatList
      data={posts}
      keyExtractor={(item) => item.id}
      renderItem={({ item }) => (
        <PostItem
          item={item}
          onDelete={item.isOwner ? handleDeletePost : undefined}
          onEdit={item.isOwner ? handleEditPost : undefined}
          onComment={handleCommentPost}
        />
      )}
      ListHeaderComponent={renderHeader}
      ListEmptyComponent={<EmptyState onCreate={() => router.push('/post')} />}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => void fetchFeed(true)}
          tintColor="#4c669f"
        />
      }
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 120 }}
      className="flex-1 bg-gray-50 dark:bg-black"
    />
  );
}
