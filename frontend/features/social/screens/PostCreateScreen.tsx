import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import PostCustomAudienceModal from '@/features/social/components/PostCustomAudienceModal';
import PostVisibilityModal from '@/features/social/components/PostVisibilityModal';
import PostItem, { type PostItemData } from '@/features/social/components/PostItem';
import BottomSheetModal from '@/shared/ui/BottomSheetModal';
import MediaFrame from '@/shared/ui/MediaFrame';
import ScreenHeader from '@/shared/ui/ScreenHeader';
import api, { clearAuthState, getImageUrl, isUnauthorizedError } from '@/services/api';
import {
  buildMediaUploadPayload,
  inferMediaKind,
  isMediaFileTooLarge,
  isSupportedMediaAsset,
} from '@/services/shared/media-upload';
import { emitPostChanged } from '@/services/social/post-events';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { useI18n } from '@/shared/hooks/use-i18n';
import type { TranslationKey } from '@/services/shared/i18n';
import { getFriendshipOverview } from '@/services/user/friendships';
import { formatEventDate } from '@/services/shared/formatters';
import type { FriendshipItem } from '@/types/social';
import { getMySettings } from '@/services/user/settings';

type PostVisibility = 'public' | 'friends' | 'private' | 'custom';
type PostType = 'post' | 'plan';
type PublicationScope = 'personal' | 'structure';

const MAX_IMAGES = 5;
const MAX_CHARS = 500;

type PostMediaItem = {
  uri: string;
  assetType?: ImagePicker.ImagePickerAsset['type'];
  mimeType?: string | null;
  fileName?: string | null;
  duration?: number | null;
  fileSize?: number | null;
};

type CategoryOption = {
  id: number | string;
  name: string;
  color?: string | null;
};

type PlaceOption = {
  id: string;
  name: string;
  address?: string | null;
  City?: { name?: string | null } | null;
};

type EventOption = {
  id: string;
  title: string;
  startTime: string;
  address?: string | null;
  placeId?: string | null;
  Place?: {
    id?: string;
    name?: string | null;
    City?: { name?: string | null } | null;
  } | null;
};

type VisibilityOption = {
  id: PostVisibility;
  labelKey: TranslationKey;
  icon: keyof typeof Ionicons.glyphMap;
  descriptionKey: TranslationKey;
};

const VISIBILITY_OPTIONS: VisibilityOption[] = [
  {
    id: 'public',
    labelKey: 'postVisibilityPublicLabel',
    icon: 'globe-outline',
    descriptionKey: 'postVisibilityPublicDescription',
  },
  {
    id: 'friends',
    labelKey: 'postVisibilityFriendsLabel',
    icon: 'people-outline',
    descriptionKey: 'postVisibilityFriendsDescription',
  },
  {
    id: 'custom',
    labelKey: 'postVisibilityCustomLabel',
    icon: 'people-circle-outline',
    descriptionKey: 'postVisibilityCustomDescription',
  },
  {
    id: 'private',
    labelKey: 'postVisibilityPrivateLabel',
    icon: 'lock-closed-outline',
    descriptionKey: 'postVisibilityPrivateDescription',
  },
];

