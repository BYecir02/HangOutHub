import React, { useCallback, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { useI18n } from '@/hooks/use-i18n';
import PostItem from './PostItem';
import { SkeletonBlock } from '../ui/Skeleton';
import api from '../../services/api';

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
  postType?: 'post' | 'plan';
  placeName?: string | null;
  cityName?: string | null;
  ambiance?: string | null;
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

function EmptyState({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <View className="items-center px-6 py-16">
      <View className="h-16 w-16 items-center justify-center rounded-full bg-[#4c669f]/10">
        <Ionicons name="sparkles-outline" size={28} color="#4c669f" />
      </View>
      <Text className="mt-5 text-xl font-bold text-gray-900 dark:text-white">
        {title}
      </Text>
      <Text className="mt-3 text-center text-base leading-7 text-gray-500 dark:text-gray-400">
        {description}
      </Text>
    </View>
  );
}

function SkeletonPost() {
  return (
    <View className="mx-5 mb-4 rounded-3xl bg-white p-4 shadow-sm dark:bg-gray-900">
      <View className="flex-row items-center">
        <SkeletonBlock className="h-12 w-12 rounded-full" />
        <View className="ml-3 flex-1">
          <SkeletonBlock className="h-4 w-36 rounded-lg" />
          <SkeletonBlock className="mt-2 h-3 w-20 rounded-lg" />
        </View>
      </View>
      <SkeletonBlock className="mt-4 h-4 w-full rounded-lg" />
      <SkeletonBlock className="mt-2 h-4 w-5/6 rounded-lg" />
      <SkeletonBlock className="mt-2 h-4 w-2/3 rounded-lg" />
      <SkeletonBlock className="mt-4 h-44 w-full rounded-2xl" />
      <View className="mt-4 flex-row justify-between">
        <SkeletonBlock className="h-4 w-16 rounded-lg" />
        <SkeletonBlock className="h-4 w-16 rounded-lg" />
        <SkeletonBlock className="h-4 w-16 rounded-lg" />
      </View>
    </View>
  );
}

export default function SocialFeed() {
  const router = useRouter();
  const { t } = useI18n();
  const [posts, setPosts] = useState<FeedPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchFeed = useCallback(async (isRefreshing = false) => {
    const isRefresh = isRefreshing || hasLoaded;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const response = await api.get<FeedPost[]>('/posts/feed');
      setPosts(response.data);
    } catch (error) {
      console.error(t('socialFeedLoadError'), error);
      if (!isRefresh) {
        setPosts([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setHasLoaded(true);
    }
  }, [hasLoaded, t]);

  useFocusEffect(
    useCallback(() => {
      void fetchFeed();
    }, [fetchFeed]),
  );

  const handleDeletePost = async (postId: string) => {
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((currentPosts) => currentPosts.filter((post) => post.id !== postId));
      Alert.alert(t('profileDeletePostSuccessTitle'), t('profileDeletePostSuccessMessage'));
    } catch {
      Alert.alert(t('commonErrorTitle'), t('socialFeedDeleteError'));
    }
  };

  const handleEditPost = (post: {
    id: string;
    content?: string | null;
    images?: string[];
    postType?: 'post' | 'plan';
    placeName?: string | null;
    cityName?: string | null;
    ambiance?: string | null;
    visibility?: 'public' | 'friends' | 'private';
  }) => {
    router.push({
      pathname: '/post',
      params: {
        postId: post.id,
        content: post.content || '',
        images: JSON.stringify(post.images || []),
        postType: post.postType || 'post',
        placeName: post.placeName || '',
        cityName: post.cityName || '',
        ambiance: post.ambiance || '',
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

  const handleOpenMessages = () => {
    router.push('/messages');
  };

  const renderHeader = () => (
    <View className="mb-4 border-b border-gray-100 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-black">
      <View className="flex-row items-start justify-between">
        <View className="flex-1 pr-4">
          <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
            {t('socialFeedHeaderLabel')}
          </Text>
          <Text className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
            {t('socialFeedHeaderTitle')}
          </Text>
          <Text className="mt-3 text-base leading-7 text-gray-500 dark:text-gray-400">
            {t('socialFeedHeaderSubtitle')}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handleOpenMessages}
          className="h-12 w-12 items-center justify-center rounded-2xl bg-[#4c669f]"
        >
          <Ionicons name="chatbubble-ellipses-outline" size={22} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading && posts.length === 0) {
    return (
      <FlatList
        data={[0, 1, 2]}
        keyExtractor={(item) => `skeleton-${item}`}
        renderItem={() => <SkeletonPost />}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        className="flex-1 bg-gray-50 dark:bg-black"
      />
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
      ListEmptyComponent={
        <EmptyState
          title={t('socialFeedEmptyTitle')}
          description={t('socialFeedEmptyDescription')}
        />
      }
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
