import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
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

import api, { getImageUrl } from '../services/api';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import { getMySettings } from '@/services/settings';

type PostVisibility = 'public' | 'friends' | 'private';
type PostType = 'post' | 'plan';

const MAX_IMAGES = 5;
const MAX_CHARS = 500;
const AMBIANCE_OPTIONS: {
  id: string;
  labelKey:
    | 'postAmbianceChill'
    | 'postAmbianceFestif'
    | 'postAmbianceFood'
    | 'postAmbianceAfterwork'
    | 'postAmbianceSport';
}[] = [
  { id: 'chill', labelKey: 'postAmbianceChill' },
  { id: 'festif', labelKey: 'postAmbianceFestif' },
  { id: 'food', labelKey: 'postAmbianceFood' },
  { id: 'afterwork', labelKey: 'postAmbianceAfterwork' },
  { id: 'sport', labelKey: 'postAmbianceSport' },
];

const VISIBILITY_OPTIONS: {
  id: PostVisibility;
  labelKey:
    | 'postVisibilityPublicLabel'
    | 'postVisibilityFriendsLabel'
    | 'postVisibilityPrivateLabel';
  icon: keyof typeof Ionicons.glyphMap;
  descriptionKey:
    | 'postVisibilityPublicDescription'
    | 'postVisibilityFriendsDescription'
    | 'postVisibilityPrivateDescription';
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
    placeName?: string;
    cityName?: string;
    ambiance?: string;
    images?: string;
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

  const [content, setContent] = useState(params.content ? String(params.content) : '');
  const [images, setImages] = useState<string[]>(() => parseImagesParam(params.images));
  const [visibility, setVisibility] = useState<PostVisibility>(
    params.visibility || 'public',
  );
  const [postType, setPostType] = useState<PostType>(
    params.postType === 'plan' ? 'plan' : 'post',
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
  const [showVisibilityModal, setShowVisibilityModal] = useState(false);
  const [loading, setLoading] = useState(false);

  const visibilityOptions = useMemo(
    () =>
      VISIBILITY_OPTIONS.map((option) => ({
        ...option,
        label: t(option.labelKey),
        description: t(option.descriptionKey),
      })),
    [t],
  );
  const ambianceOptions = useMemo(
    () =>
      AMBIANCE_OPTIONS.map((option) => ({
        ...option,
        label: t(option.labelKey),
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
      } catch {
        // Fallback garde la valeur locale par defaut.
      }
    };

    void applyDefaultVisibility();

    return () => {
      isMounted = false;
    };
  }, [isEditing, params.visibility]);

  const canSubmit = content.trim().length > 0 || images.length > 0;
  const visibilityLabel =
    visibilityOptions.find((option) => option.id === visibility)?.label ||
    t('postVisibilityPublicLabel');
  const selectedAmbianceLabel =
    ambianceOptions.find((option) => option.id === ambiance)?.label || '';
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

  const headerTitle = useMemo(() => {
    return isEditing ? t('postHeaderEditTitle') : t('postHeaderCreateTitle');
  }, [isEditing, t]);

  const isLocalImage = (uri: string) =>
    uri.startsWith('file://') || uri.startsWith('content://') || uri.startsWith('ph://');

  const resolveImageUri = (uri: string) => {
    if (!uri) {
      return uri;
    }
    if (isLocalImage(uri) || uri.startsWith('http://') || uri.startsWith('https://')) {
      return uri;
    }
    return getImageUrl(uri) || uri;
  };

  const pickImage = async (source: 'camera' | 'gallery') => {
    if (images.length >= MAX_IMAGES) {
      Alert.alert(
        t('postImageLimitTitle'),
        t('postImageLimitMessage', { count: MAX_IMAGES }),
      );
      return;
    }

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: 'images',
      allowsEditing: true,
      aspect: [4, 3],
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
      setImages((currentImages) => {
        if (currentImages.length >= MAX_IMAGES) {
          return currentImages;
        }
        return [...currentImages, result.assets[0].uri];
      });
    }
  };

  const handlePost = async () => {
    if (!canSubmit) {
      Alert.alert(t('postEmptyAlertTitle'), t('postEmptyAlertMessage'));
      return;
    }

    setLoading(true);

    try {
      if (isEditing) {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('visibility', visibility);
        formData.append('postType', postType);
        if (postType === 'plan') {
          if (placeName.trim()) {
            formData.append('placeName', placeName.trim());
          }
          if (cityName.trim()) {
            formData.append('cityName', cityName.trim());
          }
          if (ambiance) {
            formData.append('ambiance', ambiance);
          }
        }

        const existingImages = images.filter((uri) => !isLocalImage(uri));
        formData.append('existingImages', JSON.stringify(existingImages));

        images
          .filter((uri) => isLocalImage(uri))
          .forEach((uri, index) => {
            formData.append('images', {
              uri,
              name: `image_${index}.jpg`,
              type: 'image/jpeg',
            } as never);
          });

        await api.patch(`/posts/${params.postId}`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        Alert.alert(t('outingCreateSuccessTitle'), t('postEditSuccessMessage'));
      } else {
        const formData = new FormData();
        formData.append('content', content);
        formData.append('visibility', visibility);
        formData.append('postType', postType);
        if (postType === 'plan') {
          if (placeName.trim()) {
            formData.append('placeName', placeName.trim());
          }
          if (cityName.trim()) {
            formData.append('cityName', cityName.trim());
          }
          if (ambiance) {
            formData.append('ambiance', ambiance);
          }
        }

        images.forEach((uri, index) => {
          formData.append('images', {
            uri,
            name: `image_${index}.jpg`,
            type: 'image/jpeg',
          } as never);
        });

        await api.post('/posts', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });

        Alert.alert(t('outingCreateSuccessTitle'), t('postCreateSuccessMessage'));
      }

      router.back();
    } catch (error) {
      console.error(error);
      Alert.alert(t('commonErrorTitle'), t('postPublishFailedMessage'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white pt-14 dark:bg-black">
      <View className="flex-row items-center justify-between border-b border-gray-100 px-5 pb-2 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2">
          <Ionicons name="close" size={28} color={isDark ? '#fff' : '#333'} />
        </TouchableOpacity>

        <View className="items-center">
          <Text className="text-lg font-semibold text-gray-900 dark:text-white">
            {headerTitle}
          </Text>
        </View>

        <TouchableOpacity
          onPress={handlePost}
          disabled={!canSubmit || loading}
          className={`rounded-full px-5 py-2 ${
            canSubmit ? 'bg-[#f39c12]' : 'bg-gray-200 dark:bg-gray-800'
          }`}
        >
          {loading ? (
            <ActivityIndicator size="small" color={canSubmit ? 'white' : 'gray'} />
          ) : (
            <Text
              className={`font-bold ${
                canSubmit ? 'text-white' : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {isEditing ? t('postSubmitEdit') : t('postSubmitCreate')}
            </Text>
          )}
        </TouchableOpacity>
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

          <View className="mx-5 mt-4 rounded-2xl bg-gray-50 px-4 py-4 dark:bg-gray-900">
            <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
              {t('postTypeSectionTitle')}
            </Text>
            <View className="mt-3 flex-row gap-3">
              <TouchableOpacity
                onPress={() => setPostType('plan')}
                className={`flex-1 items-center rounded-2xl px-3 py-3 ${
                  postType === 'plan'
                    ? 'bg-[#ff4757]'
                    : 'bg-white dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    postType === 'plan'
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {t('postTypePlanLabel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setPostType('post')}
                className={`flex-1 items-center rounded-2xl px-3 py-3 ${
                  postType === 'post'
                    ? 'bg-[#4c669f]'
                    : 'bg-white dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`text-sm font-semibold ${
                    postType === 'post'
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {t('postTypePostLabel')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {postType === 'plan' ? (
            <View className="mx-5 mt-4 rounded-2xl bg-white px-4 py-4 dark:bg-gray-900">
              <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                {t('postPlanSectionTitle')}
              </Text>
              <TextInput
                placeholder={t('postPlacePlaceholder')}
                placeholderTextColor={isDark ? '#666' : '#999'}
                className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-base text-gray-800 dark:bg-gray-800 dark:text-white"
                value={placeName}
                onChangeText={setPlaceName}
              />
              <TextInput
                placeholder={t('postCityPlaceholder')}
                placeholderTextColor={isDark ? '#666' : '#999'}
                className="mt-3 rounded-xl bg-gray-50 px-4 py-3 text-base text-gray-800 dark:bg-gray-800 dark:text-white"
                value={cityName}
                onChangeText={setCityName}
              />

              <Text className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                {t('postAmbianceLabel')}
              </Text>
              <View className="mt-3 flex-row flex-wrap gap-2">
                {ambianceOptions.map((option) => {
                  const isSelected = option.id === ambiance;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() =>
                        setAmbiance((current) =>
                          current === option.id ? '' : option.id,
                        )
                      }
                      className={`rounded-full px-3 py-2 ${
                        isSelected
                          ? 'bg-[#ff4757]'
                          : 'bg-gray-100 dark:bg-gray-800'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          ) : null}

          {images.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              className="px-5"
            >
              {images.map((uri, index) => (
                <View key={index} className="relative mr-3">
                  <Image
                    source={{ uri: resolveImageUri(uri) }}
                    className="h-40 w-40 rounded-2xl bg-gray-100"
                    resizeMode="cover"
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setImages((currentImages) =>
                        currentImages.filter((_, currentIndex) => currentIndex !== index),
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

          <View className="mx-5 mt-5 rounded-2xl bg-gray-50 px-4 py-4 dark:bg-gray-900">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
                {t('postVisibilitySection')}
              </Text>
              <TouchableOpacity
                onPress={() => setShowVisibilityModal(true)}
                className="flex-row items-center rounded-full bg-white px-3 py-2 dark:bg-gray-800"
              >
                <Text className="mr-1 text-sm font-semibold text-[#4c669f]">
                  {visibilityLabel}
                </Text>
                <Ionicons name="chevron-down" size={14} color="#4c669f" />
              </TouchableOpacity>
            </View>

            <Text className="mt-3 text-sm leading-6 text-gray-500 dark:text-gray-400">
              {isEditing
                ? t('postEditHint')
                : t('postCreateHint')}
            </Text>
          </View>

          <View className="mx-5 mt-6 rounded-2xl bg-white px-4 py-4 dark:bg-gray-900">
            <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-400 dark:text-gray-500">
              {t('postPreviewTitle')}
            </Text>
            <View className="mt-4 overflow-hidden rounded-2xl border border-gray-100 dark:border-gray-800">
              <View className="flex-row">
                <View className="w-16 items-center justify-center bg-[#ff4757]/10 px-2 py-4 dark:bg-[#ff4757]/20">
                  <Text className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[#ff4757]">
                    {postType === 'plan'
                      ? t('postTypePlanLabel')
                      : t('postTypePostLabel')}
                  </Text>
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
                  {postType === 'plan' && previewLocation ? (
                    <View className="mt-3 flex-row items-center">
                      <Ionicons name="location-outline" size={14} color="#ff4757" />
                      <Text className="ml-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                        {previewLocation}
                      </Text>
                    </View>
                  ) : null}
                  {postType === 'plan' && selectedAmbianceLabel ? (
                    <View className="mt-2 self-start rounded-full bg-[#4c669f]/10 px-2 py-1">
                      <Text className="text-[10px] font-semibold text-[#4c669f]">
                        {selectedAmbianceLabel}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>
          </View>
        </ScrollView>

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
      </KeyboardAvoidingView>

      <Modal
        visible={showVisibilityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowVisibilityModal(false)}
      >
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShowVisibilityModal(false)}
          className="flex-1 justify-end bg-black/50"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="rounded-t-3xl bg-white p-5 pb-10 dark:bg-gray-900"
          >
            <View className="mb-4 items-center">
              <View className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
            </View>

            <Text className="mb-6 text-center text-lg font-bold text-gray-800 dark:text-white">
              {t('postVisibilityModalTitle')}
            </Text>

            {visibilityOptions.map((option) => (
              <TouchableOpacity
                key={option.id}
                onPress={() => {
                  setVisibility(option.id);
                  setShowVisibilityModal(false);
                }}
                className="flex-row items-center border-b border-gray-100 p-4 dark:border-gray-800"
              >
                <View
                  className={`mr-4 rounded-full p-3 ${
                    visibility === option.id
                      ? 'bg-blue-50 dark:bg-blue-900/30'
                      : 'bg-gray-100 dark:bg-gray-800'
                  }`}
                >
                  <Ionicons
                    name={option.icon}
                    size={24}
                    color={visibility === option.id ? '#4c669f' : 'gray'}
                  />
                </View>
                <View className="flex-1">
                  <Text
                    className={`text-base font-bold ${
                      visibility === option.id
                        ? 'text-[#4c669f]'
                        : 'text-gray-800 dark:text-white'
                    }`}
                  >
                    {option.label}
                  </Text>
                  <Text className="mt-0.5 text-xs text-gray-500">
                    {option.description}
                  </Text>
                </View>
                {visibility === option.id ? (
                  <Ionicons
                    name="checkmark-circle"
                    size={24}
                    color="#4c669f"
                  />
                ) : null}
              </TouchableOpacity>
            ))}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
