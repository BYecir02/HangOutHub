import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, BackHandler, Dimensions, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import Animated, { Easing, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { useI18n } from '@/shared/hooks/use-i18n';
import { useVisibleItemAutoplay } from '@/shared/hooks/useVisibleItemAutoplay';
import api, { clearAuthState, getApiErrorMessage, getImageUrl, isUnauthorizedError, storage } from '@/services/api';
import { createReport } from '@/services/social/reports';
import { getPlacePosts, type PostDetails } from '@/services/social/posts';
import { resolveStoredUserSession } from '@/services/auth/user-session';
import { getOrCreateDirectChat } from '@/services/messaging/direct-chats';
import { isVideoUrl } from '@/services/shared/media';

const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';

export type PlaceDetailTab = 'info' | 'events' | 'reviews';

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
  latitude?: number | null;
  longitude?: number | null;
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

export function usePlaceDetail(placeId?: string) {
  const router = useRouter();
  const { locale, t } = useI18n();

  const [place, setPlace] = useState<PlaceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [canSave, setCanSave] = useState(false);
  const [heroMuted, setHeroMuted] = useState(true);
  const [placePublications, setPlacePublications] = useState<PostDetails[]>([]);
  const [placePublicationsLoading, setPlacePublicationsLoading] = useState(false);
  const [placePublicationsLoaded, setPlacePublicationsLoaded] = useState(false);
  const [placePublicationsError, setPlacePublicationsError] = useState(false);
  const [placePublicationsAuthRequired, setPlacePublicationsAuthRequired] = useState(false);
  const [publicationsGridOffsetY, setPublicationsGridOffsetY] = useState(0);
  const [reviews, setReviews] = useState<PlaceReview[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(false);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [publicationsOpen, setPublicationsOpen] = useState(false);
  const publicationsScrollRef = useRef<ScrollView | null>(null);
  const placePublicationsLoadingRef = useRef(false);
  const publicationsPanelProgress = useSharedValue(0);

  const heroImage = getImageUrl(place?.coverUrl) || PLACE_PLACEHOLDER;
  const heroIsVideo = isVideoUrl(heroImage);
  const publicationsCount = placePublications.length;
  const myReview = currentUserId
    ? reviews.find((review) => review.User?.id === currentUserId)
    : undefined;
  const openingHoursLines = (place?.openingHours || '')
    .split('|')
    .map((line) => line.trim())
    .filter(Boolean);
  const gallery =
    place?.images?.length && place.images.length > 0
      ? place.images.map((image) => getImageUrl(image) || PLACE_PLACEHOLDER)
      : [heroImage];

  const placePublicationsVisibility = useVisibleItemAutoplay(
    placePublications,
    (post) => post.id,
  );

  useEffect(() => {
    setHeroMuted(true);
  }, [heroImage]);

  useEffect(() => {
    let isMounted = true;

    const handleUnauthorized = async () => {
      await clearAuthState();
      router.replace('/');
    };

    const fetchPlace = async () => {
      if (!placeId) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setPlacePublications([]);
        setPlacePublicationsLoaded(false);
        setPlacePublicationsLoading(false);
        setPlacePublicationsError(false);
        setPlacePublicationsAuthRequired(false);
        setPublicationsGridOffsetY(0);
        setPublicationsOpen(false);
      }

      try {
        const response = await api.get<PlaceDetail>(`/places/${placeId}`);
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
              savedPlacesResponse.data.some((savedPlace) => savedPlace.id === placeId),
            );
          }
        } catch (error) {
          if (isUnauthorizedError(error)) {
            await handleUnauthorized();
            return;
          }

          if (isMounted) {
            setCanSave(true);
            setIsSaved(false);
          }
        }
      } catch (error) {
        if (isUnauthorizedError(error)) {
          await handleUnauthorized();
          return;
        }

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
  }, [placeId, router]);

  useEffect(() => {
    let isMounted = true;

    const resolveUser = async () => {
      const session = await resolveStoredUserSession();
      if (!isMounted) {
        return;
      }

      setCurrentUserId(session?.id ?? null);
      setCurrentUserRole(session?.role ?? null);
    };

    void resolveUser();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchReviews = async () => {
      if (!placeId) {
        return;
      }

      setReviewsLoading(true);
      try {
        const response = await api.get<PlaceReview[]>(`/places/${placeId}/reviews`);
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
  }, [placeId]);

  const loadPlacePublications = useCallback(async () => {
    if (!place?.id || placePublicationsLoadingRef.current || placePublicationsLoaded) {
      return;
    }

    const token = await storage.getItem('userToken');
    if (!token) {
      setPlacePublicationsAuthRequired(true);
      setPlacePublicationsError(false);
      setPlacePublicationsLoading(false);
      return;
    }

    placePublicationsLoadingRef.current = true;
    setPlacePublicationsLoading(true);
    setPlacePublicationsError(false);
    setPlacePublicationsAuthRequired(false);

    try {
      const response = await getPlacePosts(place.id);
      setPlacePublications(response || []);
      setPlacePublicationsLoaded(true);
    } catch {
      setPlacePublications([]);
      setPlacePublicationsError(true);
    } finally {
      placePublicationsLoadingRef.current = false;
      setPlacePublicationsLoading(false);
    }
  }, [place?.id, placePublicationsLoaded]);

  useEffect(() => {
    if (!place?.id || placePublicationsLoaded) {
      return;
    }

    void loadPlacePublications();
  }, [loadPlacePublications, place?.id, placePublicationsLoaded]);

  const handleClosePublications = useCallback(() => {
    setPublicationsOpen(false);
  }, []);

  const handleOpenPublications = useCallback(() => {
    setPublicationsOpen(true);
    if (!placePublicationsLoaded && !placePublicationsLoading) {
      void loadPlacePublications();
    }
  }, [loadPlacePublications, placePublicationsLoaded, placePublicationsLoading]);

  useEffect(() => {
    if (!publicationsOpen) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      handleClosePublications();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, [handleClosePublications, publicationsOpen]);

  useEffect(() => {
    publicationsPanelProgress.value = withTiming(publicationsOpen ? 1 : 0, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  }, [publicationsOpen, publicationsPanelProgress]);

  const { height: screenHeight } = Dimensions.get('window');
  const publicationsPanelAStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: publicationsPanelProgress.value * screenHeight }],
  }));
  const publicationsPanelBStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (1 - publicationsPanelProgress.value) * screenHeight }],
  }));

  const toggleHeroMuted = useCallback(() => {
    setHeroMuted((value) => !value);
  }, []);

  const handleOpenCreateModal = useCallback(() => {
    if (!place) {
      return;
    }

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
  }, [place, router, t]);

  const handleOpenClaimPlace = useCallback(() => {
    if (!place) {
      return;
    }

    router.push({
      pathname: '/organizer/claim-place',
      params: {
        placeId: place.id,
      },
    });
  }, [place, router]);

  const handleToggleSave = useCallback(async () => {
    if (!place) {
      return;
    }

    if (!canSave) {
      Alert.alert(t('placeDetailLoginRequiredTitle'), t('placeDetailLoginRequiredMessage'));
      return;
    }

    if (saveLoading) {
      return;
    }

    setSaveLoading(true);

    try {
      const response = await api.post<{ saved: boolean }>(`/places/${place.id}/save`);
      setIsSaved(response.data.saved);
      Alert.alert(
        t('outingCreateSuccessTitle'),
        response.data.saved ? t('placeDetailSaveAdded') : t('placeDetailSaveRemoved'),
      );
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await clearAuthState();
        router.replace('/');
        return;
      }

      Alert.alert(t('commonErrorTitle'), t('placeDetailSaveUpdateFailed'));
    } finally {
      setSaveLoading(false);
    }
  }, [canSave, place, router, saveLoading, t]);

  const handleContactPlace = useCallback(async () => {
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
  }, [place?.Owner?.id, router, t]);

  const handleSubmitReportReason = useCallback(
    async (reason: string) => {
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
    },
    [place, t],
  );

  const submitReview = useCallback(
    async (rating: number, comment: string) => {
      if (!place) {
        return false;
      }

      const token = await storage.getItem('userToken');
      if (!token) {
        Alert.alert(t('placeDetailReviewLoginTitle'), t('placeDetailReviewLoginMessage'));
        return false;
      }

      if (rating < 1) {
        Alert.alert(t('commonErrorTitle'), t('placeDetailReviewRatingRequired'));
        return false;
      }

      setReviewSubmitting(true);
      try {
        await api.post(`/places/${place.id}/reviews`, {
          rating,
          comment: comment.trim() || undefined,
        });

        const [updatedPlace, updatedReviews] = await Promise.all([
          api.get<PlaceDetail>(`/places/${place.id}`),
          api.get<PlaceReview[]>(`/places/${place.id}/reviews`),
        ]);

        setPlace(updatedPlace.data);
        setReviews(updatedReviews.data || []);
        Alert.alert(t('placeDetailReviewSuccessTitle'), t('placeDetailReviewSuccessMessage'));
        return true;
      } catch (error) {
        if (isUnauthorizedError(error)) {
          await clearAuthState();
          router.replace('/');
          return false;
        }

        Alert.alert(t('commonErrorTitle'), t('placeDetailReviewFailed'));
        return false;
      } finally {
        setReviewSubmitting(false);
      }
    },
    [place, router, t],
  );

  return {
    t,
    locale,
    place,
    loading,
    saveLoading,
    isSaved,
    canSave,
    heroMuted,
    toggleHeroMuted,
    heroImage,
    heroIsVideo,
    publicationsOpen,
    placePublications,
    placePublicationsLoading,
    placePublicationsLoaded,
    placePublicationsError,
    placePublicationsAuthRequired,
    publicationsGridOffsetY,
    setPublicationsGridOffsetY,
    reviews,
    reviewsLoading,
    reviewSubmitting,
    currentUserId,
    currentUserRole,
    canClaimPlace:
      currentUserRole === 'PLACE_OWNER' || currentUserRole === 'ADMIN',
    myReview,
    gallery,
    openingHoursLines,
    publicationsCount,
    publicationsScrollRef,
    placePublicationsVisibility,
    publicationsPanelAStyle,
    publicationsPanelBStyle,
    screenHeight,
    loadPlacePublications,
    handleOpenPublications,
    handleClosePublications,
    handleOpenCreateModal,
    handleOpenClaimPlace,
    handleToggleSave,
    handleContactPlace,
    handleSubmitReportReason,
    submitReview,
  };
}
