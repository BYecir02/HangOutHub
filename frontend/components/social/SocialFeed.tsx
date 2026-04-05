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
import { Image as ExpoImage } from 'expo-image';
import * as FileSystem from 'expo-file-system/legacy';
import * as Linking from 'expo-linking';
import { useFocusEffect, useRouter } from 'expo-router';
import { Platform } from 'react-native';

import { useI18n } from '@/hooks/use-i18n';
import { useVisibleItemAutoplay } from '@/hooks/useVisibleItemAutoplay';
import PersonRow from './PersonRow';
import PostItem from './PostItem';
import SocialFeedEmptyState from './SocialFeedEmptyState';
import SocialFeedFiltersSheet from './SocialFeedFiltersSheet';
import SocialFeedHeader from './SocialFeedHeader';
import { resolvePostOwnership } from './post-ownership';
import { SkeletonBlock } from '../ui/Skeleton';
import api, { getImageUrl } from '../../services/api';
import { getFriendshipOverview } from '../../services/friendships';
import { getOrCreateDirectChat, sendDirectMessage } from '../../services/direct-chats';
import { subscribeToPostChanges, type PostChangedPayload } from '../../services/post-events';
import { resolveStoredUserSession } from '../../services/user-session';
import { clearAuthState, storage } from '../../services/api';
import type { SocialUser } from '../../types/social';

const FEED_CACHE_KEY = 'socialFeedCache_v2';
const FEED_CACHE_TIME_KEY = 'socialFeedCacheAt_v2';
const FEED_CACHE_CURSOR_KEY = 'socialFeedCacheCursor_v2';
const FEED_CACHE_TTL_MS = 60 * 1000;
const FEED_PAGE_SIZE = 20;
const FEED_TOP_THRESHOLD = 12;
const FEED_CACHE_FILE = `${FileSystem.documentDirectory || ''}socialFeedCache_v2.json`;

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

type FeedCacheSnapshot = {
  posts: FeedPost[];
  nextCursor: string | null;
  cachedAt: number;
};

const readFeedCache = async (): Promise<FeedCacheSnapshot | null> => {
  try {
    if (Platform.OS === 'web') {
      const raw = localStorage.getItem(FEED_CACHE_KEY);
      return raw ? (JSON.parse(raw) as FeedCacheSnapshot) : null;
    }

    if (!FEED_CACHE_FILE) {
      return null;
    }

    const raw = await FileSystem.readAsStringAsync(FEED_CACHE_FILE);
    return JSON.parse(raw) as FeedCacheSnapshot;
  } catch {
    return null;
  }
};

const writeFeedCache = async (snapshot: FeedCacheSnapshot) => {
  const serialized = JSON.stringify(snapshot);

  if (Platform.OS === 'web') {
    localStorage.setItem(FEED_CACHE_KEY, serialized);
    return;
  }

  if (!FEED_CACHE_FILE) {
    return;
  }

  await FileSystem.writeAsStringAsync(FEED_CACHE_FILE, serialized);
};