export default function CreatePostScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    postId?: string;
    content?: string;
    visibility?: PostVisibility;
    postType?: PostType;
    publicationScope?: PublicationScope;
    placeId?: string;
    eventId?: string;
    eventTitle?: string;
    placeName?: string;
    cityName?: string;
    ambiance?: string;
    images?: string;
    visibilityUserIds?: string;
  }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t, locale } = useI18n();
  const isEditing = !!params.postId;

  const parseImagesParam = (value?: string | string[]) => {
    if (!value) {
      return [];
    }
    const rawValue = Array.isArray(value) ? value[0] : value;
    try {
      const parsed = JSON.parse(String(rawValue));
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  };
  const parseIdArrayParam = (value?: string | string[]) => {
    if (!value) {
      return [];
    }
    const rawValue = Array.isArray(value) ? value[0] : value;
    try {
      const parsed = JSON.parse(String(rawValue));
      return Array.isArray(parsed)
        ? parsed.filter((item): item is string => typeof item === 'string')
        : [];
    } catch {
      return [];
    }
  };

  const [content, setContent] = useState(params.content ? String(params.content) : '');
  const [mediaItems, setMediaItems] = useState<PostMediaItem[]>(() =>
    parseImagesParam(params.images).map((uri) => ({ uri })),
  );
  const [visibility, setVisibility] = useState<PostVisibility>(
    params.visibility ||
      (params.postType === 'plan' ? 'friends' : 'public'),
  );
  const [publicationScope] = useState<PublicationScope>(
    params.publicationScope === 'structure' ? 'structure' : 'personal',
  );
  const [placeId, setPlaceId] = useState(
    params.placeId ? String(params.placeId) : '',
  );
  const [eventId, setEventId] = useState(
    params.eventId ? String(params.eventId) : '',
  );
  const [eventTitle, setEventTitle] = useState(
    params.eventTitle ? String(params.eventTitle) : '',
  );
  const [placeName, setPlaceName] = useState(
    params.placeName ? String(params.placeName) : '',
  );
  const [cityName, setCityName] = useState(
    params.cityName ? String(params.cityName) : '',
  );
  const [ambiance, setAmbiance] = useState(
    params.ambiance ? String(params.ambiance) : '',
  );
  const [selectedVisibilityUserIds, setSelectedVisibilityUserIds] = useState<string[]>(
    () => parseIdArrayParam(params.visibilityUserIds),
  );
  const [showCustomAudienceModal, setShowCustomAudienceModal] = useState(false);
  const [audienceSearch, setAudienceSearch] = useState('');
  const [audienceLoading, setAudienceLoading] = useState(false);
  const [audienceConnections, setAudienceConnections] = useState<FriendshipItem[]>([]);
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [placesLoading, setPlacesLoading] = useState(false);
  const [placeSearch, setPlaceSearch] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventSearch, setEventSearch] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [planTarget, setPlanTarget] = useState<'place' | 'event'>(
    params.eventId ? 'event' : 'place',
  );

  const handleInvalidSession = useCallback(async () => {
    await clearAuthState();
    router.replace('/');
  }, [router]);

  const visibilityOptions = useMemo(
    () =>
      VISIBILITY_OPTIONS.map((option) => ({
        ...option,
        label: t(option.labelKey),
        description: t(option.descriptionKey),
      })),
    [t],
  );
  useEffect(() => {
    if (isEditing || params.visibility) {
      return;
    }

    let isMounted = true;

    const applyDefaultVisibility = async () => {
      try {
        const settings = await getMySettings();

        if (isMounted) {
          setVisibility(settings.defaultPostVisibility);
        }
      } catch (error) {
        if (isUnauthorizedError(error)) {
          await handleInvalidSession();
          return;
        }

        // Fallback garde la valeur locale par defaut.
      }
    };

    void applyDefaultVisibility();

    return () => {
      isMounted = false;
    };
  }, [isEditing, params.visibility]);

  useEffect(() => {
    if (!showCustomAudienceModal) {
      return;
    }

    let isMounted = true;
    setAudienceLoading(true);

    const loadConnections = async () => {
      try {
        const data = await getFriendshipOverview();
        if (isMounted) {
          setAudienceConnections(data.connections || []);
        }
      } catch (error) {
        if (isUnauthorizedError(error)) {
          await handleInvalidSession();
          return;
        }

        if (isMounted) {
          setAudienceConnections([]);
        }
      } finally {
        if (isMounted) {
          setAudienceLoading(false);
        }
      }
    };

    void loadConnections();

    return () => {
      isMounted = false;
    };
  }, [showCustomAudienceModal]);


  useEffect(() => {
    let isMounted = true;

    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const response = await api.get<CategoryOption[]>('/categories');
        if (isMounted) {
          setCategories(response.data || []);
        }
      } catch (error) {
        if (isUnauthorizedError(error)) {
          await handleInvalidSession();
          return;
        }

        if (isMounted) {
          setCategories([]);
        }
      } finally {
        if (isMounted) {
          setCategoriesLoading(false);
        }
      }
    };

    void loadCategories();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!showPlanModal) {
      return;
    }

    if (placeId) {
      setSelectedPlaceId(placeId);
    }
    if (eventId) {
      setSelectedEventId(eventId);
    }

    const controller = new AbortController();

    const loadPlaces = async () => {
      setPlacesLoading(true);
      try {
        const response = await api.get<PlaceOption[]>('/places', { signal: controller.signal });
        setPlaces(response.data || []);
      } catch {
        if (!controller.signal.aborted) {
          setPlaces([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setPlacesLoading(false);
        }
      }
    };

    const loadEvents = async () => {
      setEventsLoading(true);
      try {
        const response = await api.get<{ items: EventOption[]; nextCursor: string | null; hasMore: boolean }>('/events?limit=50', { signal: controller.signal });
        setEvents(response.data.items || []);
      } catch {
        if (!controller.signal.aborted) {
          setEvents([]);
        }
      } finally {
        if (!controller.signal.aborted) {
          setEventsLoading(false);
        }
      }
    };

    void loadPlaces();
    void loadEvents();

    return () => {
      controller.abort();
    };
  }, [eventId, placeId, showPlanModal]);

  const derivedPostType: PostType = visibility === 'friends' ? 'plan' : 'post';
  const canSubmit = content.trim().length > 0 || mediaItems.length > 0;
  const visibilityLabel =
    visibilityOptions.find((option) => option.id === visibility)?.label ||
    t('postVisibilityPublicLabel');
  const visibilityBadgeLabel =
    visibility === 'custom' && selectedVisibilityUserIds.length > 0
      ? t('postVisibilityCustomBadge', { count: selectedVisibilityUserIds.length })
      : visibilityLabel;
  const visibilityIcon =
    visibilityOptions.find((option) => option.id === visibility)?.icon ||
    'globe-outline';
  const visibilityTone = useMemo(() => {
    if (visibility === 'friends') {
      return {
        column: 'bg-[#ff4757]/10 dark:bg-[#ff4757]/20',
        label: 'text-[#ff4757]',
        accent: '#ff4757',
      };
    }
    if (visibility === 'custom') {
      return {
        column: 'bg-[#f39c12]/10 dark:bg-[#f39c12]/20',
        label: 'text-[#f39c12]',
        accent: '#f39c12',
      };
    }
    if (visibility === 'private') {
      return {
        column: 'bg-gray-200/70 dark:bg-gray-800',
        label: 'text-gray-600 dark:text-gray-300',
        accent: '#9ca3af',
      };
    }
    return {
      column: 'bg-[#4c669f]/10 dark:bg-[#4c669f]/20',
      label: 'text-[#4c669f]',
      accent: '#4c669f',
    };
  }, [visibility]);
  const selectedCategoryLabel = ambiance;
  const trimmedContent = content.trim();
  const hasContextDetails = Boolean(
    ambiance || placeName.trim() || cityName.trim() || eventTitle,
  );
  const previewLocation = [placeName.trim(), cityName.trim()].filter(Boolean).join(' • ');
  const isLocalImage = (uri: string) =>
    uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://');

  function resolveMediaUri(uri: string) {
    if (!uri) {
      return uri;
    }
    if (isLocalImage(uri) || uri.startsWith('http://') || uri.startsWith('https://')) {
      return uri;
    }
    return getImageUrl(uri) || uri;
  }

  const previewPostCreatedAt = new Date().toISOString();
  const previewPost: PostItemData = {
    id: 'post-preview',
    userId: 'post-preview-user',
    content: trimmedContent || null,
    images: mediaItems.map((media) => resolveMediaUri(media.uri)),
    publicationScope,
    postType: derivedPostType,
    placeId: placeId.trim() || null,
    eventId: eventId.trim() || null,
    placeName: placeName.trim() || null,
    cityName: cityName.trim() || null,
    ambiance: ambiance || null,
    visibility,
    createdAt: previewPostCreatedAt,
    isLiked: false,
    isOwner: true,
    User: {
      displayName: t('postPreviewAuthorLabel'),
    },
    _count: {
      likes: 0,
      comments: 0,
    },
    shareCount: 0,
    Event: eventTitle.trim()
      ? {
          id: eventId.trim() || 'post-preview-event',
          title: eventTitle.trim(),
          startTime: previewPostCreatedAt,
          placeId: placeId.trim() || null,
          Place: placeName.trim() || cityName.trim()
            ? {
                id: placeId.trim() || undefined,
                name: placeName.trim() || null,
                City: cityName.trim() ? { name: cityName.trim() } : null,
              }
            : null,
        }
      : null,
    Place: placeName.trim() || cityName.trim()
      ? {
          id: placeId.trim() || undefined,
          name: placeName.trim() || null,
          City: cityName.trim() ? { name: cityName.trim() } : null,
        }
      : null,
  };
  const filteredPlaces = useMemo(() => {
    if (!placeSearch.trim()) {
      return places;
    }
    const query = placeSearch.trim().toLowerCase();
    return places.filter((place) => place.name.toLowerCase().includes(query));
  }, [placeSearch, places]);
  const filteredEvents = useMemo(() => {
    if (!eventSearch.trim()) {
      return events;
    }
    const query = eventSearch.trim().toLowerCase();
    return events.filter((eventItem) =>
      eventItem.title.toLowerCase().includes(query),
    );
  }, [eventSearch, events]);
  const filteredAudienceConnections = useMemo(() => {
    if (!audienceSearch.trim()) {
      return audienceConnections;
    }
    const query = audienceSearch.trim().toLowerCase();
    return audienceConnections.filter((item) => {
      const name =
        item.user.displayName ||
        item.user.username ||
        '';
      return name.toLowerCase().includes(query);
    });
  }, [audienceSearch, audienceConnections]);
  const selectedAudienceUsers = useMemo(() => {
    if (selectedVisibilityUserIds.length === 0) {
      return [];
    }
    const selectedSet = new Set(selectedVisibilityUserIds);
    return audienceConnections.filter((item) => selectedSet.has(item.user.id));
  }, [audienceConnections, selectedVisibilityUserIds]);

  const headerTitle = useMemo(() => {
    return isEditing ? t('postHeaderEditTitle') : t('postHeaderCreateTitle');
  }, [isEditing, t]);
  const isEditStep = currentStep === 1;
  const isPreviewStep = currentStep === 2;

  const buildUploadPayload = (media: PostMediaItem, index: number) =>
    buildMediaUploadPayload(
      {
        uri: media.uri,
        mimeType: media.mimeType ?? null,
        fileName: media.fileName ?? null,
        duration: media.duration ?? null,
        fileSize: media.fileSize ?? null,
        type: media.assetType ?? null,
      },
      index,
    );


  const pickImage = async (source: 'camera' | 'gallery') => {
    if (mediaItems.length >= MAX_IMAGES) {
      Alert.alert(
        t('postImageLimitTitle'),
        t('postImageLimitMessage', { count: MAX_IMAGES }),
      );
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images', 'videos'],
      allowsEditing: false,
      allowsMultipleSelection: source === 'gallery',
      quality: 0.7,
    };

    let result: ImagePicker.ImagePickerResult;

    if (source === 'camera') {
      await ImagePicker.requestCameraPermissionsAsync();
      result = await ImagePicker.launchCameraAsync(options);
    } else {
      result = await ImagePicker.launchImageLibraryAsync(options);
    }

    if (!result.canceled) {
      setMediaItems((currentMediaItems) => {
        if (currentMediaItems.length >= MAX_IMAGES) {
          return currentMediaItems;
        }
        const remaining = MAX_IMAGES - currentMediaItems.length;
        const pickedMedia = result.assets
          .map((asset) => ({
            uri: asset.uri,
            assetType: asset.type ?? null,
            duration: asset.duration ?? null,
            mimeType: asset.mimeType ?? null,
            fileName: asset.fileName ?? null,
            fileSize: asset.fileSize ?? null,
          }))
          .filter((asset) => Boolean(asset.uri));

        const validPickedMedia = pickedMedia.filter(
          (asset) => isSupportedMediaAsset(asset) && !isMediaFileTooLarge(asset),
        );

        if (validPickedMedia.length !== pickedMedia.length) {
          Alert.alert(t('mediaValidationTitle'), t('mediaValidationMessage'));
        }

        return [...currentMediaItems, ...validPickedMedia.slice(0, remaining)];
      });
    }
  };

  const handlePost = async () => {
    if (!canSubmit) {
      Alert.alert(t('postEmptyAlertTitle'), t('postEmptyAlertMessage'));
      return;
    }
    if (visibility === 'custom' && selectedVisibilityUserIds.length === 0) {
      Alert.alert(
        t('postVisibilityCustomRequiredTitle'),
        t('postVisibilityCustomRequiredMessage'),
      );
      setShowCustomAudienceModal(true);
      return;
    }
    const effectivePlaceId = placeId.trim();
    if (publicationScope === 'structure' && !effectivePlaceId) {
      Alert.alert(
        t('postPublicationScopeStructureRequiredTitle'),
        t('postPublicationScopeStructureRequiredMessage'),
      );
      setShowPlanModal(true);
      return;
    }

    setLoading(true);

    try {
      const effectiveVisibility =
        derivedPostType === 'plan' ? 'friends' : visibility;
      if (isEditing) {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('visibility', effectiveVisibility);
        formData.append('postType', derivedPostType);
        formData.append('publicationScope', publicationScope);
        if (visibility === 'custom') {
          formData.append(
            'visibilityUserIds',
            JSON.stringify(selectedVisibilityUserIds),
          );
        } else if (selectedVisibilityUserIds.length > 0) {
          formData.append('visibilityUserIds', JSON.stringify([]));
        }
        if (effectivePlaceId) {
          formData.append('placeId', effectivePlaceId);
        }
        if (eventId) {
          formData.append('eventId', eventId);
        }
        if (placeName.trim()) {
          formData.append('placeName', placeName.trim());
        }
        if (cityName.trim()) {
          formData.append('cityName', cityName.trim());
        }
        if (ambiance) {
          formData.append('ambiance', ambiance);
        }

        const existingMedia = mediaItems.filter((item) => !isLocalImage(item.uri));
        formData.append(
          'existingImages',
          JSON.stringify(existingMedia.map((item) => item.uri)),
        );

        mediaItems
          .filter((item) => isLocalImage(item.uri))
          .forEach((media, index) => {
            formData.append('images', buildUploadPayload(media, index) as never);
          });

        const response = await api.patch(`/posts/${params.postId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        emitPostChanged(response.data);
        Alert.alert(t('outingCreateSuccessTitle'), t('postEditSuccessMessage'));
      } else {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('visibility', effectiveVisibility);
        formData.append('postType', derivedPostType);
        formData.append('publicationScope', publicationScope);
        if (visibility === 'custom') {
          formData.append(
            'visibilityUserIds',
            JSON.stringify(selectedVisibilityUserIds),
          );
        }
        if (effectivePlaceId) {
          formData.append('placeId', effectivePlaceId);
        }
        if (eventId) {
          formData.append('eventId', eventId);
        }
        if (placeName.trim()) {
          formData.append('placeName', placeName.trim());
        }
        if (cityName.trim()) {
          formData.append('cityName', cityName.trim());
        }
        if (ambiance) {
          formData.append('ambiance', ambiance);
        }

        mediaItems.forEach((media, index) => {
          formData.append('images', buildUploadPayload(media, index) as never);
        });

        const response = await api.post('/posts', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        emitPostChanged(response.data);

        Alert.alert(t('outingCreateSuccessTitle'), t('postCreateSuccessMessage'));
      }

      router.back();
    } catch (error) {
      console.error(error);

      if (isUnauthorizedError(error)) {
        await handleInvalidSession();
        return;
      }

      Alert.alert(t('commonErrorTitle'), t('postPublishFailedMessage'));
    } finally {
      setLoading(false);
    }
  };

  const handlePrimaryAction = () => {
    if (isEditStep) {
      if (!canSubmit) {
        Alert.alert(t('postEmptyAlertTitle'), t('postEmptyAlertMessage'));
        return;
      }
      setCurrentStep(2);
      return;
    }

    void handlePost();
  };

  return (
    <View className="flex-1 bg-white pt-14 dark:bg-black">
      <View className="border-b border-gray-100 px-5 pb-2 dark:border-gray-800">
        <ScreenHeader
          title={headerTitle}
          onBack={() => {
            if (currentStep > 1) {
              setCurrentStep((step) => Math.max(1, step - 1));
              return;
            }
            router.back();
          }}
          backIcon={currentStep > 1 ? 'arrow-back' : 'close'}
          rightSlot={
            <TouchableOpacity
              onPress={handlePrimaryAction}
              disabled={(isEditStep && !canSubmit) || loading}
              className={`rounded-full px-5 py-2 ${
                isEditStep && !canSubmit
                  ? 'bg-gray-200 dark:bg-gray-800'
                  : 'bg-[#f39c12]'
              }`}
            >
              {loading ? (
                <ActivityIndicator size="small" color={canSubmit ? 'white' : 'gray'} />
              ) : (
                <Text
                  className={`font-bold ${
                    isEditStep && !canSubmit
                      ? 'text-gray-400 dark:text-gray-500'
                      : 'text-white'
                  }`}
                >
                  {isEditStep
                    ? t('postNextStep')
                    : isEditing
                    ? t('postSubmitEdit')
                    : t('postSubmitCreate')}
                </Text>
              )}
            </TouchableOpacity>
          }
        />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1 pb-20"
      >
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          {isEditStep ? (
            <>
              <TextInput
                className="min-h-[170px] px-5 pt-5 text-xl leading-7 text-gray-800 dark:text-white"
                placeholder={t('postContentPlaceholder')}
                placeholderTextColor={isDark ? '#666' : '#999'}
                multiline
                textAlignVertical="top"
                autoFocus
                value={content}
                onChangeText={setContent}
                maxLength={MAX_CHARS}
              />

              <View className="mx-5 mt-3">
                {hasContextDetails ? (
                  <View className="flex-row flex-wrap gap-2">
                    {eventTitle ? (
                      <View className="rounded-full bg-[#ff4757]/10 px-3 py-1.5">
                        <Text className="text-[11px] font-semibold text-[#ff4757]">
                          {eventTitle}
                        </Text>
                      </View>
                    ) : null}
                    {ambiance ? (
                      <View className="rounded-full bg-[#4c669f]/10 px-3 py-1.5">
                        <Text className="text-[11px] font-semibold text-[#4c669f]">
                          {ambiance}
                        </Text>
                      </View>
                    ) : null}
                    {(placeName.trim() || cityName.trim()) ? (
                      <View className="flex-row items-center rounded-full bg-[#ff4757]/10 px-3 py-1.5">
                        <Ionicons name="location-outline" size={14} color="#ff4757" />
                        <Text className="ml-1 text-[11px] font-semibold text-[#ff4757]">
                          {previewLocation}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}
              </View>

              {visibility === 'custom' ? (
                <View className="mx-5 mt-2">
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {t('postVisibilityCustomSummary', {
                      count: selectedVisibilityUserIds.length,
                    })}
                  </Text>
                  {selectedAudienceUsers.length > 0 ? (
                    <View className="mt-2 flex-row flex-wrap gap-2">
                      {selectedAudienceUsers.slice(0, 3).map((item) => (
                        <View
                          key={item.user.id}
                          className="rounded-full bg-[#f39c12]/10 px-2 py-1"
                        >
                          <Text className="text-[11px] font-semibold text-[#f39c12]">
                            {item.user.displayName || item.user.username}
                          </Text>
                        </View>
                      ))}
                      {selectedVisibilityUserIds.length > 3 ? (
                        <View className="rounded-full bg-gray-100 px-2 py-1 dark:bg-gray-800">
                          <Text className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
                            {t('postVisibilityCustomMore', {
                              count: selectedVisibilityUserIds.length - 3,
                            })}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  ) : null}
                </View>
              ) : null}

              {mediaItems.length > 0 ? (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  className="px-5"
                >
                  {mediaItems.map((media, index) => (
                    <View key={index} className="relative mr-3">
                      <MediaFrame
                        source={resolveMediaUri(media.uri)}
                        mediaType={inferMediaKind(media) ?? undefined}
                        className="w-48 rounded-2xl bg-gray-100"
                        style={{ aspectRatio: 4 / 3 }}
                        shouldPlay={inferMediaKind(media) === 'video'}
                        muted
                        loop
                        showControls={false}
                        adaptiveHeight={false}
                      />
                      <TouchableOpacity
                        onPress={() =>
                          setMediaItems((currentMediaItems) =>
                            currentMediaItems.filter((_, currentIndex) => currentIndex !== index),
                          )
                        }
                        className="absolute right-2 top-2 rounded-full bg-black/50 p-1"
                      >
                        <Ionicons name="close" size={16} color="white" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              ) : null}

              {null}
            </>
          ) : (
            <View className="mx-5 mt-6">
              <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                {t('postPreviewTitle')}
              </Text>
              <View className="mt-4">
                <PostItem
                  item={previewPost}
                  showDateColumn={false}
                  authorDisplayMode="user"
                  presentation="instagram"
                  readOnly
                />
              </View>
            </View>
          )}
        </ScrollView>

        {isEditStep ? (
          <View className="mb-5 flex-row items-center border-t border-gray-100 bg-white px-5 py-3 dark:border-gray-800 dark:bg-black">
            <TouchableOpacity
              onPress={() => void pickImage('gallery')}
              className="mr-4 rounded-full bg-gray-50 p-2 dark:bg-gray-800"
            >
              <Ionicons name="image" size={24} color="#4c669f" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void pickImage('camera')}
              className="mr-4 rounded-full bg-gray-50 p-2 dark:bg-gray-800"
            >
              <Ionicons name="camera" size={24} color="#4c669f" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowPlanModal(true)}
              className="mr-4 rounded-full bg-gray-50 p-2 dark:bg-gray-800"
            >
              <Ionicons name="location-outline" size={24} color="#4c669f" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setShowVisibilityModal(true)}
              className="mr-4 rounded-full bg-gray-50 p-2 dark:bg-gray-800"
            >
              <Ionicons name={visibilityIcon} size={22} color={visibilityTone.accent} />
            </TouchableOpacity>

            <View className="flex-1" />

            <Text
              className={`text-xs font-medium ${
                content.length >= MAX_CHARS
                  ? 'text-red-500 dark:text-red-400'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            >
              {content.length}/{MAX_CHARS}
            </Text>
          </View>
        ) : isPreviewStep ? (
          <View className="mb-5 border-t border-gray-100 bg-white px-5 py-3 dark:border-gray-800 dark:bg-black">
            <View className="flex-row items-center justify-between">
              <TouchableOpacity
                onPress={() => setCurrentStep(1)}
                className="flex-row items-center"
              >
                <Ionicons name="arrow-back" size={18} color="#4c669f" />
                <Text className="ml-2 text-sm font-semibold text-[#4c669f]">
                  {t('postBackToEdit')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : null}
      </KeyboardAvoidingView>

      <PostVisibilityModal
        visible={showVisibilityModal}
        selectedVisibility={visibility}
        options={visibilityOptions}
        selectedCustomCount={selectedVisibilityUserIds.length}
        title={t('postVisibilityModalTitle')}
        onClose={() => setShowVisibilityModal(false)}
        onSelect={(nextVisibility) => {
          setVisibility(nextVisibility);
          if (nextVisibility === 'custom') {
            setShowVisibilityModal(false);
            setShowCustomAudienceModal(true);
            return;
          }
          setShowVisibilityModal(false);
        }}
        customLabelWithCount={(label, count) =>
          t('postVisibilityCustomOptionLabel', { label, count })
        }
      />

      <PostCustomAudienceModal
        visible={showCustomAudienceModal}
        isDark={isDark}
        title={t('postVisibilityCustomTitle')}
        subtitle={t('postVisibilityCustomSubtitle')}
        searchPlaceholder={t('postVisibilityCustomSearchPlaceholder')}
        clearLabel={t('postVisibilityCustomClear')}
        confirmLabel={t('postVisibilityCustomConfirm')}
        emptyLabel={t('postVisibilityCustomEmpty')}
        searchValue={audienceSearch}
        onSearchChange={setAudienceSearch}
        loading={audienceLoading}
        filteredConnections={filteredAudienceConnections}
        selectedUserIds={selectedVisibilityUserIds}
        onToggleUser={(userId) => {
          setSelectedVisibilityUserIds((current) =>
            current.includes(userId)
              ? current.filter((id) => id !== userId)
              : [...current, userId],
          );
        }}
        onClear={() => setSelectedVisibilityUserIds([])}
        onConfirm={() => setShowCustomAudienceModal(false)}
        onClose={() => setShowCustomAudienceModal(false)}
      />

      <BottomSheetModal
        visible={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        title={t('postPlanModalTitle')}
        maxHeight={760}
        contentMode="auto"
        footer={
          <TouchableOpacity
            className="items-center rounded-xl bg-[#ff4757] px-4 py-3"
            onPress={() => setShowPlanModal(false)}
          >
            <Text className="font-semibold text-white">{t('genericClose')}</Text>
          </TouchableOpacity>
        }
      >
        <ScrollView style={{ maxHeight: 520 }} showsVerticalScrollIndicator={false}>
          <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            {t('postPlanModalTargetTitle')}
          </Text>
          <View className="mt-3 flex-row gap-3">
            <TouchableOpacity
              onPress={() => {
                setPlanTarget('place');
                setSelectedEventId(null);
                setEventId('');
                setEventTitle('');
              }}
              className={`flex-1 items-center rounded-2xl px-3 py-3 ${
                planTarget === 'place'
                  ? 'bg-[#4c669f]'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  planTarget === 'place'
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                {t('postPlanModalTargetPlace')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setPlanTarget('event');
                setSelectedPlaceId(null);
                setPlaceId('');
                setPlaceName('');
                setCityName('');
              }}
              className={`flex-1 items-center rounded-2xl px-3 py-3 ${
                planTarget === 'event'
                  ? 'bg-[#ff4757]'
                  : 'bg-gray-100 dark:bg-gray-800'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  planTarget === 'event'
                    ? 'text-white'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                {t('postPlanModalTargetEvent')}
              </Text>
            </TouchableOpacity>
          </View>

          <Text className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
            {t('postPlanModalCategoryTitle')}
          </Text>

          {categoriesLoading ? (
            <View className="mt-3">
              <ActivityIndicator color="#ff4757" />
            </View>
          ) : categories.length > 0 ? (
            <View className="mt-3 flex-row flex-wrap gap-2">
              {categories.map((category) => {
                const isSelected = category.name === ambiance;
                return (
                  <TouchableOpacity
                    key={category.id}
                    onPress={() =>
                      setAmbiance((current) =>
                        current === category.name ? '' : category.name,
                      )
                    }
                    className={`rounded-full px-3 py-2 ${
                      isSelected ? '' : 'bg-gray-100 dark:bg-gray-800'
                    }`}
                    style={
                      isSelected
                        ? { backgroundColor: category.color || '#ff4757' }
                        : undefined
                    }
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : null}

          {planTarget === 'place' ? (
            <>
              <Text className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                {t('postPlanModalPlaceTitle')}
              </Text>
              <TextInput
                value={placeSearch}
                onChangeText={setPlaceSearch}
                placeholder={t('postPlanModalSearchPlaceholder')}
                placeholderTextColor={isDark ? '#666' : '#999'}
                className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-base text-gray-800 dark:bg-gray-800 dark:text-white"
              />

              {placesLoading ? (
                <View className="mt-4">
                  <ActivityIndicator color="#4c669f" />
                </View>
              ) : filteredPlaces.length > 0 ? (
                <View className="mt-4 gap-3">
                  {filteredPlaces.map((place) => {
                    const isSelected = selectedPlaceId === place.id;
                    return (
                      <TouchableOpacity
                        key={place.id}
                        onPress={() => {
                          setSelectedPlaceId(place.id);
                          setSelectedEventId(null);
                          setEventId('');
                          setEventTitle('');
                          setPlaceId(place.id);
                          setPlaceName(place.name);
                          setCityName(place.City?.name || '');
                        }}
                        className={`rounded-2xl border px-4 py-3 ${
                          isSelected
                            ? 'border-[#4c669f] bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                        }`}
                      >
                        <Text className="text-base font-semibold text-gray-900 dark:text-white">
                          {place.name}
                        </Text>
                        <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {place.City?.name || place.address || t('homeAddressToConfirm')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  {t('postPlanModalEmptyPlaces')}
                </Text>
              )}
            </>
          ) : (
            <>
              <Text className="mt-6 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                {t('postPlanModalEventTitle')}
              </Text>
              <TextInput
                value={eventSearch}
                onChangeText={setEventSearch}
                placeholder={t('postPlanModalSearchEventPlaceholder')}
                placeholderTextColor={isDark ? '#666' : '#999'}
                className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-base text-gray-800 dark:bg-gray-800 dark:text-white"
              />

              {eventsLoading ? (
                <View className="mt-4">
                  <ActivityIndicator color="#ff4757" />
                </View>
              ) : filteredEvents.length > 0 ? (
                <View className="mt-4 gap-3">
                  {filteredEvents.map((eventItem) => {
                    const isSelected = selectedEventId === eventItem.id;
                    return (
                      <TouchableOpacity
                        key={eventItem.id}
                        onPress={() => {
                          setSelectedEventId(eventItem.id);
                          setSelectedPlaceId(null);
                          setEventId(eventItem.id);
                          setEventTitle(eventItem.title);
                          setPlaceId(eventItem.Place?.id || eventItem.placeId || '');
                          setPlaceName(eventItem.Place?.name || eventItem.address || '');
                          setCityName(eventItem.Place?.City?.name || '');
                        }}
                        className={`rounded-2xl border px-4 py-3 ${
                          isSelected
                            ? 'border-[#ff4757] bg-red-50 dark:bg-red-900/20'
                            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                        }`}
                      >
                        <Text className="text-base font-semibold text-gray-900 dark:text-white">
                          {eventItem.title}
                        </Text>
                        <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {formatEventDate(eventItem.startTime, locale)}
                        </Text>
                        <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                          {eventItem.Place?.name || eventItem.address || t('homeAddressToConfirm')}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <Text className="mt-4 text-sm text-gray-500 dark:text-gray-400">
                  {t('postPlanModalEmptyEvents')}
                </Text>
              )}
            </>
          )}

          <TouchableOpacity
            onPress={() => {
              setSelectedPlaceId(null);
              setSelectedEventId(null);
              setPlaceId('');
              setEventId('');
              setEventTitle('');
              setPlaceName('');
              setCityName('');
            }}
            className="mt-4 self-start rounded-full bg-gray-100 px-4 py-2 dark:bg-gray-800"
          >
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('postPlanModalClearPlace')}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </BottomSheetModal>
    </View>
  );
}
