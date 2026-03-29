import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Share,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { useFocusEffect, useRouter } from 'expo-router';

import { useI18n } from '@/hooks/use-i18n';
import PersonRow from './PersonRow';
import PostItem from './PostItem';
import { SkeletonBlock } from '../ui/Skeleton';
import api, { storage } from '../../services/api';
import { getFriendshipOverview } from '../../services/friendships';
import { getOrCreateDirectChat, sendDirectMessage } from '../../services/direct-chats';
import type { SocialUser } from '../../types/social';

const FEED_CACHE_KEY = 'socialFeedCache:v2';
const FEED_CACHE_TIME_KEY = 'socialFeedCacheAt:v2';
const FEED_CACHE_CURSOR_KEY = 'socialFeedCacheCursor:v2';
const FEED_CACHE_TTL_MS = 60 * 1000;
const FEED_PAGE_SIZE = 20;
const FEED_TOP_THRESHOLD = 12;

type FilterType = 'all' | 'plan' | 'post';

interface CategoryOption {
  id: number;
  name: string;
}

interface FeedAuthor {
  id?: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

interface FeedPost {
  id: string;
  userId?: string;
  content?: string | null;
  images?: string[];
  publicationScope?: 'personal' | 'structure';
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
  shareCount?: number | null;
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
  const [fetchingMore, setFetchingMore] = useState(false);
  const [cacheHydrated, setCacheHydrated] = useState(false);
  const [lastFetchedAt, setLastFetchedAt] = useState<number | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [pendingPosts, setPendingPosts] = useState<FeedPost[]>([]);
  const postsRef = useRef<FeedPost[]>([]);
  const nextCursorRef = useRef<string | null>(null);
  const latestFetchedAtRef = useRef<string | null>(null);
  const isAtTopRef = useRef(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareTarget, setShareTarget] = useState<FeedPost | null>(null);
  const [connections, setConnections] = useState<SocialUser[]>([]);
  const [connectionsLoaded, setConnectionsLoaded] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [sendingConnectionId, setSendingConnectionId] = useState<string | null>(
    null,
  );
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'category' | 'type' | 'location'>(
    'category',
  );
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedType, setSelectedType] = useState<FilterType>('all');
  const [selectedLocation, setSelectedLocation] = useState('');

  const persistFeedCache = useCallback(
    async (nextPosts: FeedPost[], nextCursorValue: string | null) => {
    const timestamp = Date.now();
    try {
      await storage.setItem(FEED_CACHE_KEY, JSON.stringify(nextPosts));
      await storage.setItem(FEED_CACHE_TIME_KEY, String(timestamp));
      if (nextCursorValue) {
        await storage.setItem(FEED_CACHE_CURSOR_KEY, nextCursorValue);
      } else {
        await storage.removeItem(FEED_CACHE_CURSOR_KEY);
      }
      setLastFetchedAt(timestamp);
    } catch (error) {
      console.warn('Social feed cache save failed', error);
    }
  },
    [],
  );

  const getMaxCreatedAt = useCallback((items: FeedPost[]) => {
    let maxTime = 0;
    let maxValue: string | null = null;
    items.forEach((post) => {
      if (!post.createdAt) {
        return;
      }
      const time = new Date(post.createdAt).getTime();
      if (time > maxTime) {
        maxTime = time;
        maxValue = new Date(post.createdAt).toISOString();
      }
    });
    return maxValue;
  }, []);

  const hydrateFeedCache = useCallback(async () => {
    if (cacheHydrated) {
      return false;
    }

    try {
      const cached = await storage.getItem(FEED_CACHE_KEY);
      const cachedAt = await storage.getItem(FEED_CACHE_TIME_KEY);
      const cachedCursor = await storage.getItem(FEED_CACHE_CURSOR_KEY);

      if (cached) {
        const parsed = JSON.parse(cached) as FeedPost[];
        setPosts(parsed);
        setLoading(false);
        const cachedLatest = getMaxCreatedAt(parsed);
        if (cachedLatest) {
          latestFetchedAtRef.current = cachedLatest;
        }
      }

      if (cachedAt) {
        const parsedTime = Number(cachedAt);
        if (!Number.isNaN(parsedTime)) {
          setLastFetchedAt(parsedTime);
        }
      }

      if (cachedCursor) {
        setNextCursor(cachedCursor);
      }
    } catch (error) {
      console.warn('Social feed cache read failed', error);
    } finally {
      setCacheHydrated(true);
    }

    return true;
  }, [cacheHydrated, getMaxCreatedAt]);

  useEffect(() => {
    postsRef.current = posts;
  }, [posts]);

