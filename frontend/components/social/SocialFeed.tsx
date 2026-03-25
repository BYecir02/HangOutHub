import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { io, Socket } from 'socket.io-client';

import { useI18n } from '@/hooks/use-i18n';
import PostItem from './PostItem';
import { SkeletonBlock } from '../ui/Skeleton';
import api from '../../services/api';
import { BASE_URL, storage } from '@/services/api';

type FilterType = 'all' | 'plan' | 'post';

interface CategoryOption {
  id: number;
  name: string;
}

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
  placeId?: string | null;
  eventId?: string | null;
  placeName?: string | null;
  cityName?: string | null;
  ambiance?: string | null;
  visibilityUserIds?: string[] | null;
  Event?: {
    id: string;
    title: string;
    startTime: string;
    placeId?: string | null;
    Place?: {
      id?: string;
      name?: string | null;
      City?: {
        name?: string | null;
      } | null;
    } | null;
  } | null;
  visibility?: 'public' | 'friends' | 'private' | 'custom';
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
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'category' | 'type' | 'location'>(
    'category',
  );
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState<FilterType>('all');
  const [selectedLocation, setSelectedLocation] = useState('');

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

  useEffect(() => {
    let isMounted = true;
    const loadCategories = async () => {
      try {
        const response = await api.get<CategoryOption[]>('/categories');
        if (isMounted) {
          setCategories(response.data);
        }
      } catch {
        if (isMounted) {
          setCategories([]);
        }
      }
    };
    void loadCategories();
    return () => {
      isMounted = false;
    };
  }, []);

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
    placeId?: string | null;
    eventId?: string | null;
    Event?: {
      title?: string | null;
    } | null;
    placeName?: string | null;
    cityName?: string | null;
    ambiance?: string | null;
    visibilityUserIds?: string[] | null;
    visibility?: 'public' | 'friends' | 'private' | 'custom';
  }) => {
    router.push({
      pathname: '/post',
      params: {
        postId: post.id,
        content: post.content || '',
        images: JSON.stringify(post.images || []),
        postType: post.postType || 'post',
        placeId: post.placeId || '',
        eventId: post.eventId || '',
        eventTitle: post.Event?.title || '',
        placeName: post.placeName || '',
        cityName: post.cityName || '',
        ambiance: post.ambiance || '',
        visibilityUserIds: JSON.stringify(post.visibilityUserIds || []),
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

  const resolveLocationLabel = (post: FeedPost) => {
    const direct = [post.placeName, post.cityName]
      .map((value) => (value || '').trim())
      .filter(Boolean)
      .join(' · ');
    if (direct) {
      return direct;
    }
    if (post.Event?.Place?.name) {
      return [post.Event.Place.name, post.Event.Place.City?.name]
        .filter(Boolean)
        .join(' · ');
    }
    return '';
  };

  const locationOptions = useMemo(() => {
    const values = new Set<string>();
    posts.forEach((post) => {
      const label = resolveLocationLabel(post);
      if (label) {
        values.add(label);
      }
    });
    return Array.from(values);
  }, [posts]);

  const filteredPosts = useMemo(() => {
    return posts.filter((post) => {
      if (selectedCategory && post.ambiance !== selectedCategory) {
        return false;
      }

      if (selectedType !== 'all') {
        const isPlan = post.visibility === 'friends' || post.postType === 'plan';
        if (selectedType === 'plan' && !isPlan) {
          return false;
        }
        if (selectedType === 'post' && isPlan) {
          return false;
        }
      }

      if (selectedLocation) {
        const label = resolveLocationLabel(post);
        if (label !== selectedLocation) {
          return false;
        }
      }

      return true;
    });
  }, [posts, selectedCategory, selectedLocation, selectedType]);

  const typeLabel =
    selectedType === 'plan'
      ? t('socialFeedFilterPlans')
      : selectedType === 'post'
      ? t('socialFeedFilterPosts')
      : t('socialFeedFilterAll');

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

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-5"
        contentContainerStyle={{ paddingRight: 16 }}
      >
        <TouchableOpacity
          onPress={() => {
            setActiveFilter('category');
            setFiltersOpen(true);
          }}
          className="mr-3 rounded-full border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900"
        >
          <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
            {selectedCategory || t('socialFeedFilterCategory')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setActiveFilter('type');
            setFiltersOpen(true);
          }}
          className="mr-3 rounded-full border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900"
        >
          <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
            {typeLabel}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            setActiveFilter('location');
            setFiltersOpen(true);
          }}
          className="mr-3 rounded-full border border-gray-200 bg-white px-4 py-2 dark:border-gray-700 dark:bg-gray-900"
        >
          <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
            {selectedLocation || t('socialFeedFilterLocation')}
          </Text>
        </TouchableOpacity>
        {(selectedCategory || selectedLocation || selectedType !== 'all') ? (
          <TouchableOpacity
            onPress={() => {
              setSelectedCategory('');
              setSelectedType('all');
              setSelectedLocation('');
            }}
            className="rounded-full bg-[#ff4757]/10 px-4 py-2"
          >
            <Text className="text-xs font-semibold text-[#ff4757]">
              {t('socialFeedFilterClear')}
            </Text>
          </TouchableOpacity>
        ) : null}
      </ScrollView>
    </View>
  );

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;
      let socket: Socket | null = null;

      const connect = async () => {
        const token = await storage.getItem('userToken');
        if (!token || !isMounted) {
          return;
        }

        socket = io(`${BASE_URL}/posts`, {
          transports: ['websocket'],
          auth: { token },
        });

        socket.on('post:new', (post: FeedPost) => {
          setPosts((current) => {
            if (current.some((item) => item.id === post.id)) {
              return current;
            }
            return [post, ...current];
          });
        });
      };

      void connect();

      return () => {
        isMounted = false;
        socket?.disconnect();
      };
    }, []),
  );

  if (loading && posts.length === 0) {
    return (
      <FlatList
        data={[0, 1, 2]}
        keyExtractor={(item) => `skeleton-${item}`}
        renderItem={() => <SkeletonPost />}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: 120 }}
        className="flex-1 bg-gray-50 dark:bg-black"
      />
    );
  }

  return (
    <>
      <FlatList
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PostItem
            item={item}
            showDateColumn={false}
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
        contentInsetAdjustmentBehavior="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
        className="flex-1 bg-gray-50 dark:bg-black"
      />

      <TouchableOpacity
        activeOpacity={1}
        onPress={() => setFiltersOpen(false)}
        className={`absolute inset-0 bg-black/50 ${filtersOpen ? 'flex' : 'hidden'}`}
      >
        <TouchableOpacity
          activeOpacity={1}
          className="absolute bottom-0 w-full rounded-t-3xl bg-white p-5 pb-8 dark:bg-gray-900"
        >
          <View className="mb-4 items-center">
            <View className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
          </View>
          <Text className="mb-4 text-center text-lg font-bold text-gray-800 dark:text-white">
            {activeFilter === 'category'
              ? t('socialFeedFilterCategoryTitle')
              : activeFilter === 'type'
              ? t('socialFeedFilterTypeTitle')
              : t('socialFeedFilterLocationTitle')}
          </Text>

          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            <TouchableOpacity
              onPress={() => {
                if (activeFilter === 'category') {
                  setSelectedCategory('');
                } else if (activeFilter === 'type') {
                  setSelectedType('all');
                } else {
                  setSelectedLocation('');
                }
                setFiltersOpen(false);
              }}
              className="flex-row items-center border-b border-gray-100 py-3 dark:border-gray-800"
            >
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t('socialFeedFilterAll')}
              </Text>
            </TouchableOpacity>

            {activeFilter === 'category'
              ? categories.map((category) => (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() => {
                      setSelectedCategory(category.name);
                      setFiltersOpen(false);
                    }}
                    className="flex-row items-center border-b border-gray-100 py-3 dark:border-gray-800"
                  >
                    <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                ))
              : activeFilter === 'type'
              ? [
                  { id: 'plan', label: t('socialFeedFilterPlans') },
                  { id: 'post', label: t('socialFeedFilterPosts') },
                ].map((option) => (
                  <TouchableOpacity
                    key={option.id}
                    onPress={() => {
                      setSelectedType(option.id as FilterType);
                      setFiltersOpen(false);
                    }}
                    className="flex-row items-center border-b border-gray-100 py-3 dark:border-gray-800"
                  >
                    <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {option.label}
                    </Text>
                  </TouchableOpacity>
                ))
              : locationOptions.map((location) => (
                  <TouchableOpacity
                    key={location}
                    onPress={() => {
                      setSelectedLocation(location);
                      setFiltersOpen(false);
                    }}
                    className="flex-row items-center border-b border-gray-100 py-3 dark:border-gray-800"
                  >
                    <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                      {location}
                    </Text>
                  </TouchableOpacity>
                ))}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </>
  );
}