function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
}: {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
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
      {actionLabel && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          className="mt-6 rounded-full bg-[#4c669f] px-5 py-3"
        >
          <Text className="text-sm font-semibold text-white">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

function SkeletonPost() {
  return (
    <View className="mx-4 mb-4 rounded-3xl bg-white p-4 shadow-sm dark:bg-gray-900">
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
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const persistFeedCache = useCallback(
    async (nextPosts: FeedPost[], nextCursorValue: string | null) => {
      const timestamp = Date.now();
      try {
        await writeFeedCache({
          posts: nextPosts,
          nextCursor: nextCursorValue,
          cachedAt: timestamp,
        });
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
      const cached = await readFeedCache();

      if (cached?.posts) {
        setPosts(cached.posts);
        setLoading(false);
        const cachedLatest = getMaxCreatedAt(cached.posts);
        if (cachedLatest) {
          latestFetchedAtRef.current = cachedLatest;
        }
      }

      if (cached?.cachedAt) {
        setLastFetchedAt(cached.cachedAt);
      }

      if (cached?.nextCursor) {
        setNextCursor(cached.nextCursor);
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

  const mergeUpdatedPost = useCallback(
    (post: FeedPost, update: PostChangedPayload) => {
      const nextPost: FeedPost = {
        ...post,
        ...update,
        images:
          update.images !== undefined
            ? update.images ?? []
            : post.images,
      };

      if (update._count) {
        nextPost._count = {
          ...(post._count || {}),
          ...update._count,
        };
      }

      return nextPost;
    },
    [],
  );

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

        const mergedVisiblePosts = mergePosts(response.data.items, postsRef.current);

        if (mode === 'more') {
          setPosts((current) => mergePosts(response.data.items, current));
        } else if (mode === 'background') {
          if (response.data.items.length > 0) {
            if (isAtTopRef.current) {
              setPosts(mergedVisiblePosts);
            } else {
              setPendingPosts((current) => mergePosts(response.data.items, current));
            }
          }
        } else if (mode === 'refresh') {
          setPosts(mergedVisiblePosts);
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
          mode === 'initial'
            ? response.data.items
            : mode === 'background' && !isAtTopRef.current
              ? postsRef.current
              : mergedVisiblePosts;
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
      const cached = await readFeedCache();
      if (!cached?.cachedAt) {
        return true;
      }
      return Date.now() - cached.cachedAt > FEED_CACHE_TTL_MS;
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

  useEffect(() => {
    let isMounted = true;

    const loadCurrentUser = async () => {
      try {
        const token = await storage.getItem('userToken');
        const session = await resolveStoredUserSession();
        if (!session && token) {
          await clearAuthState();
          router.replace('/');
          return;
        }

        if (isMounted) {
          setCurrentUserId(session?.id || null);
        }
      } catch {
        if (isMounted) {
          setCurrentUserId(null);
        }
      }
    };

    void loadCurrentUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToPostChanges((updatedPost) => {
      const normalizedPost: FeedPost = {
        ...updatedPost,
        images: updatedPost.images ?? [],
      };

      setPosts((current) => {
        const hasPost = current.some((post) => post.id === normalizedPost.id);
        const next = hasPost
          ? current.map((post) =>
              post.id === normalizedPost.id
                ? mergeUpdatedPost(post, normalizedPost)
                : post,
            )
          : mergePosts([normalizedPost], current);
        void persistFeedCache(next, nextCursorRef.current || null);
        return next;
      });
      setPendingPosts((current) =>
        current.some((post) => post.id === normalizedPost.id)
          ? current.map((post) =>
              post.id === normalizedPost.id
                ? mergeUpdatedPost(post, normalizedPost)
                : post,
            )
          : mergePosts([normalizedPost], current),
      );
    });

    return unsubscribe;
  }, [mergePosts, mergeUpdatedPost, persistFeedCache]);

  const handleDeletePost = useCallback(
    async (postId: string) => {
      const previousPosts = postsRef.current;
      const previousPendingPosts = pendingPosts;
      const nextPosts = previousPosts.filter((post) => post.id !== postId);
      const nextPendingPosts = previousPendingPosts.filter((post) => post.id !== postId);

      setPosts(nextPosts);
      setPendingPosts(nextPendingPosts);
      await persistFeedCache(
        nextPendingPosts.length > 0
          ? mergePosts(nextPendingPosts, nextPosts)
          : nextPosts,
        nextCursorRef.current || null,
      );

      try {
        await api.delete(`/posts/${postId}`);
        Alert.alert(
          t('profileDeletePostSuccessTitle'),
          t('profileDeletePostSuccessMessage'),
        );
      } catch (error) {
        setPosts(previousPosts);
        setPendingPosts(previousPendingPosts);
        await persistFeedCache(
          previousPendingPosts.length > 0
            ? mergePosts(previousPendingPosts, previousPosts)
            : previousPosts,
          nextCursorRef.current || null,
        );
        Alert.alert(t('commonErrorTitle'), t('socialFeedDeleteError'));
        console.error('Erreur suppression post:', error);
      }
    },
    [mergePosts, pendingPosts, persistFeedCache, t],
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

  const handleOpenCreateModal = useCallback(() => {
    router.push('/create-modal');
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

  const timelinePosts = useMemo(() => posts, [posts]);

  useEffect(() => {
    const urlsToPrefetch = timelinePosts
      .slice(0, 8)
      .flatMap((post) => (post.images || []).slice(0, 1))
      .map((url) => getImageUrl(url))
      .filter((url): url is string => Boolean(url))
      .filter(
        (url) =>
          !url.endsWith('.mp4') &&
          !url.endsWith('.mov') &&
          !url.endsWith('.m4v') &&
          !url.endsWith('.webm') &&
          !url.endsWith('.mkv'),
      );

    if (urlsToPrefetch.length === 0) {
      return;
    }

    void Promise.all(urlsToPrefetch.map((url) => ExpoImage.prefetch(url))).catch(() => {
      // Préchargement opportuniste: on ignore les erreurs réseau.
    });
  }, [timelinePosts]);

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
    timelinePosts.forEach((post) => {
      const label = resolveLocationLabel(post);
      if (label) {
        values.add(label);
      }
    });
    return Array.from(values);
  }, [resolveLocationLabel, timelinePosts]);

  const filteredPosts = useMemo(() => {
    return timelinePosts.filter((post) => {
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
  }, [
    resolveLocationLabel,
    selectedCategory,
    selectedLocation,
    selectedType,
    timelinePosts,
  ]);

  const feedMediaCount = useMemo(
    () => filteredPosts.filter((post) => (post.images || []).length > 0).length,
    [filteredPosts],
  );

  const feedAutoplay = useVisibleItemAutoplay(filteredPosts, (post) => post.id);

  const renderHeader = () => (
    <SocialFeedHeader
      headerLabel={t('socialFeedHeaderLabel')}
      headerTitle={t('socialFeedHeaderTitle')}
      headerSubtitle={t('socialFeedHeaderSubtitle')}
      allLabel={t('socialFeedFilterAll')}
      postsLabel={t('socialFeedFilterPosts')}
      plansLabel={t('socialFeedFilterPlans')}
      locationLabel={t('socialFeedFilterLocation')}
      pendingLabel={pendingLabel}
      pendingVisible={pendingPosts.length > 0}
      onSearch={handleOpenSearch}
      onOpenFilters={() => setFiltersOpen(true)}
      onOpenMessages={handleOpenMessages}
      onShowAll={() => {
        setSelectedCategory('');
        setSelectedType('all');
        setSelectedLocation('');
      }}
      onShowPosts={() => {
        setSelectedCategory('');
        setSelectedLocation('');
        setSelectedType('post');
      }}
      onShowPlans={() => {
        setSelectedCategory('');
        setSelectedLocation('');
        setSelectedType('plan');
      }}
      onOpenLocationFilters={() => {
        setActiveFilter('location');
        setFiltersOpen(true);
      }}
      selectedCategory={selectedCategory}
      selectedType={selectedType}
      selectedLocation={selectedLocation}
      onApplyPending={() => void applyPendingPosts()}
    />
  );

  if (loading && posts.length === 0) {
    return (
      <FlatList<string>
        key="social-feed-skeleton"
        data={['skeleton-0', 'skeleton-1', 'skeleton-2']}
        keyExtractor={(item) => item}
        renderItem={() => <SkeletonPost />}
        ListHeaderComponent={renderHeader}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="never"
        contentContainerStyle={{ paddingBottom: 120, paddingTop: 4 }}
        className="flex-1 bg-gray-50 dark:bg-black"
      />
    );
  }

  return (
    <>
      <FlatList<FeedPost>
        key="social-feed-main"
        data={filteredPosts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            onLayout={(event) => {
              feedAutoplay.registerLayout(item.id, {
                y: event.nativeEvent.layout.y,
                height: event.nativeEvent.layout.height,
              });
            }}
          >
            {(() => {
              const isOwner = resolvePostOwnership(
                item.userId,
                item.isOwner,
                currentUserId,
              );
              const normalizedItem: FeedPost = {
                ...item,
                isOwner,
              };

              return (
            <PostItem
              item={normalizedItem}
              showDateColumn={false}
              shouldPlayMedia={feedAutoplay.activeId === item.id}
              onDelete={normalizedItem.isOwner ? handleDeletePost : undefined}
              onEdit={normalizedItem.isOwner ? handleEditPost : undefined}
              onComment={handleCommentPost}
              onShare={handleSharePost}
            />
              );
            })()}
          </View>
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          <SocialFeedEmptyState
            title={t('socialFeedEmptyTitle')}
            description={t('socialFeedEmptyDescription')}
            actionLabel={t('createActionPostLabel')}
            onAction={handleOpenCreateModal}
          />
        }
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void fetchFeed('refresh')}
            tintColor="#4c669f"
          />
        }
        onLayout={feedAutoplay.onLayout}
        onScroll={(event) => {
          handleScroll(event);
          feedAutoplay.onScroll(event);
        }}
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

      <SocialFeedFiltersSheet
        open={filtersOpen}
        filterCategoryLabel={t('socialFeedFilterCategory')}
        filterTypeLabel={t('socialFeedFilterType')}
        filterLocationLabel={t('socialFeedFilterLocation')}
        filterCategoryTitle={t('socialFeedFilterCategoryTitle')}
        filterTypeTitle={t('socialFeedFilterTypeTitle')}
        filterLocationTitle={t('socialFeedFilterLocationTitle')}
        clearLabel={t('socialFeedFilterClear')}
        allLabel={t('socialFeedFilterAll')}
        plansLabel={t('socialFeedFilterPlans')}
        postsLabel={t('socialFeedFilterPosts')}
        categories={categories}
        locationOptions={locationOptions}
        activeFilter={activeFilter}
        selectedCategory={selectedCategory}
        selectedType={selectedType}
        selectedLocation={selectedLocation}
        onClose={() => setFiltersOpen(false)}
        onSetActiveFilter={setActiveFilter}
        onReset={() => {
          setSelectedCategory('');
          setSelectedType('all');
          setSelectedLocation('');
          setFiltersOpen(false);
        }}
        onSelectCategory={(value) => {
          setSelectedCategory(value);
          setFiltersOpen(false);
        }}
        onSelectType={(value) => {
          setSelectedType(value);
          setFiltersOpen(false);
        }}
        onSelectLocation={(value) => {
          setSelectedLocation(value);
          setFiltersOpen(false);
        }}
      />

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



