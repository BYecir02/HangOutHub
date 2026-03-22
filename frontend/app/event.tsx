import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as SecureStore from 'expo-secure-store';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import api from '../services/api';

interface OwnedPlaceOption {
  id: string;
  name: string;
  address?: string | null;
}

interface CategoryTagOption {
  id: number;
  name: string;
}

interface CategoryOption {
  id: number;
  name: string;
  color?: string;
  icon?: string;
  Tag?: CategoryTagOption[];
}

interface DraftTicketType {
  id: string;
  name: string;
  price: string;
  quantity: string;
}

interface EventDraftPayload {
  title: string;
  description: string;
  cancellationPolicy: string;
  refundPolicy: string;
  startTime: string;
  endTime: string;
  checkInOpensAtOffsetMin: string;
  checkInClosesAtOffsetMin: string;
  maxTicketsPerUser: string;
  promoCode: string;
  promoType: 'PERCENT' | 'FIXED';
  promoValue: string;
  promoMaxRedemptions: string;
  promoEndsAt: string;
  selectedPlaceId: string | null;
  selectedCategoryId: number | null;
  selectedTagIds: number[];
  ticketTypes: DraftTicketType[];
  images: Array<{
    uri: string;
    fileName?: string;
    mimeType?: string;
  }>;
  coverIndex: number;
}

const EVENT_DRAFT_KEY = 'create-event-draft-v1';
const AUTO_SAVE_INTERVAL_MS = 15000;