  useEffect(() => {
    nextCursorRef.current = nextCursor;
  }, [nextCursor]);

  const getLatestPostCreatedAt = useCallback(() => {
    return latestFetchedAtRef.current;
  }, []);

  const updateLatestFetchedAt = useCallback((items: FeedPost[]) => {
    const maxCreatedAt = getMaxCreatedAt(items);
    if (!maxCreatedAt) {
      return;
    }
    const current = latestFetchedAtRef.current;
    if (!current) {
      latestFetchedAtRef.current = maxCreatedAt;
      return;
    }
    if (new Date(maxCreatedAt).getTime() > new Date(current).getTime()) {
      latestFetchedAtRef.current = maxCreatedAt;
    }
  }, [getMaxCreatedAt]);

  const mergePosts = useCallback((incoming: FeedPost[], current: FeedPost[]) => {
    const map = new Map<string, FeedPost>();
    [...current, ...incoming].forEach((post) => {
      map.set(post.id, post);
    });
    return Array.from(map.values()).sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      if (aTime === bTime) {
        return b.id.localeCompare(a.id);
      }
      return bTime - aTime;
    });
  }, []);

  const fetchFeed = useCallback(
    async (mode: 'initial' | 'refresh' | 'background' | 'more' = 'initial') => {
      if (mode === 'refresh') {
        setRefreshing(true);
      }
      if (mode === 'initial') {
        setLoading(true);
      }
      if (mode === 'more') {
        setFetchingMore(true);
      }

      try {
        const params: Record<string, string | number> = {
          limit: FEED_PAGE_SIZE,
        };

        if (mode === 'more' && nextCursorRef.current) {
          params.cursor = nextCursorRef.current;
        }

        if (mode === 'background') {
          const latestPostCreatedAt = getLatestPostCreatedAt();
          if (latestPostCreatedAt) {
            params.after = latestPostCreatedAt;
          }
        }

        const response = await api.get<{
          items: FeedPost[];
          nextCursor: string | null;
        }>('/posts/feed', { params });

        if (mode === 'more') {
          setPosts((current) => mergePosts(response.data.items, current));
        } else if (mode === 'background') {
          if (response.data.items.length > 0) {
            if (isAtTopRef.current) {
              setPosts((current) => mergePosts(response.data.items, current));
            } else {
              setPendingPosts((current) => mergePosts(response.data.items, current));
            }
          }
        } else {
          setPosts(response.data.items);
          setPendingPosts([]);
        }

        if (mode !== 'more') {
          updateLatestFetchedAt(response.data.items);
        }

        if (mode !== 'background') {
          setNextCursor(response.data.nextCursor);
        }

        const nextForCache =
          mode === 'background' || mode === 'more'
            ? nextCursorRef.current
            : response.data.nextCursor;
        const postsForCache =
          mode === 'initial' || mode === 'refresh'
            ? response.data.items
            : mergePosts(response.data.items, postsRef.current);
        await persistFeedCache(postsForCache, nextForCache || null);
      } catch (error) {
        console.error(t('socialFeedLoadError'), error);
      } finally {
        if (mode === 'initial') {
          setLoading(false);
        }
        if (mode === 'refresh') {
          setRefreshing(false);
        }
        if (mode === 'more') {
          setFetchingMore(false);
        }
      }
    },
    [
      getLatestPostCreatedAt,
      mergePosts,
      persistFeedCache,
      t,
      updateLatestFetchedAt,
    ],
  );

  const shouldRefreshFeed = useCallback(async () => {
    if (lastFetchedAt) {
      return Date.now() - lastFetchedAt > FEED_CACHE_TTL_MS;
    }

    try {
      const cachedAt = await storage.getItem(FEED_CACHE_TIME_KEY);
      if (!cachedAt) {
        return true;
      }
      const parsedTime = Number(cachedAt);
      if (Number.isNaN(parsedTime)) {
        return true;
      }
      return Date.now() - parsedTime > FEED_CACHE_TTL_MS;
    } catch {
      return true;
    }
  }, [lastFetchedAt]);

  useFocusEffect(
    useCallback(() => {
      let isActive = true;

      const run = async () => {
        await hydrateFeedCache();
        const shouldRefresh = await shouldRefreshFeed();

        if (!isActive) {
          return;
        }

        if (shouldRefresh) {
          const latestPostCreatedAt = getLatestPostCreatedAt();
          if (postsRef.current.length > 0 && latestPostCreatedAt) {
            await fetchFeed('background');
          } else {
            await fetchFeed('initial');
          }
        }
      };

      void run();

      return () => {
        isActive = false;
      };
    }, [
      fetchFeed,
      getLatestPostCreatedAt,
      hydrateFeedCache,
      shouldRefreshFeed,
    ]),
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

  const removePostFromLists = useCallback((postId: string) => {
    setPosts((current) => current.filter((post) => post.id !== postId));
    setPendingPosts((current) => current.filter((post) => post.id !== postId));
  }, []);

  const handleDeletePost = useCallback(
    async (postId: string) => {
      try {
        await api.delete(`/posts/${postId}`);
        removePostFromLists(postId);
        Alert.alert(
          t('profileDeletePostSuccessTitle'),
          t('profileDeletePostSuccessMessage'),
        );
      } catch {
        Alert.alert(t('commonErrorTitle'), t('socialFeedDeleteError'));
      }
    },
    [removePostFromLists, t],
  );

  const handleEditPost = useCallback(
    (post: {
      id: string;
      content?: string | null;
      images?: string[];
      postType?: 'post' | 'plan';
      publicationScope?: 'personal' | 'structure';
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
          publicationScope: post.publicationScope || 'personal',
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
    },
    [router],
  );

  const handleCommentPost = useCallback(
    (post: { id: string }) => {
      router.push({
        pathname: '/comments',
        params: { postId: post.id },
      });
    },
    [router],
  );

  const handleOpenMessages = useCallback(() => {
    router.push('/messages');
  }, [router]);

  const handleOpenSearch = useCallback(() => {
    router.push('/search');
  }, [router]);

  const applyPendingPosts = useCallback(async () => {
    if (pendingPosts.length === 0) {
      return;
    }
    const nextPosts = mergePosts(pendingPosts, postsRef.current);
    setPosts(nextPosts);
    setPendingPosts([]);
    await persistFeedCache(nextPosts, nextCursorRef.current || null);
  }, [mergePosts, pendingPosts, persistFeedCache]);

  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number } } }) => {
      const offsetY = event.nativeEvent.contentOffset.y;
      const isAtTop = offsetY <= FEED_TOP_THRESHOLD;
      isAtTopRef.current = isAtTop;
      if (isAtTop && pendingPosts.length > 0) {
        void applyPendingPosts();
      }
    },
    [applyPendingPosts, pendingPosts.length],
  );

  const resolveLocationLabel = useCallback((post: FeedPost) => {
    const direct = [post.placeName, post.cityName]
      .map((value) => (value || '').trim())
      .filter(Boolean)
      .join(' - ');
    if (direct) {
      return direct;
    }
    if (post.Event?.Place?.name) {
      return [post.Event.Place.name, post.Event.Place.City?.name]
        .filter(Boolean)
        .join(' - ');
    }
    return '';
  }, []);

  const pendingLabel = useMemo(() => {
    const label = t('socialFeedNewPosts', { count: pendingPosts.length });
    if (!label || label === 'socialFeedNewPosts') {
      return `${pendingPosts.length} nouveau(x) post(s)`;
    }
    return label;
  }, [pendingPosts.length, t]);

  const buildShareMessage = useCallback(
    (post: FeedPost) => {
      const title = (post.content || '').split('\n')[0]?.trim();
      const location = resolveLocationLabel(post);
      const eventTitle = post.Event?.title?.trim();
      const parts = [
        title || t('postItemPlanFallback'),
        eventTitle,
        location,
        Linking.createURL(`/post-view/${post.id}`),
      ].filter(Boolean);
      return parts.join('\n');
    },
    [resolveLocationLabel, t],
  );

  const loadConnections = useCallback(async () => {
    if (connectionsLoaded) {
      return;
    }
    setLoadingConnections(true);
    try {
      const overview = await getFriendshipOverview();
      setConnections(overview.connections.map((item) => item.user));
      setConnectionsLoaded(true);
    } catch (error) {
      console.error('Erreur chargement connexions', error);
      setConnections([]);
    } finally {
      setLoadingConnections(false);
    }
  }, [connectionsLoaded]);

  const openShareToConnection = useCallback(
    async (post: FeedPost) => {
      setShareTarget(post);
      setShareModalOpen(true);
      await loadConnections();
    },
    [loadConnections],
  );

  const bumpShareCount = useCallback((postId: string) => {
    const bump = (items: FeedPost[]) =>
      items.map((post) =>
        post.id === postId
          ? { ...post, shareCount: (post.shareCount || 0) + 1 }
          : post,
      );
    setPosts((current) => bump(current));
    setPendingPosts((current) => bump(current));
  }, []);

  const recordShare = useCallback(async (postId: string) => {
    bumpShareCount(postId);
    try {
      await api.post(`/posts/${postId}/share`);
    } catch (error) {
      console.error('Erreur suivi partage:', error);
    }
  }, [bumpShareCount]);

  const handleSharePost = useCallback(
    (post: FeedPost) => {
      const message = buildShareMessage(post);
      Alert.alert(t('postShareTitle'), undefined, [
        {
          text: t('postShareExternal'),
          onPress: () => {
            void Share.share({ message }).then(() => {
              void recordShare(post.id);
            });
          },
        },
        {
          text: t('postShareDirect'),
          onPress: () => {
            void openShareToConnection(post);
          },
        },
        { text: t('postItemCancel'), style: 'cancel' },
      ]);
    },
    [buildShareMessage, openShareToConnection, recordShare, t],
  );

  const handleSendToConnection = useCallback(
    async (user: SocialUser) => {
      if (!shareTarget) {
        return;
      }
      setSendingConnectionId(user.id);
      try {
        const chat = await getOrCreateDirectChat(user.id);
        await sendDirectMessage(chat.id, {
          content: buildShareMessage(shareTarget),
          sharedPostId: shareTarget.id,
        });
        await recordShare(shareTarget.id);
        setShareModalOpen(false);
        setShareTarget(null);
        router.push({
          pathname: '/direct-chat/[id]',
          params: { id: chat.id },
        });
      } catch (error) {
        Alert.alert(t('commonErrorTitle'), t('postShareSendError'));
        console.error('Erreur partage direct:', error);
      } finally {
        setSendingConnectionId(null);
      }
    },
    [buildShareMessage, recordShare, router, shareTarget, t],
  );

  const locationOptions = useMemo(() => {
    const values = new Set<string>();
    posts.forEach((post) => {
      const label = resolveLocationLabel(post);
      if (label) {
        values.add(label);
      }
    });
    return Array.from(values);
  }, [posts, resolveLocationLabel]);

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
  }, [posts, resolveLocationLabel, selectedCategory, selectedLocation, selectedType]);

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

        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={handleOpenSearch}
            className="mr-2 h-12 w-12 items-center justify-center rounded-2xl border border-[#4c669f]/25 bg-[#4c669f]/10 dark:border-[#4c669f]/35 dark:bg-[#4c669f]/20"
          >
            <Ionicons
              name="search-outline"
              size={22}
              color="#4c669f"
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleOpenMessages}
            className="h-12 w-12 items-center justify-center rounded-2xl bg-[#4c669f]"
          >
            <Ionicons name="chatbubble-ellipses-outline" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
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
      {pendingPosts.length > 0 ? (
        <TouchableOpacity
          onPress={() => void applyPendingPosts()}
          className="mt-4 rounded-2xl border border-[#4c669f]/20 bg-[#4c669f]/10 px-4 py-2"
        >
          <Text className="text-xs font-semibold text-[#4c669f]">
            {pendingLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
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
            onShare={handleSharePost}
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
            onRefresh={() => void fetchFeed('refresh')}
            tintColor="#4c669f"
          />
        }
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onEndReached={() => {
          if (!fetchingMore && nextCursor) {
            void fetchFeed('more');
          }
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          fetchingMore ? (
            <View className="items-center py-6">
              <ActivityIndicator color="#4c669f" />
            </View>
          ) : null
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

      {shareModalOpen ? (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShareModalOpen(false)}
          className="absolute inset-0 z-50 bg-black/60"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="absolute bottom-0 w-full rounded-t-3xl bg-white p-5 pb-8 dark:bg-gray-900"
          >
            <View className="mb-4 items-center">
              <View className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
            </View>
            <Text className="mb-1 text-center text-lg font-bold text-gray-800 dark:text-white">
              {t('postShareConnectionsTitle')}
            </Text>
            <Text className="mb-4 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('postShareConnectionsSubtitle')}
            </Text>

            {loadingConnections ? (
              <View className="items-center py-10">
                <ActivityIndicator color="#4c669f" />
              </View>
            ) : connections.length === 0 ? (
              <Text className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('postShareConnectionsEmpty')}
              </Text>
            ) : (
              <ScrollView
                style={{ maxHeight: 360 }}
                showsVerticalScrollIndicator={false}
              >
                {connections.map((user) => (
                  <PersonRow
                    key={user.id}
                    user={user}
                    subtitle={t('postShareConnectionsHint')}
                    onPress={() => void handleSendToConnection(user)}
                    primaryAction={
                      sendingConnectionId === user.id ? (
                        <ActivityIndicator color="#4c669f" />
                      ) : (
                        <View className="rounded-full bg-[#4c669f]/10 px-3 py-2">
                          <Text className="text-xs font-semibold text-[#4c669f]">
                            {t('postShareSend')}
                          </Text>
                        </View>
                      )
                    }
                  />
                ))}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      ) : null}
    </>
  );
}



