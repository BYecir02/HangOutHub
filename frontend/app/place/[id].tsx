import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import ContactAction from '@/components/ui/ContactAction';
import ReportReasonSheet from '@/components/ui/ReportReasonSheet';
import Tabs, { type TabItem } from '@/components/ui/Tabs';
import { useI18n } from '@/hooks/use-i18n';
import api, { getApiErrorMessage, getImageUrl, storage } from '@/services/api';
import { createReport } from '@/services/reports';
import { resolveStoredUserSession } from '@/services/user-session';
import { getOrCreateDirectChat } from '@/services/direct-chats';

interface RelatedEvent {
  id: string;
  title: string;
  startTime: string;
  coverUrl: string | null;
  entryFee?: number | string | null;
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
  images: string[];
  avgRating?: number | null;
  priceLevel?: number | null;
  City?: {
    name?: string | null;
  } | null;
  Owner?: {
    id?: string;
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
    id?: string;
    username?: string | null;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
}

const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';
type PlaceDetailTab = 'info' | 'events' | 'reviews';

function formatPriceLevel(
  level: number | null | undefined,
  t: (key: 'placeDetailPriceUnknown' | 'placeDetailPriceLevel', params?: { symbols: string; level: number }) => string,
) {
  if (!level || level < 1) {
    return t('placeDetailPriceUnknown');
  }

  return t('placeDetailPriceLevel', { symbols: '$'.repeat(level), level });
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

function getPlaceCategoryLabel(
  category: string | null | undefined,
  t: (
    key:
      | 'placeDetailTypeLabel'
      | 'createPlaceCategoryBar'
      | 'createPlaceCategoryRestaurant'
      | 'createPlaceCategoryClub'
      | 'createPlaceCategoryCafe'
      | 'createPlaceCategoryCulture',
  ) => string,
) {
  if (!category) {
    return t('placeDetailTypeLabel');
  }

  const normalized = category.trim().toLowerCase();

  if (normalized === 'bar') {
    return t('createPlaceCategoryBar');
  }
  if (normalized === 'restaurant') {
    return t('createPlaceCategoryRestaurant');
  }
  if (normalized === 'club') {
    return t('createPlaceCategoryClub');
  }
  if (normalized === 'cafe') {
    return t('createPlaceCategoryCafe');
  }
  if (normalized === 'culture') {
    return t('createPlaceCategoryCulture');
  }

  return category;
}

export default function PlaceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { locale, t } = useI18n();
  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<PlaceDetailTab>('info');

  useEffect(() => {
    let isMounted = true;

    const fetchPlace = async () => {
      if (!params.id) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      try {
        const response = await api.get<PlaceDetail>(`/places/${params.id}`);
        if (isMounted) {
          setPlace(response.data);
        }

        const token = await storage.getItem('userToken');
        if (!token) {
          if (isMounted) {
            setCanSave(false);
            setIsSaved(false);
          }
          return;
        }

        try {
          const savedPlacesResponse = await api.get<{ id: string }[]>(
            '/places/saved/mine',
          );
          if (isMounted) {
            setCanSave(true);
            setIsSaved(
              savedPlacesResponse.data.some(
                (savedPlace) => savedPlace.id === params.id,
              ),
            );
          }
        } catch {
          if (isMounted) {
            setCanSave(true);
            setIsSaved(false);
          }
        }
      } catch {
        if (isMounted) {
          setPlace(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void fetchPlace();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  useEffect(() => {
    let isMounted = true;

    const resolveUser = async () => {
      const session = await resolveStoredUserSession();
      if (!isMounted) {
        return;
      }

      setCurrentUserId(session?.id ?? null);
    };

    void resolveUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchReviews = async () => {
      if (!params.id) {
        return;
      }

      setReviewsLoading(true);
      try {
        const response = await api.get<PlaceReview[]>(`/places/${params.id}/reviews`);
        if (isMounted) {
          setReviews(response.data || []);
        }
      } catch {
        if (isMounted) {
          setReviews([]);
        }
      } finally {
        if (isMounted) {
          setReviewsLoading(false);
        }
      }
    };

    void fetchReviews();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  if (!place) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8 dark:bg-black">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          {t('placeDetailNotFound')}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-[#2ecc71] px-5 py-3"
        >
          <Text className="font-semibold text-white">{t('publicProfileBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const heroImage = getImageUrl(place.coverUrl) || PLACE_PLACEHOLDER;
  const gallery =
    place.images?.length > 0
      ? place.images.map((image) => getImageUrl(image) || PLACE_PLACEHOLDER)
      : [heroImage];
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const myReview = currentUserId
    ? reviews.find((review) => review.User?.id === currentUserId)
    : undefined;
  const placeCategoryLabel = getPlaceCategoryLabel(place.category, t);
  const openingHoursLines = (place.openingHours || '')
    .split('|')
    .map((line) => line.trim())
    .filter(Boolean);
  const tabItems: TabItem[] = [
    { id: 'info', label: t('placeDetailTabInfo') },
    { id: 'events', label: t('placeDetailTabEvents') },
    { id: 'reviews', label: t('placeDetailTabReviews') },
  ];

  const handleOpenCreateModal = () => {
    router.push({
      pathname: '/create-modal',
      params: {
        placeId: place.id,
        placeName: place.name,
        cityName: place.City?.name || '',
        sourceLabel: place.name,
        outingTitle: t('placeDetailOutingTitle', { name: place.name }),
      },
    });
  };

  const handleToggleSave = async () => {
    if (!canSave) {
      Alert.alert(t('placeDetailLoginRequiredTitle'), t('placeDetailLoginRequiredMessage'));
      return;
    }

    setSaveLoading(true);

    try {
      const response = await api.post<{ saved: boolean }>(`/places/${place.id}/save`);
      setIsSaved(response.data.saved);
      Alert.alert(
        t('outingCreateSuccessTitle'),
        response.data.saved
          ? t('placeDetailSaveAdded')
          : t('placeDetailSaveRemoved'),
      );
    } catch {
      Alert.alert(t('commonErrorTitle'), t('placeDetailSaveUpdateFailed'));
    } finally {
      setSaveLoading(false);
    }
  };

  const handleContactPlace = async () => {
    const ownerId = place?.Owner?.id;
    if (!ownerId) {
      return;
    }

    try {
      const chat = await getOrCreateDirectChat(ownerId);
      router.push({
        pathname: '/direct-chat/[id]',
        params: { id: chat.id },
      });
    } catch (error) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('directChatStartFailed')),
      );
    }
  };

  const handleReportPlace = () => {
    setReportSheetVisible(true);
  };

  const handleSubmitReportReason = async (reason: string) => {
    if (!place) {
      return;
    }

    try {
      await createReport(place.id, 'PLACE', reason);
      Alert.alert(t('reportSuccessTitle'), t('reportSuccessMessage'));
    } catch (error) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('reportFailed')),
      );
    }
  };

  const handleSubmitReview = async () => {
    if (!place) {
      return;
    }

    const token = await storage.getItem('userToken');
    if (!token) {
      Alert.alert(t('placeDetailReviewLoginTitle'), t('placeDetailReviewLoginMessage'));
      return;
    }

    if (reviewRating < 1) {
      Alert.alert(t('commonErrorTitle'), t('placeDetailReviewRatingRequired'));
      return;
    }

    setReviewSubmitting(true);
    try {
      await api.post(`/places/${place.id}/reviews`, {
        rating: reviewRating,
        comment: reviewComment.trim() || undefined,
      });

      const [updatedPlace, updatedReviews] = await Promise.all([
        api.get<PlaceDetail>(`/places/${place.id}`),
        api.get<PlaceReview[]>(`/places/${place.id}/reviews`),
      ]);

      setPlace(updatedPlace.data);
      setReviews(updatedReviews.data || []);
      setShowReviewModal(false);
      setReviewRating(0);
      setReviewComment('');
      Alert.alert(t('placeDetailReviewSuccessTitle'), t('placeDetailReviewSuccessMessage'));
    } catch {
      Alert.alert(t('commonErrorTitle'), t('placeDetailReviewFailed'));
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
      >
      <View className="relative">
        <Image source={{ uri: heroImage }} className="h-80 w-full" resizeMode="cover" />
        <View className="absolute inset-x-0 top-0 flex-row items-center justify-between px-5 pt-14">
          <TouchableOpacity
            onPress={() => router.back()}
            className="rounded-full bg-black/45 p-3"
          >
            <Ionicons name="arrow-back" size={22} color="#fff" />
          </TouchableOpacity>
          <View className="rounded-full bg-black/45 px-3 py-2">
            <Text className="text-xs font-semibold uppercase tracking-widest text-white">
              {placeCategoryLabel}
            </Text>
          </View>
        </View>
      </View>

      <View className="-mt-8 rounded-t-[28px] bg-gray-50 px-5 pt-6 dark:bg-black">
        <Text className="text-3xl font-bold text-gray-900 dark:text-white">
          {place.name}
        </Text>

        <View className="mt-4 flex-row flex-wrap gap-2">
          <View className="rounded-full bg-green-100 px-3 py-2 dark:bg-green-900/30">
            <Text className="text-xs font-semibold text-green-700 dark:text-green-300">
              {place.City?.name || t('placeDetailCityUnknown')}
            </Text>
          </View>
          <View className="rounded-full bg-gray-200 px-3 py-2 dark:bg-gray-800">
            <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {formatPriceLevel(place.priceLevel, t)}
            </Text>
          </View>
          {place.category ? (
            <View className="rounded-full bg-sky-100 px-3 py-2 dark:bg-sky-900/30">
              <Text className="text-xs font-semibold text-sky-700 dark:text-sky-300">
                {placeCategoryLabel}
              </Text>
            </View>
          ) : null}
          {typeof place.avgRating === 'number' && place.avgRating > 0 ? (
            <View className="flex-row items-center rounded-full bg-yellow-100 px-3 py-2 dark:bg-yellow-900/30">
              <Ionicons name="star" size={12} color="#f59e0b" />
              <Text className="ml-1 text-xs font-semibold text-yellow-700 dark:text-yellow-300">
                {place.avgRating.toFixed(1)}
              </Text>
            </View>
          ) : null}
        </View>

        <View className="mt-6 rounded-3xl bg-white p-5 dark:bg-gray-900">
          <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('placeDetailActionTitle')}
          </Text>
          <Text className="mt-2 text-base leading-7 text-gray-700 dark:text-gray-200">
            {t('placeDetailActionDescription')}
          </Text>

            <View className="mt-4 flex-row items-center gap-3">
              <TouchableOpacity
                onPress={handleToggleSave}
                disabled={saveLoading}
              className={`h-12 w-12 items-center justify-center rounded-2xl border ${
                isSaved
                  ? 'border-[#2ecc71] bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
              }`}
            >
              {saveLoading ? (
                <ActivityIndicator color={isSaved ? '#2ecc71' : '#4c669f'} />
              ) : (
                <Ionicons
                  name={isSaved ? 'bookmark' : 'bookmark-outline'}
                  size={22}
                  color={isSaved ? '#2ecc71' : '#4c669f'}
                />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleOpenCreateModal}
              className="flex-1 flex-row items-center justify-center rounded-2xl bg-[#4c669f] px-4 py-4"
            >
              <Ionicons name="add" size={20} color="#fff" />
                <Text className="ml-2 text-sm font-semibold text-white">
                  {t('placeDetailCreateCta')}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleReportPlace}
              className="mt-3 flex-row items-center self-start rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5"
            >
              <Ionicons name="flag-outline" size={14} color="#e11d48" />
              <Text className="ml-2 text-xs font-semibold text-rose-600">
                {t('reportAction')}
              </Text>
            </TouchableOpacity>
          </View>

        <View className="mt-6 rounded-3xl bg-white p-4 dark:bg-gray-900">
          <Tabs
            items={tabItems}
            activeTab={activeTab}
            onTabChange={(id) => setActiveTab(id as PlaceDetailTab)}
          />

          {activeTab === 'info' ? (
            <View className="pb-2 pt-4">
              <View className="rounded-3xl bg-gray-50 p-5 dark:bg-gray-800">
                <View className="flex-row items-start">
                  <Ionicons name="location-outline" size={20} color="#2ecc71" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                      {t('placeDetailAddressLabel')}
                    </Text>
                    <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                      {place.address || t('homeAddressToConfirm')}
                    </Text>
                  </View>
                </View>

                <View className="mt-5 flex-row items-start">
                  <Ionicons name="person-outline" size={20} color="#4c669f" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                      {t('placeDetailPublishedBy')}
                    </Text>
                    <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                      {place.Owner?.displayName ||
                        place.Owner?.username ||
                        t('placeDetailUnknownOrganizer')}
                    </Text>
                    {place.Owner?.id ? (
                      <ContactAction
                        onPress={handleContactPlace}
                        label={t('directChatContactPlace')}
                      />
                    ) : null}
                  </View>
                </View>

                {place.phone || place.whatsapp || place.openingHours ? (
                  <View className="mt-5">
                    {place.phone ? (
                      <View className="flex-row items-start">
                        <Ionicons name="call-outline" size={20} color="#0ea5e9" />
                        <View className="ml-3 flex-1">
                          <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                            {t('createPlacePhoneLabel')}
                          </Text>
                          <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                            {place.phone}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    {place.whatsapp ? (
                      <View className="mt-4 flex-row items-start">
                        <Ionicons name="logo-whatsapp" size={20} color="#16a34a" />
                        <View className="ml-3 flex-1">
                          <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                            {t('createPlaceWhatsappLabel')}
                          </Text>
                          <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                            {place.whatsapp}
                          </Text>
                        </View>
                      </View>
                    ) : null}

                    {place.openingHours ? (
                      <View className="mt-4 flex-row items-start">
                        <Ionicons name="time-outline" size={20} color="#f59e0b" />
                        <View className="ml-3 flex-1">
                          <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                            {t('createPlaceHoursLabel')}
                          </Text>
                          {openingHoursLines.length > 0 ? (
                            openingHoursLines.map((line, index) => (
                              <Text
                                key={`${place.id}-hours-${index}`}
                                className="mt-1 text-base text-gray-800 dark:text-gray-100"
                              >
                                {line}
                              </Text>
                            ))
                          ) : (
                            <Text className="mt-1 text-base text-gray-800 dark:text-gray-100">
                              {place.openingHours}
                            </Text>
                          )}
                        </View>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>

              <View className="mt-6">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('placeDetailAbout')}
                </Text>
                <Text className="mt-3 text-base leading-7 text-gray-600 dark:text-gray-300">
                  {place.description || t('placeDetailDescriptionFallback')}
                </Text>
              </View>

              <View className="mt-6">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('placeDetailGallery')}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingTop: 16, paddingBottom: 8 }}
                >
                  {gallery.map((image, index) => (
                    <TouchableOpacity
                      key={`${place.id}-gallery-${index}`}
                      onPress={() => {
                        setGalleryIndex(index);
                        setGalleryOpen(true);
                      }}
                      className="mr-3"
                      activeOpacity={0.9}
                    >
                      <Image
                        source={{ uri: image }}
                        className="h-28 w-40 rounded-2xl bg-gray-200 dark:bg-gray-800"
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          ) : null}

          {activeTab === 'events' ? (
            <View className="pb-2 pt-4">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                {t('placeDetailRelatedEvents')}
              </Text>
              {place.Event && place.Event.length > 0 ? (
                place.Event.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    onPress={() =>
                      router.push({
                        pathname: '/event/[id]',
                        params: { id: event.id },
                      })
                    }
                    className="mt-4 flex-row rounded-3xl bg-gray-50 p-3 dark:bg-gray-800"
                  >
                    <Image
                      source={{
                        uri: getImageUrl(event.coverUrl) || PLACE_PLACEHOLDER,
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
                        {formatEventDate(event.startTime, locale)}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                  </TouchableOpacity>
                ))
              ) : (
                <Text className="mt-3 text-base text-gray-500 dark:text-gray-400">
                  {t('placeDetailNoRelatedEvents')}
                </Text>
              )}
            </View>
          ) : null}

          {activeTab === 'reviews' ? (
            <View className="pb-2 pt-4">
              <View className="flex-row items-center justify-between">
                <Text className="text-lg font-bold text-gray-900 dark:text-white">
                  {t('placeDetailReviewsTitle')}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    if (myReview) {
                      setReviewRating(myReview.rating || 0);
                      setReviewComment(myReview.comment ?? '');
                    } else {
                      setReviewRating(0);
                      setReviewComment('');
                    }
                    setShowReviewModal(true);
                  }}
                  className="rounded-full bg-[#2ecc71] px-4 py-2"
                >
                  <Text className="text-xs font-semibold text-white">
                    {myReview ? t('placeDetailEditReview') : t('placeDetailAddReview')}
                  </Text>
                </TouchableOpacity>
              </View>

              {reviewsLoading ? (
                <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  {t('placeDetailReviewsLoading')}
                </Text>
              ) : reviews.length > 0 ? (
                <View className="mt-4 gap-3">
                  {reviews.map((review) => (
                    <View
                      key={review.id}
                      className="rounded-3xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800"
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
                <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  {t('placeDetailReviewsEmpty')}
                </Text>
              )}
            </View>
          ) : null}
        </View>

        <View className="pb-24" />
      </View>
    </ScrollView>

    <Modal
      visible={galleryOpen}
      transparent={false}
      animationType="fade"
      onRequestClose={() => setGalleryOpen(false)}
    >
      <View className="flex-1 bg-black">
        <TouchableOpacity
          onPress={() => setGalleryOpen(false)}
          className="absolute right-5 top-12 z-10 rounded-full bg-black/60 p-3"
        >
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>

        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          contentOffset={{ x: screenWidth * galleryIndex, y: 0 }}
        >
          {gallery.map((image, index) => (
            <View
              key={`${place.id}-preview-${index}`}
              style={{ width: screenWidth, height: screenHeight }}
              className="items-center justify-center"
            >
              <Image
                source={{ uri: image }}
                style={{ width: screenWidth, height: screenHeight }}
                resizeMode="contain"
              />
            </View>
          ))}
        </ScrollView>
      </View>
    </Modal>

      <Modal
        visible={showReviewModal}
        transparent
      animationType="fade"
      onRequestClose={() => setShowReviewModal(false)}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        className="flex-1"
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View className="flex-1 items-center justify-center bg-black/60 px-6">
            <View className="w-full max-w-lg rounded-3xl bg-white p-6 dark:bg-gray-900">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                {t('placeDetailReviewModalTitle')}
              </Text>
              <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {t('placeDetailReviewModalSubtitle')}
              </Text>

              <View className="mt-4 flex-row items-center justify-center">
                {Array.from({ length: 5 }).map((_, index) => {
                  const value = index + 1;
                  return (
                    <TouchableOpacity
                      key={`rating-${value}`}
                      onPress={() => setReviewRating(value)}
                      className="mx-1"
                    >
                      <Ionicons
                        name={value <= reviewRating ? 'star' : 'star-outline'}
                        size={28}
                        color={value <= reviewRating ? '#f59e0b' : '#9ca3af'}
                      />
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TextInput
                value={reviewComment}
                onChangeText={setReviewComment}
                placeholder={t('placeDetailReviewPlaceholder')}
                placeholderTextColor="#9ca3af"
                className="mt-4 min-h-[90px] rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
                multiline
                textAlignVertical="top"
              />

              <View className="mt-5 flex-row gap-3">
                <TouchableOpacity
                  onPress={() => setShowReviewModal(false)}
                  className="flex-1 items-center rounded-2xl border border-gray-200 px-4 py-3 dark:border-gray-700"
                >
                  <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                    {t('genericCancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleSubmitReview}
                  disabled={reviewSubmitting}
                  className="flex-1 items-center rounded-2xl bg-[#2ecc71] px-4 py-3"
                >
                  {reviewSubmitting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text className="text-sm font-semibold text-white">
                      {myReview
                        ? t('placeDetailReviewUpdate')
                        : t('placeDetailReviewSubmit')}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
      </Modal>

      <ReportReasonSheet
        visible={reportSheetVisible}
        onClose={() => setReportSheetVisible(false)}
        onSubmitReason={handleSubmitReportReason}
      />
    </View>
  );
}