export default function CreateEventScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { locale, t } = useI18n();
  const isDark = colorScheme === 'dark';
  const [loading, setLoading] = useState(false);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [ownedPlaces, setOwnedPlaces] = useState<OwnedPlaceOption[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    cancellationPolicy: '',
    refundPolicy: '',
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600000),
    checkInOpensAtOffsetMin: '-60',
    checkInClosesAtOffsetMin: '180',
    maxTicketsPerUser: '1',
    promoCode: '',
    promoType: 'PERCENT' as 'PERCENT' | 'FIXED',
    promoValue: '',
    promoMaxRedemptions: '',
    promoEndsAt: '',
  });
  const [ticketTypes, setTicketTypes] = useState<DraftTicketType[]>([
    {
      id: `ticket-${Date.now()}`,
      name: 'Standard',
      price: '0',
      quantity: '100',
    },
  ]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [currentField, setCurrentField] = useState<'start' | 'end'>('start');
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const lastSavedDraftRef = useRef<string | null>(null);

  const buildDraftPayload = (): EventDraftPayload => ({
    title: eventForm.title,
    description: eventForm.description,
    cancellationPolicy: eventForm.cancellationPolicy,
    refundPolicy: eventForm.refundPolicy,
    startTime: eventForm.startTime.toISOString(),
    endTime: eventForm.endTime.toISOString(),
    checkInOpensAtOffsetMin: eventForm.checkInOpensAtOffsetMin,
    checkInClosesAtOffsetMin: eventForm.checkInClosesAtOffsetMin,
    maxTicketsPerUser: eventForm.maxTicketsPerUser,
    promoCode: eventForm.promoCode,
    promoType: eventForm.promoType,
    promoValue: eventForm.promoValue,
    promoMaxRedemptions: eventForm.promoMaxRedemptions,
    promoEndsAt: eventForm.promoEndsAt,
    selectedPlaceId,
    selectedCategoryId,
    selectedTagIds,
    ticketTypes,
    images: images.map((item) => ({
      uri: item.uri,
      fileName: item.fileName || undefined,
      mimeType: item.mimeType || undefined,
    })),
    coverIndex,
  });

  const serializedDraft = useMemo(() => {
    return JSON.stringify(buildDraftPayload());
  }, [
    eventForm,
    selectedPlaceId,
    selectedCategoryId,
    selectedTagIds,
    ticketTypes,
    images,
    coverIndex,
  ]);

  const applyDraft = (
    draft: EventDraftPayload,
    availablePlaces: OwnedPlaceOption[],
    availableCategories: CategoryOption[],
  ) => {
    setEventForm({
      title: draft.title || '',
      description: draft.description || '',
      cancellationPolicy: draft.cancellationPolicy || '',
      refundPolicy: draft.refundPolicy || '',
      startTime: draft.startTime ? new Date(draft.startTime) : new Date(),
      endTime: draft.endTime ? new Date(draft.endTime) : new Date(Date.now() + 3600000),
      checkInOpensAtOffsetMin: draft.checkInOpensAtOffsetMin || '-60',
      checkInClosesAtOffsetMin: draft.checkInClosesAtOffsetMin || '180',
      maxTicketsPerUser: draft.maxTicketsPerUser || '1',
      promoCode: draft.promoCode || '',
      promoType: draft.promoType || 'PERCENT',
      promoValue: draft.promoValue || '',
      promoMaxRedemptions: draft.promoMaxRedemptions || '',
      promoEndsAt: draft.promoEndsAt || '',
    });

    const hasPlace = availablePlaces.some((place) => place.id === draft.selectedPlaceId);
    setSelectedPlaceId(hasPlace ? draft.selectedPlaceId : availablePlaces[0]?.id || null);

    const hasCategory = availableCategories.some(
      (category) => category.id === draft.selectedCategoryId,
    );
    const fallbackCategoryId = availableCategories[0]?.id || null;
    const nextCategoryId = hasCategory ? draft.selectedCategoryId : fallbackCategoryId;
    setSelectedCategoryId(nextCategoryId);

    const allowedTagIds = new Set(
      (availableCategories.find((category) => category.id === nextCategoryId)?.Tag || []).map(
        (tag) => tag.id,
      ),
    );
    setSelectedTagIds((draft.selectedTagIds || []).filter((tagId) => allowedTagIds.has(tagId)));

    setTicketTypes(
      draft.ticketTypes && draft.ticketTypes.length > 0
        ? draft.ticketTypes
        : [
            {
              id: `ticket-${Date.now()}`,
              name: 'Standard',
              price: '0',
              quantity: '100',
            },
          ],
    );

    const nextImages = (draft.images || []).map((item) => ({
      uri: item.uri,
      fileName: item.fileName,
      mimeType: item.mimeType,
      width: 0,
      height: 0,
      type: 'image' as const,
    }));

    setImages(nextImages);

    if (nextImages.length === 0) {
      setCoverIndex(0);
    } else {
      const normalizedCoverIndex = Math.max(
        0,
        Math.min(draft.coverIndex || 0, nextImages.length - 1),
      );
      setCoverIndex(normalizedCoverIndex);
    }
  };

  const handleSaveDraft = async (options?: { silent?: boolean }) => {
    const payload = buildDraftPayload();

    try {
      await SecureStore.setItemAsync(EVENT_DRAFT_KEY, JSON.stringify(payload));
      lastSavedDraftRef.current = JSON.stringify(payload);
      setHasUnsavedChanges(false);
      if (!options?.silent) {
        Alert.alert(t('createEventDraftSavedTitle'), t('createEventDraftSavedMessage'));
      }
    } catch {
      if (!options?.silent) {
        Alert.alert(t('commonErrorTitle'), t('createEventDraftSaveFailed'));
      }
    }
  };

  const handleExitPress = () => {
    if (loading || !hasUnsavedChanges) {
      router.back();
      return;
    }

    Alert.alert(t('createEventUnsavedExitTitle'), t('createEventUnsavedExitMessage'), [
      {
        text: t('genericCancel'),
        style: 'cancel',
      },
      {
        text: t('createEventUnsavedExitDiscardAction'),
        style: 'destructive',
        onPress: () => router.back(),
      },
      {
        text: t('createEventUnsavedExitSaveAction'),
        onPress: () => {
          void (async () => {
            await handleSaveDraft({ silent: true });
            router.back();
          })();
        },
      },
    ]);
  };

  useEffect(() => {
    let isMounted = true;

    const fetchOwnedPlaces = async () => {
      try {
        const [userResponse, categoriesResponse] = await Promise.all([
          api.get('/users/me'),
          api.get<CategoryOption[]>('/categories'),
        ]);

        const places = userResponse.data?.OwnedPlaces || [];
        const fetchedCategories = categoriesResponse.data || [];

        if (isMounted) {
          setOwnedPlaces(places);
          setCategories(fetchedCategories);
          setSelectedPlaceId((current) => current || places[0]?.id || null);
          setSelectedCategoryId((current) => current || fetchedCategories[0]?.id || null);

          const rawDraft = await SecureStore.getItemAsync(EVENT_DRAFT_KEY);
          if (rawDraft) {
            Alert.alert(
              t('createEventDraftRestoreTitle'),
              t('createEventDraftRestoreMessage'),
              [
                {
                  text: t('genericCancel'),
                  style: 'cancel',
                },
                {
                  text: t('createEventDraftRestoreAction'),
                  onPress: () => {
                    try {
                      const parsed = JSON.parse(rawDraft) as EventDraftPayload;
                      applyDraft(parsed, places, fetchedCategories);
                      lastSavedDraftRef.current = JSON.stringify(parsed);
                      setHasUnsavedChanges(false);
                    } catch {
                      Alert.alert(t('commonErrorTitle'), t('createEventDraftRestoreFailed'));
                    }
                  },
                },
              ],
            );
          }
        }
      } catch {
        if (isMounted) {
          setOwnedPlaces([]);
          setCategories([]);
          setSelectedPlaceId(null);
          setSelectedCategoryId(null);
        }
      } finally {
        if (isMounted) {
          setPlacesLoading(false);
          setCategoriesLoading(false);

          if (lastSavedDraftRef.current === null) {
            lastSavedDraftRef.current = serializedDraft;
            setHasUnsavedChanges(false);
          }
        }
      }
    };

    void fetchOwnedPlaces();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (lastSavedDraftRef.current === null) {
      return;
    }

    setHasUnsavedChanges(serializedDraft !== lastSavedDraftRef.current);
  }, [serializedDraft]);

  useEffect(() => {
    if (!hasUnsavedChanges || loading) {
      return;
    }

    const timer = setInterval(() => {
      void handleSaveDraft({ silent: true });
    }, AUTO_SAVE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [hasUnsavedChanges, loading, serializedDraft]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      selectionLimit: 5,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      setImages((current) => [...current, ...result.assets]);
    }
  };

  const showDatepicker = (field: 'start' | 'end', mode: 'date' | 'time') => {
    setCurrentField(field);
    setPickerMode(mode);
    setShowPicker(true);
  };

  const onDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (!selectedDate) {
      return;
    }

    if (currentField === 'start') {
      setEventForm((prev) => ({ ...prev, startTime: selectedDate }));
      if (selectedDate > eventForm.endTime) {
        setEventForm((prev) => ({ ...prev, endTime: selectedDate }));
      }
      return;
    }

    setEventForm((prev) => ({ ...prev, endTime: selectedDate }));
  };

  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId,
  );
  const availableTags = selectedCategory?.Tag || [];

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    );
  };

  const validateEventForm = () => {
    if (!eventForm.title.trim()) {
      Alert.alert(t('commonErrorTitle'), t('createEventTitleRequired'));
      return null;
    }

    if (images.length === 0) {
      Alert.alert(t('commonErrorTitle'), t('createEventCoverRequired'));
      return null;
    }

    if (eventForm.endTime < eventForm.startTime) {
      Alert.alert(t('commonErrorTitle'), t('createEventEndAfterStart'));
      return null;
    }

    const invalidTicket = ticketTypes.find((ticketType) => {
      const price = Number(ticketType.price || 0);
      const quantity = Number(ticketType.quantity || 0);

      return (
        !ticketType.name.trim() ||
        !Number.isFinite(price) ||
        price < 0 ||
        !Number.isInteger(quantity) ||
        quantity <= 0
      );
    });

    if (invalidTicket) {
      Alert.alert(t('commonErrorTitle'), t('createEventTicketTypeInvalid'));
      return null;
    }

    const serializedTicketTypes = ticketTypes.map((ticketType) => ({
      name: ticketType.name.trim(),
      price: Number(ticketType.price || 0),
      quantity: Number(ticketType.quantity || 0),
    }));

    const checkInOpensAtOffsetMin = Number(eventForm.checkInOpensAtOffsetMin || -60);
    const checkInClosesAtOffsetMin = Number(
      eventForm.checkInClosesAtOffsetMin || 180,
    );

    if (
      !Number.isInteger(checkInOpensAtOffsetMin) ||
      !Number.isInteger(checkInClosesAtOffsetMin) ||
      checkInClosesAtOffsetMin <= checkInOpensAtOffsetMin
    ) {
      Alert.alert(t('commonErrorTitle'), t('createEventCheckInWindowInvalid'));
      return null;
    }

    const maxTicketsPerUser = Number(eventForm.maxTicketsPerUser || 1);
    if (!Number.isInteger(maxTicketsPerUser) || maxTicketsPerUser < 1 || maxTicketsPerUser > 20) {
      Alert.alert(t('commonErrorTitle'), t('createEventMaxTicketsPerUserInvalid'));
      return null;
    }

    const normalizedPromoCode = eventForm.promoCode.trim().toUpperCase();
    let promoValue: number | null = null;
    let promoMaxRedemptions: number | null = null;
    let promoEndsAtIso: string | null = null;

    if (normalizedPromoCode) {
      promoValue = Number(eventForm.promoValue || 0);
      if (!Number.isFinite(promoValue) || promoValue <= 0) {
        Alert.alert(t('commonErrorTitle'), t('createEventPromoValueInvalid'));
        return null;
      }

      if (eventForm.promoType === 'PERCENT' && promoValue > 100) {
        Alert.alert(t('commonErrorTitle'), t('createEventPromoValuePercentInvalid'));
        return null;
      }

      if (eventForm.promoMaxRedemptions.trim()) {
        promoMaxRedemptions = Number(eventForm.promoMaxRedemptions);
        if (!Number.isInteger(promoMaxRedemptions) || promoMaxRedemptions < 1) {
          Alert.alert(t('commonErrorTitle'), t('createEventPromoQuotaInvalid'));
          return null;
        }
      }

      if (eventForm.promoEndsAt.trim()) {
        const parsedPromoEnd = new Date(eventForm.promoEndsAt);
        if (Number.isNaN(parsedPromoEnd.getTime())) {
          Alert.alert(t('commonErrorTitle'), t('createEventPromoEndDateInvalid'));
          return null;
        }
        promoEndsAtIso = parsedPromoEnd.toISOString();
      }
    }

    return {
      serializedTicketTypes,
      checkInOpensAtOffsetMin,
      checkInClosesAtOffsetMin,
      maxTicketsPerUser,
      normalizedPromoCode,
      promoValue,
      promoMaxRedemptions,
      promoEndsAtIso,
    };
  };

  const openPreview = () => {
    const validated = validateEventForm();
    if (!validated) {
      return;
    }

    setPreviewVisible(true);
  };

  const handleCreateEvent = async () => {
    const validated = validateEventForm();
    if (!validated) {
      return;
    }

    const {
      serializedTicketTypes,
      checkInOpensAtOffsetMin,
      checkInClosesAtOffsetMin,
      maxTicketsPerUser,
      normalizedPromoCode,
      promoValue,
      promoMaxRedemptions,
      promoEndsAtIso,
    } = validated;

    const minimumPrice = serializedTicketTypes.length > 0
      ? Math.min(...serializedTicketTypes.map((ticketType) => ticketType.price))
      : 0;

    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', eventForm.title.trim());
      formData.append('description', eventForm.description.trim());
      formData.append('cancellationPolicy', eventForm.cancellationPolicy.trim());
      formData.append('refundPolicy', eventForm.refundPolicy.trim());
      formData.append('startTime', eventForm.startTime.toISOString());
      formData.append('endTime', eventForm.endTime.toISOString());
      formData.append('entryFee', String(minimumPrice));
      formData.append('ticketTypes', JSON.stringify(serializedTicketTypes));
      formData.append('tagIds', JSON.stringify(selectedTagIds));
      formData.append(
        'checkInOpensAtOffsetMin',
        String(checkInOpensAtOffsetMin),
      );
      formData.append(
        'checkInClosesAtOffsetMin',
        String(checkInClosesAtOffsetMin),
      );
      formData.append('maxTicketsPerUser', String(maxTicketsPerUser));

      if (normalizedPromoCode) {
        formData.append('promoCode', normalizedPromoCode);
        formData.append('promoType', eventForm.promoType);
        formData.append('promoValue', String(promoValue || 0));

        if (promoMaxRedemptions !== null) {
          formData.append('promoMaxRedemptions', String(promoMaxRedemptions));
        }

        if (promoEndsAtIso) {
          formData.append('promoEndsAt', promoEndsAtIso);
        }
      }

      if (selectedPlaceId) {
        formData.append('placeId', selectedPlaceId);
      }

      if (images.length > 0) {
        const coverImage = images[coverIndex];
        formData.append('cover', {
          uri: coverImage.uri,
          name: coverImage.fileName || 'event-cover.jpg',
          type: coverImage.mimeType || 'image/jpeg',
        } as any);

        images.forEach((img, index) => {
          if (index !== coverIndex) {
            formData.append('gallery', {
              uri: img.uri,
              name: img.fileName || `gallery-${index}.jpg`,
              type: img.mimeType || 'image/jpeg',
            } as any);
          }
        });
      }

      const response = await api.post('/events', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await SecureStore.deleteItemAsync(EVENT_DRAFT_KEY);
      lastSavedDraftRef.current = null;
      setHasUnsavedChanges(false);
      setPreviewVisible(false);

      Alert.alert(t('createEventSuccessTitle'), t('createEventSuccessMessage'));
      router.replace({
        pathname: '/event/[id]',
        params: { id: response.data.id },
      });
    } catch (error) {
      console.error(error);
      Alert.alert(t('commonErrorTitle'), t('createEventCreateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const addTicketType = () => {
    setTicketTypes((current) => [
      ...current,
      {
        id: `ticket-${Date.now()}-${current.length}`,
        name: '',
        price: '0',
        quantity: '50',
      },
    ]);
  };

  const updateTicketType = (
    id: string,
    field: 'name' | 'price' | 'quantity',
    value: string,
  ) => {
    setTicketTypes((current) =>
      current.map((ticketType) =>
        ticketType.id === id ? { ...ticketType, [field]: value } : ticketType,
      ),
    );
  };

  const removeTicketType = (id: string) => {
    setTicketTypes((current) => {
      if (current.length <= 1) {
        return current;
      }

      return current.filter((ticketType) => ticketType.id !== id);
    });
  };

  return (
    <View className="flex-1 bg-white pt-14 dark:bg-black">
      <View className="flex-row items-center border-b border-gray-100 px-5 pb-4 dark:border-gray-800">
        <TouchableOpacity
          onPress={handleExitPress}
          className="mr-4 rounded-full bg-gray-50 p-2 dark:bg-gray-800"
        >
          <Ionicons name="close" size={24} color={isDark ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-bold text-gray-800 dark:text-white">
          {t('createEventTitle')}
        </Text>
      </View>

      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
        <View className="mb-6">
          <TouchableOpacity
            onPress={pickImage}
            className="relative h-48 items-center justify-center overflow-hidden rounded-xl border border-dashed border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-900"
          >
            {images.length > 0 ? (
              <>
                <Image
                  source={{ uri: images[coverIndex].uri }}
                  className="h-full w-full"
                  resizeMode="cover"
                />
                <View className="absolute bottom-2 right-2 rounded-full bg-black/60 px-3 py-1">
                  <Text className="text-xs font-bold text-white">{t('createEventCover')}</Text>
                </View>
              </>
            ) : (
              <View className="items-center">
                <Ionicons name="images-outline" size={40} color="#999" />
                <Text className="mt-2 font-medium text-gray-400">
                  {t('createEventAddPhotos')}
                </Text>
              </View>
            )}
          </TouchableOpacity>

          {images.length > 0 ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mt-3">
              {images.map((img, index) => (
                <TouchableOpacity
                  key={`${img.uri}-${index}`}
                  onPress={() => setCoverIndex(index)}
                  className={`mr-3 h-16 w-16 overflow-hidden rounded-lg border-2 ${
                    index === coverIndex ? 'border-[#ff4757]' : 'border-transparent'
                  }`}
                >
                  <Image source={{ uri: img.uri }} className="h-16 w-16" />
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                onPress={pickImage}
                className="h-16 w-16 items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800"
              >
                <Ionicons name="add" size={24} color="#999" />
              </TouchableOpacity>
            </ScrollView>
          ) : null}
        </View>

        <View className="gap-4">
          <TextInput
            placeholder={t('createEventFieldTitlePlaceholder')}
            placeholderTextColor={isDark ? '#666' : '#999'}
            className="rounded-xl bg-gray-50 p-4 text-lg text-gray-800 dark:bg-gray-800 dark:text-white"
            value={eventForm.title}
            onChangeText={(title) => setEventForm((prev) => ({ ...prev, title }))}
          />

          <View className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
            <Text className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('createEventAttachedPlace')}
            </Text>
            {placesLoading ? (
              <ActivityIndicator color="#4c669f" />
            ) : ownedPlaces.length > 0 ? (
              ownedPlaces.map((place) => (
                <TouchableOpacity
                  key={place.id}
                  onPress={() => setSelectedPlaceId(place.id)}
                  className={`mb-3 rounded-2xl border p-4 ${
                    selectedPlaceId === place.id
                      ? 'border-[#ff4757] bg-red-50 dark:bg-red-900/20'
                      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                  }`}
                >
                  <Text className="text-base font-semibold text-gray-900 dark:text-white">
                    {place.name}
                  </Text>
                  <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                    {place.address || t('createEventAddressToConfirm')}
                  </Text>
                </TouchableOpacity>
              ))
            ) : (
              <View>
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {t('createEventNoAttachedPlace')}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/organizer/create-place')}
                  className="mt-3 self-start rounded-xl bg-[#2ecc71] px-4 py-3"
                >
                  <Text className="font-semibold text-white">{t('createEventCreatePlace')}</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
            <Text className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('createEventCategoryTitle')}
            </Text>

            {categoriesLoading ? (
              <ActivityIndicator color="#4c669f" />
            ) : categories.length === 0 ? (
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {t('createEventNoCategories')}
              </Text>
            ) : (
              <View className="flex-row flex-wrap gap-2">
                {categories.map((category) => {
                  const isSelected = selectedCategoryId === category.id;
                  return (
                    <TouchableOpacity
                      key={category.id}
                      onPress={() => {
                        setSelectedCategoryId(category.id);
                        setSelectedTagIds([]);
                      }}
                      className={`rounded-full px-3 py-2 ${
                        isSelected
                          ? 'bg-[#4c669f]'
                          : 'border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800'
                      }`}
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
            )}

            {availableTags.length > 0 ? (
              <View className="mt-4">
                <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {t('createEventTagsTitle')}
                </Text>
                <View className="flex-row flex-wrap gap-2">
                  {availableTags.map((tag) => {
                    const isSelected = selectedTagIds.includes(tag.id);
                    return (
                      <TouchableOpacity
                        key={tag.id}
                        onPress={() => toggleTag(tag.id)}
                        className={`rounded-full px-3 py-2 ${
                          isSelected
                            ? 'bg-[#ff4757]'
                            : 'border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800'
                        }`}
                      >
                        <Text
                          className={`text-xs font-semibold ${
                            isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                          }`}
                        >
                          #{tag.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1 gap-2">
              <Text className="ml-1 font-medium text-gray-500 dark:text-gray-400">
                {t('createEventStartLabel')}
              </Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => showDatepicker('start', 'date')}
                  className="flex-1 items-center rounded-xl bg-gray-50 p-3 dark:bg-gray-800"
                >
                  <Text className="text-gray-800 dark:text-white">
                    {eventForm.startTime.toLocaleDateString(locale)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => showDatepicker('start', 'time')}
                  className="flex-1 items-center rounded-xl bg-gray-50 p-3 dark:bg-gray-800"
                >
                  <Text className="text-gray-800 dark:text-white">
                    {eventForm.startTime.toLocaleTimeString(locale, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className="flex-row gap-4">
            <View className="flex-1 gap-2">
              <Text className="ml-1 font-medium text-gray-500 dark:text-gray-400">
                {t('createEventEndLabel')}
              </Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => showDatepicker('end', 'date')}
                  className="flex-1 items-center rounded-xl bg-gray-50 p-3 dark:bg-gray-800"
                >
                  <Text className="text-gray-800 dark:text-white">
                    {eventForm.endTime.toLocaleDateString(locale)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => showDatepicker('end', 'time')}
                  className="flex-1 items-center rounded-xl bg-gray-50 p-3 dark:bg-gray-800"
                >
                  <Text className="text-gray-800 dark:text-white">
                    {eventForm.endTime.toLocaleTimeString(locale, {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
            <Text className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('createEventCheckInWindowTitle')}
            </Text>
            <View className="flex-row gap-2">
              <TextInput
                placeholder={t('createEventCheckInOpenPlaceholder')}
                placeholderTextColor={isDark ? '#666' : '#999'}
                keyboardType="numbers-and-punctuation"
                className="flex-1 rounded-xl bg-white p-3 text-gray-800 dark:bg-gray-800 dark:text-white"
                value={eventForm.checkInOpensAtOffsetMin}
                onChangeText={(value) =>
                  setEventForm((prev) => ({ ...prev, checkInOpensAtOffsetMin: value }))
                }
              />
              <TextInput
                placeholder={t('createEventCheckInClosePlaceholder')}
                placeholderTextColor={isDark ? '#666' : '#999'}
                keyboardType="numbers-and-punctuation"
                className="flex-1 rounded-xl bg-white p-3 text-gray-800 dark:bg-gray-800 dark:text-white"
                value={eventForm.checkInClosesAtOffsetMin}
                onChangeText={(value) =>
                  setEventForm((prev) => ({ ...prev, checkInClosesAtOffsetMin: value }))
                }
              />
            </View>
            <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('createEventCheckInWindowHint')}
            </Text>

            <Text className="mb-2 mt-4 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('createEventMaxTicketsPerUserTitle')}
            </Text>
            <TextInput
              placeholder={t('createEventMaxTicketsPerUserPlaceholder')}
              placeholderTextColor={isDark ? '#666' : '#999'}
              keyboardType="numeric"
              className="rounded-xl bg-white p-3 text-gray-800 dark:bg-gray-800 dark:text-white"
              value={eventForm.maxTicketsPerUser}
              onChangeText={(value) =>
                setEventForm((prev) => ({ ...prev, maxTicketsPerUser: value }))
              }
            />
            <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('createEventMaxTicketsPerUserHint')}
            </Text>
          </View>

          <View className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
            <Text className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('createEventPromoTitle')}
            </Text>
            <TextInput
              placeholder={t('createEventPromoCodePlaceholder')}
              placeholderTextColor={isDark ? '#666' : '#999'}
              autoCapitalize="characters"
              className="rounded-xl bg-white p-3 text-gray-800 dark:bg-gray-800 dark:text-white"
              value={eventForm.promoCode}
              onChangeText={(value) =>
                setEventForm((prev) => ({ ...prev, promoCode: value }))
              }
            />
            <View className="mt-2 flex-row gap-2">
              <TouchableOpacity
                onPress={() => setEventForm((prev) => ({ ...prev, promoType: 'PERCENT' }))}
                className={`flex-1 rounded-xl border px-3 py-3 ${
                  eventForm.promoType === 'PERCENT'
                    ? 'border-[#ff4757] bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`text-center text-sm font-semibold ${
                    eventForm.promoType === 'PERCENT'
                      ? 'text-[#ff4757]'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {t('createEventPromoTypePercent')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setEventForm((prev) => ({ ...prev, promoType: 'FIXED' }))}
                className={`flex-1 rounded-xl border px-3 py-3 ${
                  eventForm.promoType === 'FIXED'
                    ? 'border-[#ff4757] bg-red-50 dark:bg-red-900/20'
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`text-center text-sm font-semibold ${
                    eventForm.promoType === 'FIXED'
                      ? 'text-[#ff4757]'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {t('createEventPromoTypeFixed')}
                </Text>
              </TouchableOpacity>
            </View>
            <TextInput
              placeholder={t('createEventPromoValuePlaceholder')}
              placeholderTextColor={isDark ? '#666' : '#999'}
              keyboardType="numbers-and-punctuation"
              className="mt-2 rounded-xl bg-white p-3 text-gray-800 dark:bg-gray-800 dark:text-white"
              value={eventForm.promoValue}
              onChangeText={(value) =>
                setEventForm((prev) => ({ ...prev, promoValue: value }))
              }
            />
            <TextInput
              placeholder={t('createEventPromoQuotaPlaceholder')}
              placeholderTextColor={isDark ? '#666' : '#999'}
              keyboardType="numeric"
              className="mt-2 rounded-xl bg-white p-3 text-gray-800 dark:bg-gray-800 dark:text-white"
              value={eventForm.promoMaxRedemptions}
              onChangeText={(value) =>
                setEventForm((prev) => ({ ...prev, promoMaxRedemptions: value }))
              }
            />
            <TextInput
              placeholder={t('createEventPromoEndDatePlaceholder')}
              placeholderTextColor={isDark ? '#666' : '#999'}
              className="mt-2 rounded-xl bg-white p-3 text-gray-800 dark:bg-gray-800 dark:text-white"
              value={eventForm.promoEndsAt}
              onChangeText={(value) =>
                setEventForm((prev) => ({ ...prev, promoEndsAt: value }))
              }
            />
            <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('createEventPromoHint')}
            </Text>
          </View>

          <View className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
            <View className="flex-row items-center justify-between">
              <Text className="text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {t('createEventTicketTypesTitle')}
              </Text>
              <TouchableOpacity
                onPress={addTicketType}
                className="rounded-full border border-[#ff4757] px-3 py-1.5"
              >
                <Text className="text-xs font-semibold text-[#ff4757]">
                  {t('createEventTicketTypeAdd')}
                </Text>
              </TouchableOpacity>
            </View>

            {ticketTypes.map((ticketType, index) => (
              <View
                key={ticketType.id}
                className="mt-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    {t('createEventTicketTypeLabel', { index: index + 1 })}
                  </Text>
                  {ticketTypes.length > 1 ? (
                    <TouchableOpacity onPress={() => removeTicketType(ticketType.id)}>
                      <Text className="text-xs font-semibold text-red-500">
                        {t('createEventTicketTypeRemove')}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <TextInput
                  placeholder={t('createEventTicketTypeNamePlaceholder')}
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  className="mt-2 rounded-xl bg-gray-50 p-3 text-gray-800 dark:bg-gray-900 dark:text-white"
                  value={ticketType.name}
                  onChangeText={(value) => updateTicketType(ticketType.id, 'name', value)}
                />

                <View className="mt-2 flex-row gap-2">
                  <TextInput
                    placeholder={t('createEventTicketTypePricePlaceholder')}
                    placeholderTextColor={isDark ? '#666' : '#999'}
                    keyboardType="numeric"
                    className="flex-1 rounded-xl bg-gray-50 p-3 text-gray-800 dark:bg-gray-900 dark:text-white"
                    value={ticketType.price}
                    onChangeText={(value) => updateTicketType(ticketType.id, 'price', value)}
                  />
                  <TextInput
                    placeholder={t('createEventTicketTypeQtyPlaceholder')}
                    placeholderTextColor={isDark ? '#666' : '#999'}
                    keyboardType="numeric"
                    className="w-28 rounded-xl bg-gray-50 p-3 text-gray-800 dark:bg-gray-900 dark:text-white"
                    value={ticketType.quantity}
                    onChangeText={(value) => updateTicketType(ticketType.id, 'quantity', value)}
                  />
                </View>
              </View>
            ))}
          </View>
          <TextInput
            placeholder={t('createEventDescriptionPlaceholder')}
            placeholderTextColor={isDark ? '#666' : '#999'}
            multiline
            className="h-32 rounded-xl bg-gray-50 p-4 text-gray-800 dark:bg-gray-800 dark:text-white"
            textAlignVertical="top"
            value={eventForm.description}
            onChangeText={(description) =>
              setEventForm((prev) => ({ ...prev, description }))
            }
          />

          <View className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
            <Text className="mb-2 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('createEventPoliciesTitle')}
            </Text>
            <TextInput
              placeholder={t('createEventCancellationPolicyPlaceholder')}
              placeholderTextColor={isDark ? '#666' : '#999'}
              multiline
              className="h-24 rounded-xl bg-white p-3 text-gray-800 dark:bg-gray-800 dark:text-white"
              textAlignVertical="top"
              value={eventForm.cancellationPolicy}
              onChangeText={(value) =>
                setEventForm((prev) => ({ ...prev, cancellationPolicy: value }))
              }
            />
            <TextInput
              placeholder={t('createEventRefundPolicyPlaceholder')}
              placeholderTextColor={isDark ? '#666' : '#999'}
              multiline
              className="mt-2 h-24 rounded-xl bg-white p-3 text-gray-800 dark:bg-gray-800 dark:text-white"
              textAlignVertical="top"
              value={eventForm.refundPolicy}
              onChangeText={(value) =>
                setEventForm((prev) => ({ ...prev, refundPolicy: value }))
              }
            />
          </View>
        </View>

        <TouchableOpacity
          onPress={() => void handleSaveDraft()}
          disabled={loading}
          className="mt-8 items-center rounded-xl border border-[#4c669f] py-3"
        >
          <Text className="text-base font-semibold text-[#4c669f]">
            {t('createEventSaveDraft')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={openPreview}
          disabled={loading}
          className="mb-10 mt-4 items-center rounded-xl bg-[#ff4757] py-4"
        >
          {loading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-lg font-bold text-white">
              {t('createEventPublishNow')}
            </Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      <Modal transparent animationType="fade" visible={previewVisible}>
        <View className="flex-1 items-center justify-center bg-black/60 px-5">
          <View className="w-full rounded-3xl bg-white p-5 dark:bg-gray-900">
            <Text className="text-xl font-bold text-gray-900 dark:text-white">
              {t('createEventPreviewTitle')}
            </Text>
            <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('createEventPreviewSubtitle')}
            </Text>

            <View className="mt-4 gap-2">
              <Text className="text-sm text-gray-700 dark:text-gray-200">
                {t('createEventPreviewLabelTitle')}: {eventForm.title || '-'}
              </Text>
              <Text className="text-sm text-gray-700 dark:text-gray-200">
                {t('createEventPreviewLabelCategory')}: {selectedCategory?.name || '-'}
              </Text>
              <Text className="text-sm text-gray-700 dark:text-gray-200">
                {t('createEventPreviewLabelTags')}: {selectedTagIds.length}
              </Text>
              <Text className="text-sm text-gray-700 dark:text-gray-200">
                {t('createEventPreviewLabelStart')}:{' '}
                {eventForm.startTime.toLocaleString(locale)}
              </Text>
              <Text className="text-sm text-gray-700 dark:text-gray-200">
                {t('createEventPreviewLabelEnd')}: {eventForm.endTime.toLocaleString(locale)}
              </Text>
              <Text className="text-sm text-gray-700 dark:text-gray-200">
                {t('createEventPreviewLabelPlace')}:{' '}
                {ownedPlaces.find((place) => place.id === selectedPlaceId)?.name || '-'}
              </Text>
              <Text className="text-sm text-gray-700 dark:text-gray-200">
                {t('createEventPreviewLabelTickets')}: {ticketTypes.length}
              </Text>
              <Text className="text-sm text-gray-700 dark:text-gray-200">
                {t('createEventPreviewLabelCheckIn')}: {eventForm.checkInOpensAtOffsetMin}{' '}
                / {eventForm.checkInClosesAtOffsetMin} min
              </Text>
              <Text className="text-sm text-gray-700 dark:text-gray-200">
                {t('createEventPreviewLabelMaxTicketsPerUser')}: {eventForm.maxTicketsPerUser}
              </Text>
              <Text className="text-sm text-gray-700 dark:text-gray-200">
                {t('createEventPreviewLabelPolicies')}: {eventForm.cancellationPolicy ? 'OK' : '-'}
              </Text>
              <Text className="text-sm text-gray-700 dark:text-gray-200">
                {t('createEventPreviewLabelPromo')}:{' '}
                {eventForm.promoCode.trim() ? eventForm.promoCode.trim().toUpperCase() : '-'}
              </Text>
            </View>

            <View className="mt-5 flex-row gap-3">
              <TouchableOpacity
                onPress={() => setPreviewVisible(false)}
                className="flex-1 items-center rounded-2xl border border-gray-300 py-3 dark:border-gray-700"
              >
                <Text className="font-semibold text-gray-700 dark:text-gray-200">
                  {t('genericCancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleCreateEvent()}
                disabled={loading}
                className="flex-1 items-center rounded-2xl bg-[#ff4757] py-3"
              >
                <Text className="font-semibold text-white">
                  {loading ? t('createEventPreviewPublishing') : t('createEventPreviewConfirm')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {showPicker ? (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide" visible={showPicker}>
            <View className="flex-1 justify-end bg-black/50">
              <View className="overflow-hidden rounded-t-3xl bg-white pb-8 dark:bg-gray-900">
                <View className="flex-row items-center justify-between border-b border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <Text className="font-medium text-gray-500">{t('genericCancel')}</Text>
                  </TouchableOpacity>
                  <Text className="text-lg font-bold text-gray-800 dark:text-white">
                    {pickerMode === 'date'
                      ? t('createEventPickerDateTitle')
                      : t('createEventPickerTimeTitle')}
                  </Text>
                  <TouchableOpacity onPress={() => setShowPicker(false)}>
                    <Text className="text-lg font-bold text-[#4c669f]">{t('createEventPickerConfirm')}</Text>
                  </TouchableOpacity>
                </View>
                <DateTimePicker
                  value={
                    currentField === 'start'
                      ? eventForm.startTime
                      : eventForm.endTime
                  }
                  mode={pickerMode}
                  is24Hour
                  display="spinner"
                  onChange={onDateChange}
                  style={{
                    height: 200,
                    width: '100%',
                    backgroundColor: isDark ? '#111827' : 'white',
                  }}
                  textColor={isDark ? 'white' : 'black'}
                />
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={
              currentField === 'start' ? eventForm.startTime : eventForm.endTime
            }
            mode={pickerMode}
            is24Hour
            display="default"
            onChange={onDateChange}
          />
        )
      ) : null}
    </View>
  );
}
