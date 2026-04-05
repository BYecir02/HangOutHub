import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
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

import PostCustomAudienceModal from '@/components/post/PostCustomAudienceModal';
import PostVisibilityModal from '@/components/post/PostVisibilityModal';
import MediaFrame from '@/components/ui/MediaFrame';
import ScreenHeader from '@/components/ui/ScreenHeader';
import api, { getImageUrl } from '../services/api';
import { emitPostChanged } from '../services/post-events';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import { getFriendshipOverview } from '@/services/friendships';
import { formatEventDate } from '@/services/formatters';
import type { FriendshipItem } from '@/types/social';
import { getMySettings } from '@/services/settings';
import { clearAuthState } from '../services/api';

type PostVisibility = 'public' | 'friends' | 'private' | 'custom';
type PostType = 'post' | 'plan';
type PublicationScope = 'personal' | 'structure';

const MAX_IMAGES = 5;
const MAX_CHARS = 500;

const isUnauthorized = (error: unknown) =>
  (error as { response?: { status?: number } }).response?.status === 401;

type PostMediaItem = {
  uri: string;
  assetType?: ImagePicker.ImagePickerAsset['type'];
  duration?: number | null;
  mimeType?: string | null;
  fileName?: string | null;
};

type CategoryOption = {
  id: number;
  name: string;
  color?: string | null;
  icon?: string | null;
};

type PlaceOption = {
  id: string;
  name: string;
  address?: string | null;
  City?: {
    name?: string | null;
  } | null;
};

type EventOption = {
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
  address?: string | null;
};

