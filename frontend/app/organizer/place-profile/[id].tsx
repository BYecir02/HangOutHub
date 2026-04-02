import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';

import ScreenHeader from '@/components/ui/ScreenHeader';
import ScreenState from '@/components/ui/ScreenState';
import Tabs, { type TabItem } from '@/components/ui/Tabs';
import PostItem, { type PostItemData } from '@/components/social/PostItem';
import { useI18n } from '@/hooks/use-i18n';
import { useOrganizerGuard } from '@/hooks/useOrganizerGuard';
import { useUserProfile } from '@/hooks/useUserProfile';
import api, { getImageUrl } from '@/services/api';
import { getPlacePosts } from '@/services/posts';

const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';

type OrganizerPlaceTabId = 'overview' | 'posts' | 'events' | 'reviews';

interface RelatedEvent {
  id: string;
  title: string;
  startTime: string;
  coverUrl: string | null;
}

interface PlaceDetail {
  id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  openingHours?: string | null;
  coverUrl?: string | null;
  images?: string[];
  avgRating?: number | null;
  City?: {
    name?: string | null;
  } | null;
  Owner?: {
    displayName?: string | null;
    username?: string | null;
  } | null;
  Event?: RelatedEvent[];
}

interface PlaceReview {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt?: string | null;
  User?: {
    username?: string | null;
    displayName?: string | null;
  } | null;
}

function formatEventDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatReviewDate(value: string | null | undefined, locale: string) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function OrganizerPlaceProfileScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { t, locale } = useI18n();
  const { user, loading, error, refetch } = useUserProfile();
  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [posts, setPosts] = useState<PostItemData[]>([]);
  const [pageLoading, setPageLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [postsLoading, setPostsLoading] = useState(false);
  const [postsLoaded, setPostsLoaded] = useState(false);
  const [pageError, setPageError] = useState(false);
  const [activeTab, setActiveTab] = useState<OrganizerPlaceTabId>('overview');

  const isAllowed = useOrganizerGuard({
    user,
    loading,
    suspend: Boolean(error),
    requiredCapability: 'profile',
  });

  const loadScreen = useCallback(async () => {
    if (!params.id) {
      setPlace(null);
      setReviews([]);
      setPageLoading(false);
      setPageError(true);
      return;
    }

    setPageLoading(true);
    setReviewsLoading(true);
    setPosts([]);
    setPostsLoaded(false);
    setPageError(false);

    try {
      const [placeResponse, reviewsResponse] = await Promise.all([
        api.get<PlaceDetail>(`/places/${params.id}`),
        api.get<PlaceReview[]>(`/places/${params.id}/reviews`),
      ]);

      setPlace(placeResponse.data);
      setReviews(reviewsResponse.data || []);
    } catch {
      setPlace(null);
      setReviews([]);
      setPageError(true);
    } finally {
      setPageLoading(false);
      setReviewsLoading(false);
    }
  }, [params.id]);

  useFocusEffect(
    useCallback(() => {
      void loadScreen();
    }, [loadScreen]),
  );

  const placeImage = useMemo(
    () => getImageUrl(place?.coverUrl) || PLACE_PLACEHOLDER,
    [place?.coverUrl],
  );
  const gallery = useMemo(() => {
    if (!place) {
      return [PLACE_PLACEHOLDER];
    }

    if (place.images && place.images.length > 0) {
      return place.images.map((image) => getImageUrl(image) || PLACE_PLACEHOLDER);
    }

    return [placeImage];
  }, [place, placeImage]);
  const openingHoursLines = useMemo(
    () =>
      (place?.openingHours || '')
        .split('|')
        .map((line) => line.trim())
        .filter(Boolean),
    [place?.openingHours],
  );
  const tabItems = useMemo<TabItem[]>(
    () => [
      { id: 'overview', label: t('organizerPlaceProfileTabInfo') },
      { id: 'posts', label: t('organizerPlaceProfileTabPosts') },
      { id: 'events', label: t('organizerPlaceProfileTabEvents') },
      { id: 'reviews', label: t('organizerPlaceProfileTabReviews') },
    ],
    [t],
  );

  const loadPosts = useCallback(async () => {
    if (!place?.id || postsLoaded) {
      return;
    }

    setPostsLoading(true);
    try {
      const response = await getPlacePosts(place.id);
      setPosts(response || []);
      setPostsLoaded(true);
    } catch {
      setPosts([]);
    } finally {
      setPostsLoading(false);
    }
  }, [place?.id, postsLoaded]);

  useEffect(() => {
    if (activeTab !== 'posts' || !place?.id || postsLoaded) {
      return;
    }

    void loadPosts();
  }, [activeTab, loadPosts, place?.id, postsLoaded]);

  const handleOpenPublicPlace = () => {
    if (!place?.id) {
      return;
    }
    router.push({
      pathname: '/place/[id]',
      params: { id: place.id },
    });
  };

  const handleCreatePost = () => {
    if (!place?.id) {
      return;
    }

    router.push({
      pathname: '/post',
      params: {
        publicationScope: 'structure',
        placeId: place.id,
        placeName: place.name,
        cityName: place.City?.name || '',
      },
    });
  };

  if (loading || pageLoading) {
    return (
      <ScreenState
        mode="loading"
        fullScreen
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  if ((error && !user) || pageError || !place || !params.id) {
    return (
      <ScreenState
        mode="error"
        fullScreen
        title={t('organizerDataLoadErrorTitle')}
        description={t('organizerDataLoadErrorMessage')}
        actionLabel={t('organizerDataRetry')}
        onAction={() => {
          void refetch();
          void loadScreen();
        }}
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  if (!user || !isAllowed) {
    return (
      <ScreenState
        mode="loading"
        fullScreen
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black"
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 88 }}
    >
      <ScreenHeader
        title={place.name}
        subtitle={t('organizerPlaceProfileSubtitle')}
        label={t('organizerPlaceProfileLabel')}
        onBack={() => router.back()}
      />

      <View className="mt-5 rounded-3xl bg-white p-4 dark:bg-gray-900">
        <View className="flex-row">
          <Image
            source={{ uri: placeImage }}
            className="h-24 w-24 rounded-2xl bg-gray-200 dark:bg-gray-800"
            resizeMode="cover"
          />
          <View className="ml-4 flex-1 justify-center">
            <Text className="text-lg font-bold text-gray-900 dark:text-white">
              {place.name}
            </Text>
            <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {place.City?.name || t('homeAddressToConfirm')}
            </Text>
            <View className="mt-2 flex-row flex-wrap gap-2">
              {place.category ? (
                <View className="rounded-full bg-sky-100 px-3 py-1 dark:bg-sky-900/30">
                  <Text className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                    {place.category}
                  </Text>
                </View>
              ) : null}
              {typeof place.avgRating === 'number' && place.avgRating > 0 ? (
                <View className="flex-row items-center rounded-full bg-yellow-100 px-3 py-1 dark:bg-yellow-900/30">
                  <Ionicons name="star" size={12} color="#f59e0b" />
                  <Text className="ml-1 text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                    {place.avgRating.toFixed(1)}
                  </Text>
                </View>
              ) : null}
            </View>
          </View>
        </View>

        <View className="mt-4 flex-row gap-3">
          <TouchableOpacity
            onPress={handleCreatePost}
            className="flex-1 items-center rounded-2xl bg-[#4c669f] px-4 py-3"
          >
            <Text className="text-sm font-semibold text-white">
              {t('organizerPlaceProfileCreatePost')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleOpenPublicPlace}
            className="flex-1 items-center rounded-2xl border border-gray-200 bg-gray-100 px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
          >
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('organizerPlaceProfileOpenPublic')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View className="mt-6 rounded-3xl bg-white px-4 py-4 dark:bg-gray-900">
        <Tabs
          items={tabItems}
          activeTab={activeTab}
          onTabChange={(id) => setActiveTab(id as OrganizerPlaceTabId)}
        />

        {activeTab === 'overview' ? (
          <View className="pt-4">
            <View className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-800">
              <View className="flex-row items-start">
                <Ionicons name="location-outline" size={18} color="#2ecc71" />
                <View className="ml-2 flex-1">
                  <Text className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                    {t('placeDetailAddressLabel')}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                    {place.address || t('homeAddressToConfirm')}
                  </Text>
                </View>
              </View>

              {place.phone ? (
                <View className="mt-4 flex-row items-start">
                  <Ionicons name="call-outline" size={18} color="#0ea5e9" />
                  <View className="ml-2 flex-1">
                    <Text className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                      {t('createPlacePhoneLabel')}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                      {place.phone}
                    </Text>
                  </View>
                </View>
              ) : null}

              {place.whatsapp ? (
                <View className="mt-4 flex-row items-start">
                  <Ionicons name="logo-whatsapp" size={18} color="#16a34a" />
                  <View className="ml-2 flex-1">
                    <Text className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                      {t('createPlaceWhatsappLabel')}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                      {place.whatsapp}
                    </Text>
                  </View>
                </View>
              ) : null}

              {place.openingHours ? (
                <View className="mt-4 flex-row items-start">
                  <Ionicons name="time-outline" size={18} color="#f59e0b" />
                  <View className="ml-2 flex-1">
                    <Text className="text-xs uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                      {t('createPlaceHoursLabel')}
                    </Text>
                    {openingHoursLines.length > 0 ? (
                      openingHoursLines.map((line, index) => (
                        <Text
                          key={`${place.id}-hours-${index}`}
                          className="mt-1 text-sm text-gray-700 dark:text-gray-200"
                        >
                          {line}
                        </Text>
                      ))
                    ) : (
                      <Text className="mt-1 text-sm text-gray-700 dark:text-gray-200">
                        {place.openingHours}
                      </Text>
                    )}
                  </View>
                </View>
              ) : null}
            </View>

            <View className="mt-5">
              <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                {t('placeDetailAbout')}
              </Text>
              <Text className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                {place.description || t('placeDetailDescriptionFallback')}
              </Text>
            </View>

            <View className="mt-5">
              <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                {t('placeDetailGallery')}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                className="mt-3"
                contentContainerStyle={{ paddingRight: 12 }}
              >
                {gallery.map((image, index) => (
                  <Image
                    key={`${place.id}-gallery-${index}`}
                    source={{ uri: image }}
                    className="mr-3 h-24 w-36 rounded-2xl bg-gray-200 dark:bg-gray-800"
                    resizeMode="cover"
                  />
                ))}
              </ScrollView>
            </View>
          </View>
        ) : null}

        {activeTab === 'posts' ? (
          <View className="pt-4">
            {postsLoading ? (
              <View className="py-6">
                <ActivityIndicator color="#4c669f" />
              </View>
            ) : posts.length > 0 ? (
              <View className="pb-2">
                {posts.map((post) => (
                  <PostItem
                    key={post.id}
                    item={post}
                    showDateColumn={false}
                    authorDisplayMode="user"
                  />
                ))}
              </View>
            ) : (
              <ScreenState
                mode="empty"
                title={t('organizerPlaceProfilePostsEmptyTitle')}
                description={t('organizerPlaceProfilePostsEmptyDescription')}
                containerClassName="px-0 py-2"
              />
            )}
          </View>
        ) : null}

        {activeTab === 'events' ? (
          <View className="pt-4">
            {place.Event && place.Event.length > 0 ? (
              <View className="gap-3">
                {place.Event.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    onPress={() =>
                      router.push({
                        pathname: '/event/[id]',
                        params: { id: event.id },
                      })
                    }
                    className="flex-row rounded-2xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800"
                  >
                    <Image
                      source={{
                        uri: getImageUrl(event.coverUrl) || PLACE_PLACEHOLDER,
                      }}
                      className="h-16 w-16 rounded-xl bg-gray-200 dark:bg-gray-700"
                      resizeMode="cover"
                    />
                    <View className="ml-3 flex-1 justify-center">
                      <Text
                        className="text-sm font-semibold text-gray-900 dark:text-white"
                        numberOfLines={1}
                      >
                        {event.title}
                      </Text>
                      <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {formatEventDate(event.startTime, locale)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color="#9ca3af" />
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <ScreenState
                mode="empty"
                title={t('organizerPlaceProfileEventsEmptyTitle')}
                description={t('organizerPlaceProfileEventsEmptyDescription')}
                containerClassName="px-0 py-2"
              />
            )}
          </View>
        ) : null}

        {activeTab === 'reviews' ? (
          <View className="pt-4">
            {reviewsLoading ? (
              <View className="py-6">
                <ActivityIndicator color="#4c669f" />
              </View>
            ) : reviews.length > 0 ? (
              <View className="gap-3">
                {reviews.map((review) => (
                  <View
                    key={review.id}
                    className="rounded-2xl border border-gray-100 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-800"
                  >
                    <View className="flex-row items-center justify-between">
                      <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                        {review.User?.displayName ||
                          review.User?.username ||
                          t('placeDetailReviewAnonymous')}
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">
                        {formatReviewDate(review.createdAt, locale)}
                      </Text>
                    </View>
                    <View className="mt-2 flex-row items-center">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <Ionicons
                          key={`${review.id}-star-${index}`}
                          name={index < (review.rating || 0) ? 'star' : 'star-outline'}
                          size={14}
                          color={index < (review.rating || 0) ? '#f59e0b' : '#9ca3af'}
                          style={{ marginRight: 2 }}
                        />
                      ))}
                    </View>
                    {review.comment ? (
                      <Text className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                        {review.comment}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </View>
            ) : (
              <ScreenState
                mode="empty"
                title={t('organizerPlaceProfileReviewsEmptyTitle')}
                description={t('organizerPlaceProfileReviewsEmptyDescription')}
                containerClassName="px-0 py-2"
              />
            )}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}