const VISIBILITY_OPTIONS: {
  id: PostVisibility;
  labelKey:
    | 'postVisibilityPublicLabel'
    | 'postVisibilityFriendsLabel'
    | 'postVisibilityPrivateLabel'
    | 'postVisibilityCustomLabel';
  icon: keyof typeof Ionicons.glyphMap;
  descriptionKey:
    | 'postVisibilityPublicDescription'
    | 'postVisibilityFriendsDescription'
    | 'postVisibilityPrivateDescription'
    | 'postVisibilityCustomDescription';
}[] = [
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
        if (isUnauthorized(error)) {
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
        if (isUnauthorized(error)) {
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
        if (isUnauthorized(error)) {
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

    let isMounted = true;

    const loadPlaces = async () => {
      setPlacesLoading(true);
      try {
        const response = await api.get<PlaceOption[]>('/places');
        if (isMounted) {
          setPlaces(response.data || []);
        }
      } catch {
        if (isMounted) {
          setPlaces([]);
        }
      } finally {
        if (isMounted) {
          setPlacesLoading(false);
        }
      }
    };

    const loadEvents = async () => {
      setEventsLoading(true);
      try {
        const response = await api.get<EventOption[]>('/events');
        if (isMounted) {
          setEvents(response.data || []);
        }
      } catch {
        if (isMounted) {
          setEvents([]);
        }
      } finally {
        if (isMounted) {
          setEventsLoading(false);
        }
      }
    };

    void loadPlaces();
    void loadEvents();

    return () => {
      isMounted = false;
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
  const previewTitle = trimmedContent
    ? trimmedContent.split('\n')[0].slice(0, 72)
    : t('postPreviewEmptyTitle');
  const previewBody = trimmedContent
    ? trimmedContent
        .split('\n')
        .slice(1)
        .join('\n')
        .trim()
        .slice(0, 140)
    : '';
  const previewDate = new Date();
  const previewDay = previewDate.toLocaleDateString(locale, { day: '2-digit' });
  const previewMonth = previewDate
    .toLocaleDateString(locale, { month: 'short' })
    .toUpperCase();
  const previewTime = previewDate.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const previewLocation = [placeName.trim(), cityName.trim()]
    .filter(Boolean)
    .join(' · ');
  const hasContextDetails = Boolean(
    ambiance || placeName.trim() || cityName.trim() || eventTitle,
  );
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

  const isLocalImage = (uri: string) =>
    uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://');

  const resolveMediaUri = (uri: string) => {
    if (!uri) {
      return uri;
    }
    if (isLocalImage(uri) || uri.startsWith('http://') || uri.startsWith('https://')) {
      return uri;
    }
    return getImageUrl(uri) || uri;
  };

  const MIME_TYPE_BY_EXTENSION: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    heif: 'image/heif',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    m4v: 'video/mp4',
    webm: 'video/webm',
    '3gp': 'video/3gpp',
    mkv: 'video/x-matroska',
    avi: 'video/x-msvideo',
  };

  const EXTENSION_BY_MIME_TYPE: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/heic': 'heic',
    'image/heif': 'heif',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'video/3gpp': '3gp',
    'video/x-matroska': 'mkv',
    'video/x-msvideo': 'avi',
  };

  const VALID_MEDIA_EXTENSIONS = new Set(Object.keys(MIME_TYPE_BY_EXTENSION));

  const inferMediaKind = (media: PostMediaItem) => {
    if (media.assetType === 'video') {
      return 'video';
    }
    if (media.assetType === 'image') {
      return 'image';
    }
    if (typeof media.duration === 'number' && media.duration > 0) {
      return 'video';
    }
    const mimeType = media.mimeType?.toLowerCase();
    if (mimeType?.startsWith('video/')) {
      return 'video';
    }
    if (mimeType?.startsWith('image/')) {
      return 'image';
    }

    const normalizedName = (media.fileName || media.uri).toLowerCase();
    if (/\.(mp4|mov|m4v|3gp|webm|avi|mkv)(\?|#|$)/.test(normalizedName)) {
      return 'video';
    }
    return 'image';
  };

  const inferMediaExtension = (media: PostMediaItem) => {
    const fileName = media.fileName?.trim();
    if (fileName?.includes('.')) {
      const extension = fileName.split('.').pop()?.toLowerCase();
      if (extension && VALID_MEDIA_EXTENSIONS.has(extension)) {
        return extension;
      }
    }

    const mimeType = media.mimeType?.toLowerCase();
    if (mimeType) {
      if (EXTENSION_BY_MIME_TYPE[mimeType]) {
        return EXTENSION_BY_MIME_TYPE[mimeType];
      }
    }

    return inferMediaKind(media) === 'video' ? 'mp4' : 'jpg';
  };

  const inferMediaMimeType = (media: PostMediaItem) => {
    if (media.mimeType) {
      return media.mimeType;
    }

    const extension = inferMediaExtension(media);
    return MIME_TYPE_BY_EXTENSION[extension] || (inferMediaKind(media) === 'video' ? 'video/mp4' : 'image/jpeg');
  };

  const getUploadFileName = (media: PostMediaItem, index: number) => {
    const fileName = media.fileName?.trim();
    if (fileName?.includes('.')) {
      const extension = fileName.split('.').pop()?.toLowerCase();
      if (extension && VALID_MEDIA_EXTENSIONS.has(extension)) {
        return fileName;
      }
    }

    return `media_${index}.${inferMediaExtension(media)}`;
  };

  const buildUploadPayload = (media: PostMediaItem, index: number) => ({
    uri: media.uri,
    name: getUploadFileName(media, index),
    type: inferMediaMimeType(media),
  });


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
          }))
          .filter((asset) => Boolean(asset.uri))
          .slice(0, remaining);
        return [...currentMediaItems, ...pickedMedia];
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

      if (isUnauthorized(error)) {
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
                        mediaType={inferMediaKind(media)}
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
            <View className="mx-5 mt-6 rounded-2xl bg-white px-4 py-4 dark:bg-gray-900">
              <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                {t('postPreviewTitle')}
              </Text>
              <View className="mt-4 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800">
                <View className="flex-row">
                  <View
                    className={`w-16 items-center justify-center px-2 py-4 ${visibilityTone.column}`}
                  >
                    {visibility !== 'public' ? (
                      <Text
                        className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${visibilityTone.label}`}
                      >
                        {visibilityLabel}
                      </Text>
                    ) : null}
                    <Text className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                      {previewDay}
                    </Text>
                    <Text className="text-[10px] uppercase tracking-widest text-gray-500 dark:text-gray-300">
                      {previewMonth}
                    </Text>
                    <View className="mt-2 rounded-full bg-white/70 px-2 py-1 dark:bg-gray-900/40">
                      <Text className="text-[10px] font-semibold text-gray-600 dark:text-gray-200">
                        {previewTime}
                      </Text>
                    </View>
                  </View>
                  <View className="flex-1 px-4 py-4">
                    <Text className="text-base font-bold text-gray-900 dark:text-white">
                      {previewTitle}
                    </Text>
                    {previewBody ? (
                      <Text className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                        {previewBody}
                      </Text>
                    ) : null}
                  {previewLocation ? (
                    <View className="mt-3 flex-row items-center">
                      <Ionicons name="location-outline" size={14} color="#ff4757" />
                      <Text className="ml-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {previewLocation}
                      </Text>
                    </View>
                  ) : null}
                  {eventTitle ? (
                    <View className="mt-2 self-start rounded-full bg-[#ff4757]/10 px-2 py-1">
                      <Text className="text-[10px] font-semibold text-[#ff4757]">
                        {eventTitle}
                      </Text>
                    </View>
                  ) : null}
                  {selectedCategoryLabel ? (
                    <View className="mt-2 self-start rounded-full bg-[#4c669f]/10 px-2 py-1">
                      <Text className="text-[10px] font-semibold text-[#4c669f]">
                        {selectedCategoryLabel}
                      </Text>
                    </View>
                    ) : null}
                  </View>
                </View>
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

      <Modal
        visible={showPlanModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPlanModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowPlanModal(false)}
          className="flex-1 justify-end bg-black/50"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="rounded-t-3xl bg-white p-5 pb-6 dark:bg-gray-900"
          >
            <View className="mb-4 items-center">
              <View className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
            </View>

            <Text className="mb-4 text-center text-lg font-bold text-gray-800 dark:text-white">
              {t('postPlanModalTitle')}
            </Text>

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
                          isSelected
                            ? ''
                            : 'bg-gray-100 dark:bg-gray-800'
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

            <TouchableOpacity
              className="mt-5 items-center rounded-xl bg-[#ff4757] px-4 py-3"
              onPress={() => setShowPlanModal(false)}
            >
              <Text className="text-white font-semibold">{t('genericClose')}</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
