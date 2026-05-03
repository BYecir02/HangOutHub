import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  useWindowDimensions,
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
import EventFormWizard from '@/components/ui/EventFormWizard';
import api, { clearAuthState, isUnauthorizedError } from '@/services/api';
import { getMySettings } from '@/services/settings';
import {
  buildMediaUploadPayload,
  isMediaFileTooLarge,
  isSupportedMediaAsset,
} from '@/services/media-upload';

interface OwnedPlaceOption {
  id: string;
  name: string;
  address?: string | null;
}

type EventPlaceSource = 'owned' | 'all';

interface CategoryTagOption {
  id: number;
  name: string;
  status?: 'APPROVED' | 'PENDING' | string;
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
  description: string;
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
  coverIndex: number;
}

const EVENT_DRAFT_KEY = 'create-event-draft-v1';
const AUTO_SAVE_INTERVAL_MS = 15000;
const CREATE_EVENT_TOTAL_STEPS = 5;

export default function CreateEventScreen() {
  const router = useRouter();
  const { width: windowWidth } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const { locale, t } = useI18n();
  const isDark = colorScheme === 'dark';
  const pickerModalWidth = Math.max(280, Math.min(360, windowWidth - 24));
  const [loading, setLoading] = useState(false);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [ownedPlaces, setOwnedPlaces] = useState<OwnedPlaceOption[]>([]);
  const [allPlaces, setAllPlaces] = useState<OwnedPlaceOption[]>([]);
  const [placeSource, setPlaceSource] = useState<EventPlaceSource>('owned');
  const [placeSearch, setPlaceSearch] = useState('');
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [customTagName, setCustomTagName] = useState('');
  const [creatingTag, setCreatingTag] = useState(false);
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
      description: '',
      price: '0',
      quantity: '100',
    },
  ]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [currentField, setCurrentField] = useState<'start' | 'end'>('start');
  const [checkInInputMode, setCheckInInputMode] = useState<'picker' | 'manual'>('picker');
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [checkInPickerTarget, setCheckInPickerTarget] = useState<'open' | 'close'>('open');
  const [checkInPickerValue, setCheckInPickerValue] = useState(new Date());
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [previewVisible, setPreviewVisible] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [stepError, setStepError] = useState<string | null>(null);
  const [stepErrorField, setStepErrorField] = useState<string | null>(null);
  const lastSavedDraftRef = useRef<string | null>(null);
  const serializedDraftRef = useRef<string | null>(null);
  const scrollRef = useRef<ScrollView | null>(null);
  const fieldOffsetsRef = useRef<Record<string, number>>({});

  const setStepValidationError = (message: string, field: string) => {
    setStepError(message);
    setStepErrorField(field);
  };

  const isStepFieldError = (field: string) => stepErrorField === field;

  const registerFieldOffset = (field: string, y: number) => {
    fieldOffsetsRef.current[field] = y;
  };

  const handleInvalidSession = useCallback(async () => {
    await clearAuthState();
    router.replace('/');
  }, [router]);

  const parseOffsetMinutes = (rawValue: string, fallback: number) => {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) {
      return fallback;
    }

    return Math.trunc(parsed);
  };

  const minutesToPickerDate = (totalMinutes: number) => {
    const clamped = Math.max(0, Math.min(23 * 60 + 59, Math.trunc(totalMinutes)));
    const hours = Math.floor(clamped / 60);
    const minutes = clamped % 60;
    const next = new Date();
    next.setHours(hours, minutes, 0, 0);
    return next;
  };

  const formatDurationLabel = (totalMinutes: number) => {
    const safeMinutes = Math.max(0, Math.trunc(totalMinutes));
    const hours = Math.floor(safeMinutes / 60);
    const minutes = safeMinutes % 60;

    if (hours > 0 && minutes > 0) {
      return `${hours}h ${minutes}min`;
    }

    if (hours > 0) {
      return `${hours}h`;
    }

    return `${minutes}min`;
  };

  const buildDraftPayload = useCallback((): EventDraftPayload => ({
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
    coverIndex,
  }), [
    eventForm,
    selectedPlaceId,
    selectedCategoryId,
    selectedTagIds,
    ticketTypes,
    coverIndex,
  ]);

  const serializedDraft = useMemo(() => {
    return JSON.stringify(buildDraftPayload());
  }, [buildDraftPayload]);

  useEffect(() => {
    serializedDraftRef.current = serializedDraft;
  }, [serializedDraft]);

  const applyDraft = useCallback(
    (
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

    const normalizedDraftTickets = (draft.ticketTypes || []).map((ticketType) => ({
      ...ticketType,
      description: ticketType.description || '',
    }));

    setTicketTypes(
      normalizedDraftTickets.length > 0
        ? normalizedDraftTickets
        : [
            {
              id: `ticket-${Date.now()}`,
              name: 'Standard',
              description: '',
              price: '0',
              quantity: '100',
            },
          ],
    );

    setImages([]);
    setCoverIndex(0);
  },
  []);

  const handleSaveDraft = useCallback(async (options?: { silent?: boolean }) => {
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
  }, [buildDraftPayload, t]);

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
        const [userResponse, categoriesResponse, allPlacesResponse, settingsResponse] = await Promise.all([
          api.get('/users/me'),
          api.get<CategoryOption[]>('/categories/organizer'),
          api.get<OwnedPlaceOption[]>('/places'),
          getMySettings().catch(() => null),
        ]);

        const places = userResponse.data?.OwnedPlaces || [];
        const fetchedCategories = categoriesResponse.data || [];
        const fetchedPlaces = (allPlacesResponse.data || []).map((place) => ({
          id: place.id,
          name: place.name,
          address: place.address,
        }));
        const openDefault = settingsResponse?.organizerDefaultCheckInOpenOffsetMin;
        const closeDefault = settingsResponse?.organizerDefaultCheckInCloseOffsetMin;
        const maxTicketsDefault = settingsResponse?.organizerDefaultMaxTicketsPerUser;
        const cancellationPolicyDefault =
          settingsResponse?.organizerDefaultCancellationPolicy || '';
        const refundPolicyDefault = settingsResponse?.organizerDefaultRefundPolicy || '';

        if (isMounted) {
          setOwnedPlaces(places);
          setAllPlaces(fetchedPlaces);
          setCategories(fetchedCategories);
          setSelectedPlaceId(
            (current) => current || places[0]?.id || fetchedPlaces[0]?.id || null,
          );
          setSelectedCategoryId((current) => current || fetchedCategories[0]?.id || null);

          setEventForm((prev) => ({
            ...prev,
            checkInOpensAtOffsetMin: Number.isFinite(openDefault)
              ? String(Math.trunc(openDefault as number))
              : prev.checkInOpensAtOffsetMin,
            checkInClosesAtOffsetMin: Number.isFinite(closeDefault)
              ? String(Math.trunc(closeDefault as number))
              : prev.checkInClosesAtOffsetMin,
            maxTicketsPerUser: Number.isFinite(maxTicketsDefault)
              ? String(Math.trunc(maxTicketsDefault as number))
              : prev.maxTicketsPerUser,
            cancellationPolicy: cancellationPolicyDefault || prev.cancellationPolicy,
            refundPolicy: refundPolicyDefault || prev.refundPolicy,
          }));

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
      } catch (error) {
        if (isUnauthorizedError(error)) {
          await handleInvalidSession();
          return;
        }

        if (isMounted) {
          setOwnedPlaces([]);
          setAllPlaces([]);
          setCategories([]);
          setSelectedPlaceId(null);
          setSelectedCategoryId(null);
        }
      } finally {
        if (isMounted) {
          setPlacesLoading(false);
          setCategoriesLoading(false);

          if (lastSavedDraftRef.current === null) {
            lastSavedDraftRef.current = serializedDraftRef.current;
            setHasUnsavedChanges(false);
          }
        }
      }
    };

    void fetchOwnedPlaces();

    return () => {
      isMounted = false;
    };
  }, [applyDraft, handleInvalidSession, t]);

  useEffect(() => {
    if (lastSavedDraftRef.current === null) {
      return;
    }

    setHasUnsavedChanges(serializedDraft !== lastSavedDraftRef.current);
  }, [serializedDraft]);

  useEffect(() => {
    setStepError(null);
    setStepErrorField(null);
  }, [currentStep]);

  useEffect(() => {
    if (!stepErrorField) {
      return;
    }

    const targetY = fieldOffsetsRef.current[stepErrorField];
    if (typeof targetY !== 'number') {
      return;
    }

    const timeout = setTimeout(() => {
      scrollRef.current?.scrollTo({
        y: Math.max(0, targetY - 16),
        animated: true,
      });
    }, 20);

    return () => clearTimeout(timeout);
  }, [stepErrorField]);

  useEffect(() => {
    if (!hasUnsavedChanges || loading) {
      return;
    }

    const timer = setInterval(() => {
      void handleSaveDraft({ silent: true });
    }, AUTO_SAVE_INTERVAL_MS);

    return () => clearInterval(timer);
  }, [hasUnsavedChanges, loading, handleSaveDraft]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      selectionLimit: 5,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      const validAssets = result.assets.filter(
        (asset) => isSupportedMediaAsset(asset) && !isMediaFileTooLarge(asset),
      );

      if (validAssets.length !== result.assets.length) {
        Alert.alert(t('mediaValidationTitle'), t('mediaValidationMessage'));
      }

      setImages((current) => [...current, ...validAssets]);
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

  const openCheckInDurationPicker = (target: 'open' | 'close') => {
    setCheckInPickerTarget(target);

    if (target === 'open') {
      const opensAt = Math.abs(parseOffsetMinutes(eventForm.checkInOpensAtOffsetMin, -60));
      setCheckInPickerValue(minutesToPickerDate(opensAt));
    } else {
      const closesAt = Math.max(0, parseOffsetMinutes(eventForm.checkInClosesAtOffsetMin, 180));
      setCheckInPickerValue(minutesToPickerDate(closesAt));
    }

    setShowCheckInPicker(true);
  };

  const onCheckInPickerChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowCheckInPicker(false);
    }

    if (!selectedDate) {
      return;
    }

    setCheckInPickerValue(selectedDate);
    const totalMinutes = selectedDate.getHours() * 60 + selectedDate.getMinutes();

    if (checkInPickerTarget === 'open') {
      setEventForm((prev) => ({
        ...prev,
        checkInOpensAtOffsetMin: String(-Math.max(0, totalMinutes)),
      }));
      return;
    }

    setEventForm((prev) => ({
      ...prev,
      checkInClosesAtOffsetMin: String(Math.max(0, totalMinutes)),
    }));
  };

  const selectedCategory = categories.find(
    (category) => category.id === selectedCategoryId,
  );
  const availableTags = selectedCategory?.Tag || [];
  const availablePlaces = useMemo(() => {
    const sourceItems = placeSource === 'all' ? allPlaces : ownedPlaces;
    const normalizedSearch = placeSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return sourceItems;
    }

    return sourceItems.filter((place) => {
      const haystack = `${place.name || ''} ${place.address || ''}`.toLowerCase();
      return haystack.includes(normalizedSearch);
    });
  }, [allPlaces, ownedPlaces, placeSearch, placeSource]);

  const selectedPlaceName = useMemo(() => {
    const merged = [...ownedPlaces, ...allPlaces];
    return merged.find((place) => place.id === selectedPlaceId)?.name || '-';
  }, [allPlaces, ownedPlaces, selectedPlaceId]);
  const checkInOpenMinutes = Math.abs(parseOffsetMinutes(eventForm.checkInOpensAtOffsetMin, -60));
  const checkInCloseMinutes = Math.max(0, parseOffsetMinutes(eventForm.checkInClosesAtOffsetMin, 180));

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((id) => id !== tagId)
        : [...current, tagId],
    );
  };

  const handleCreateCustomTag = async () => {
    if (!selectedCategoryId) {
      setStepValidationError(t('createEventTagCategoryRequired'), 'customTag');
      return;
    }

    const normalizedTagName = customTagName.replace(/\s+/g, ' ').trim();
    if (normalizedTagName.length < 2) {
      setStepValidationError(t('createEventTagNameInvalid'), 'customTag');
      return;
    }

    setCreatingTag(true);
    setStepError(null);
    setStepErrorField(null);

    try {
      const response = await api.post(`/categories/${selectedCategoryId}/tags`, {
        name: normalizedTagName,
      });

      const newTag = response.data as CategoryTagOption;

      setCategories((current) =>
        current.map((category) => {
          if (category.id !== selectedCategoryId) {
            return category;
          }

          const existing = category.Tag || [];
          const alreadyExists = existing.some((tag) => tag.id === newTag.id);
          if (alreadyExists) {
            return category;
          }

          return {
            ...category,
            Tag: [...existing, newTag].sort((a, b) =>
              a.name.localeCompare(b.name, locale),
            ),
          };
        }),
      );

      setSelectedTagIds((current) =>
        current.includes(newTag.id) ? current : [...current, newTag.id],
      );
      setCustomTagName('');
    } catch (error: any) {
      if (isUnauthorizedError(error)) {
        await handleInvalidSession();
        return;
      }

      const apiMessage =
        error?.response?.data?.message && typeof error.response.data.message === 'string'
          ? error.response.data.message
          : t('createEventTagCreateFailed');
      setStepValidationError(apiMessage, 'customTag');
    } finally {
      setCreatingTag(false);
    }
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
      description: ticketType.description.trim(),
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
      const invalidMedia = images.find(
        (asset) => !isSupportedMediaAsset(asset) || isMediaFileTooLarge(asset),
      );

      if (invalidMedia) {
        Alert.alert(t('mediaValidationTitle'), t('mediaValidationMessage'));
        return;
      }

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
        formData.append('cover', buildMediaUploadPayload(coverImage, coverIndex, 'event-cover') as any);

        images.forEach((img, index) => {
          if (index !== coverIndex) {
            formData.append('gallery', buildMediaUploadPayload(img, index, 'gallery') as any);
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
      if (isUnauthorizedError(error)) {
        await handleInvalidSession();
        return;
      }

      console.error(error);
      Alert.alert(t('commonErrorTitle'), t('createEventCreateFailed'));
    } finally {
      setLoading(false);
    }
  };

  const validateCurrentStep = () => {
    if (currentStep === 1) {
      if (!eventForm.title.trim()) {
        setStepValidationError(t('createEventTitleRequired'), 'title');
        return false;
      }

      setStepError(null);
      setStepErrorField(null);
      return true;
    }

    if (currentStep === 2) {
      if (eventForm.endTime < eventForm.startTime) {
        setStepValidationError(t('createEventEndAfterStart'), 'dateRange');
        return false;
      }

      setStepError(null);
      setStepErrorField(null);
      return true;
    }

    if (currentStep === 3) {
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
        setStepValidationError(t('createEventTicketTypeInvalid'), 'ticketTypes');
        return false;
      }

      const checkInOpensAtOffsetMin = Number(eventForm.checkInOpensAtOffsetMin || -60);
      const checkInClosesAtOffsetMin = Number(
        eventForm.checkInClosesAtOffsetMin || 180,
      );

      if (
        !Number.isInteger(checkInOpensAtOffsetMin) ||
        !Number.isInteger(checkInClosesAtOffsetMin) ||
        checkInClosesAtOffsetMin <= checkInOpensAtOffsetMin
      ) {
        setStepValidationError(t('createEventCheckInWindowInvalid'), 'checkInWindow');
        return false;
      }

      const maxTicketsPerUser = Number(eventForm.maxTicketsPerUser || 1);
      if (
        !Number.isInteger(maxTicketsPerUser) ||
        maxTicketsPerUser < 1 ||
        maxTicketsPerUser > 20
      ) {
        setStepValidationError(
          t('createEventMaxTicketsPerUserInvalid'),
          'maxTicketsPerUser',
        );
        return false;
      }

      setStepError(null);
      setStepErrorField(null);
      return true;
    }

    if (currentStep === 4) {
      const normalizedPromoCode = eventForm.promoCode.trim().toUpperCase();

      if (!normalizedPromoCode) {
        return true;
      }

      const promoValue = Number(eventForm.promoValue || 0);
      if (!Number.isFinite(promoValue) || promoValue <= 0) {
        setStepValidationError(t('createEventPromoValueInvalid'), 'promoValue');
        return false;
      }

      if (eventForm.promoType === 'PERCENT' && promoValue > 100) {
        setStepValidationError(
          t('createEventPromoValuePercentInvalid'),
          'promoValue',
        );
        return false;
      }

      if (eventForm.promoMaxRedemptions.trim()) {
        const promoMaxRedemptions = Number(eventForm.promoMaxRedemptions);
        if (!Number.isInteger(promoMaxRedemptions) || promoMaxRedemptions < 1) {
          setStepValidationError(t('createEventPromoQuotaInvalid'), 'promoMaxRedemptions');
          return false;
        }
      }

      if (eventForm.promoEndsAt.trim()) {
        const parsedPromoEnd = new Date(eventForm.promoEndsAt);
        if (Number.isNaN(parsedPromoEnd.getTime())) {
          setStepValidationError(t('createEventPromoEndDateInvalid'), 'promoEndsAt');
          return false;
        }
      }

      setStepError(null);
      setStepErrorField(null);
      return true;
    }

    if (currentStep === 5) {
      if (images.length === 0) {
        setStepValidationError(t('createEventCoverRequired'), 'photos');
        return false;
      }

      setStepError(null);
      setStepErrorField(null);
      return true;
    }

    setStepError(null);
    setStepErrorField(null);
    return true;
  };

  const goToNextStep = () => {
    setStepError(null);
    setStepErrorField(null);
    if (!validateCurrentStep()) {
      return;
    }

    if (currentStep >= CREATE_EVENT_TOTAL_STEPS) {
      return;
    }

    setCurrentStep((step) => Math.min(CREATE_EVENT_TOTAL_STEPS, step + 1));
  };

  const goToPreviousStep = () => {
    if (currentStep <= 1) {
      return;
    }

    setStepError(null);
    setStepErrorField(null);
    setCurrentStep((step) => Math.max(1, step - 1));
  };

  const addTicketType = () => {
    setTicketTypes((current) => [
      ...current,
      {
        id: `ticket-${Date.now()}-${current.length}`,
        name: '',
        description: '',
        price: '0',
        quantity: '50',
      },
    ]);
  };

  const updateTicketType = (
    id: string,
    field: 'name' | 'description' | 'price' | 'quantity',
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
    <View className="flex-1">
      <EventFormWizard
        ref={scrollRef}
        title={t('createEventTitle')}
        onClose={handleExitPress}
        closeIconColor={isDark ? '#fff' : '#333'}
        progress={
          <View className="mb-5 rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
            <Text className="text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('createEventStepProgress', {
                current: currentStep,
                total: CREATE_EVENT_TOTAL_STEPS,
              })}
            </Text>
            <Text className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
              {currentStep === 1
                ? t('createEventStepTitleBasics')
                : currentStep === 2
                  ? t('createEventStepTitlePlaceDate')
                  : currentStep === 3
                    ? t('createEventStepTitleTicketing')
                    : currentStep === 4
                      ? t('createEventStepTitleOptions')
                      : t('createEventStepTitlePhotos')}
            </Text>
          </View>
        }
      >
        {currentStep === 5 ? (
          <View className="mb-6">
          <TouchableOpacity
            onPress={pickImage}
            onLayout={(event) => {
              registerFieldOffset('photos', event.nativeEvent.layout.y);
            }}
            className={`relative h-48 items-center justify-center overflow-hidden rounded-xl border border-dashed bg-gray-100 dark:bg-gray-900 ${
              isStepFieldError('photos')
                ? 'border-red-400 dark:border-red-500'
                : 'border-gray-200 dark:border-gray-700'
            }`}
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
        ) : null}

        <View className="gap-4">
          {currentStep === 1 ? (
            <TextInput
              placeholder={t('createEventFieldTitlePlaceholder')}
              placeholderTextColor={isDark ? '#666' : '#999'}
              onLayout={(event) => {
                registerFieldOffset('title', event.nativeEvent.layout.y);
              }}
              className={`rounded-xl border bg-gray-50 p-4 text-lg text-gray-800 dark:bg-gray-800 dark:text-white ${
                isStepFieldError('title')
                  ? 'border-red-400 dark:border-red-500'
                  : 'border-transparent'
              }`}
              value={eventForm.title}
              onChangeText={(title) => setEventForm((prev) => ({ ...prev, title }))}
            />
          ) : null}

          {currentStep === 2 ? (
          <View className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
            <Text className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('createEventAttachedPlace')}
            </Text>
            <View className="mb-3 flex-row gap-2">
              {(['owned', 'all'] as const).map((source) => {
                const active = placeSource === source;

                return (
                  <TouchableOpacity
                    key={source}
                    onPress={() => setPlaceSource(source)}
                    className={`rounded-full px-3 py-2 ${
                      active
                        ? 'bg-[#4c669f]'
                        : 'border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        active ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {source === 'owned'
                        ? t('createEventPlaceSourceOwned')
                        : t('createEventPlaceSourceAll')}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <TextInput
              value={placeSearch}
              onChangeText={setPlaceSearch}
              placeholder={t('createEventPlaceSearchPlaceholder')}
              placeholderTextColor={isDark ? '#666' : '#999'}
              className="mb-3 rounded-xl bg-white p-3 text-gray-800 dark:bg-gray-800 dark:text-white"
            />

            {placesLoading ? (
              <ActivityIndicator color="#4c669f" />
            ) : availablePlaces.length > 0 ? (
              availablePlaces.map((place) => (
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
                  {placeSource === 'owned'
                    ? t('createEventNoAttachedPlace')
                    : t('createEventNoMatchingPlace')}
                </Text>
                {placeSource === 'owned' ? (
                  <TouchableOpacity
                    onPress={() => router.push('/organizer/create-place')}
                    className="mt-3 self-start rounded-xl bg-[#2ecc71] px-4 py-3"
                  >
                    <Text className="font-semibold text-white">{t('createEventCreatePlace')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            )}
          </View>
          ) : null}

          {currentStep === 1 ? (
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
                        <View className="flex-row items-center gap-1">
                          <Text
                            className={`text-xs font-semibold ${
                              isSelected ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            #{tag.name}
                          </Text>
                          {tag.status === 'PENDING' ? (
                            <Text
                              className={`text-[10px] font-semibold uppercase ${
                                isSelected ? 'text-white/90' : 'text-amber-700 dark:text-amber-400'
                              }`}
                            >
                              {t('createEventTagPendingShort')}
                            </Text>
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            ) : null}

            <View
              className={`mt-4 rounded-2xl border p-3 ${
                isStepFieldError('customTag')
                  ? 'border-red-400 bg-red-50/60 dark:border-red-500 dark:bg-red-900/20'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
              }`}
              onLayout={(event) => {
                registerFieldOffset('customTag', event.nativeEvent.layout.y);
              }}
            >
              <Text className="mb-2 text-xs font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {t('createEventTagCreateTitle')}
              </Text>
              <TextInput
                value={customTagName}
                onChangeText={setCustomTagName}
                placeholder={t('createEventTagCreatePlaceholder')}
                placeholderTextColor={isDark ? '#666' : '#999'}
                editable={!creatingTag}
                className="rounded-xl border border-gray-200 bg-gray-50 px-3 py-3 text-gray-800 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
              />
              <TouchableOpacity
                onPress={handleCreateCustomTag}
                disabled={creatingTag}
                className={`mt-2 items-center rounded-xl px-4 py-3 ${
                  creatingTag ? 'bg-gray-300 dark:bg-gray-700' : 'bg-[#4c669f]'
                }`}
              >
                {creatingTag ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text className="font-semibold text-white">{t('createEventTagCreateAction')}</Text>
                )}
              </TouchableOpacity>
              <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                {t('createEventTagCreateHint')}
              </Text>
            </View>
          </View>
          ) : null}

          {currentStep === 2 ? (
          <View
            className="flex-row gap-4"
            onLayout={(event) => {
              registerFieldOffset('dateRange', event.nativeEvent.layout.y);
            }}
          >
            <View className="flex-1 gap-2">
              <Text className="ml-1 font-medium text-gray-500 dark:text-gray-400">
                {t('createEventStartLabel')}
              </Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => showDatepicker('start', 'date')}
                  className={`flex-1 items-center rounded-xl border bg-gray-50 p-3 dark:bg-gray-800 ${
                    isStepFieldError('dateRange')
                      ? 'border-red-400 dark:border-red-500'
                      : 'border-transparent'
                  }`}
                >
                  <Text className="text-gray-800 dark:text-white">
                    {eventForm.startTime.toLocaleDateString(locale)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => showDatepicker('start', 'time')}
                  className={`flex-1 items-center rounded-xl border bg-gray-50 p-3 dark:bg-gray-800 ${
                    isStepFieldError('dateRange')
                      ? 'border-red-400 dark:border-red-500'
                      : 'border-transparent'
                  }`}
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
          ) : null}

          {currentStep === 2 ? (
          <View className="flex-row gap-4">
            <View className="flex-1 gap-2">
              <Text className="ml-1 font-medium text-gray-500 dark:text-gray-400">
                {t('createEventEndLabel')}
              </Text>
              <View className="flex-row gap-2">
                <TouchableOpacity
                  onPress={() => showDatepicker('end', 'date')}
                  className={`flex-1 items-center rounded-xl border bg-gray-50 p-3 dark:bg-gray-800 ${
                    isStepFieldError('dateRange')
                      ? 'border-red-400 dark:border-red-500'
                      : 'border-transparent'
                  }`}
                >
                  <Text className="text-gray-800 dark:text-white">
                    {eventForm.endTime.toLocaleDateString(locale)}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => showDatepicker('end', 'time')}
                  className={`flex-1 items-center rounded-xl border bg-gray-50 p-3 dark:bg-gray-800 ${
                    isStepFieldError('dateRange')
                      ? 'border-red-400 dark:border-red-500'
                      : 'border-transparent'
                  }`}
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
          ) : null}

          {currentStep === 3 ? (
          <View
            className={`rounded-2xl bg-gray-50 p-4 dark:bg-gray-900 ${
              isStepFieldError('checkInWindow') || isStepFieldError('maxTicketsPerUser')
                ? 'border border-red-300 dark:border-red-500'
                : ''
            }`}
            onLayout={(event) => {
              registerFieldOffset('checkInWindow', event.nativeEvent.layout.y);
              registerFieldOffset('maxTicketsPerUser', event.nativeEvent.layout.y);
            }}
          >
            <Text className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
              {t('createEventCheckInWindowTitle')}
            </Text>
            <View className="mb-3 flex-row gap-2">
              <TouchableOpacity
                onPress={() => setCheckInInputMode('picker')}
                className={`rounded-full px-3 py-2 ${
                  checkInInputMode === 'picker'
                    ? 'bg-[#4c669f]'
                    : 'border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    checkInInputMode === 'picker'
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {t('createEventCheckInInputModePicker')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCheckInInputMode('manual')}
                className={`rounded-full px-3 py-2 ${
                  checkInInputMode === 'manual'
                    ? 'bg-[#4c669f]'
                    : 'border border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    checkInInputMode === 'manual'
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {t('createEventCheckInInputModeManual')}
                </Text>
              </TouchableOpacity>
            </View>

            {checkInInputMode === 'picker' ? (
              <View className="gap-2">
                <TouchableOpacity
                  onPress={() => openCheckInDurationPicker('open')}
                  className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {t('createEventCheckInOpensBefore')}
                  </Text>
                  <Text className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                    {formatDurationLabel(checkInOpenMinutes)}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => openCheckInDurationPicker('close')}
                  className="rounded-xl border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
                >
                  <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {t('createEventCheckInClosesAfter')}
                  </Text>
                  <Text className="mt-1 text-base font-semibold text-gray-900 dark:text-white">
                    {formatDurationLabel(checkInCloseMinutes)}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
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
            )}
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
              className={`rounded-xl border bg-white p-3 text-gray-800 dark:bg-gray-800 dark:text-white ${
                isStepFieldError('maxTicketsPerUser')
                  ? 'border-red-400 dark:border-red-500'
                  : 'border-transparent'
              }`}
              value={eventForm.maxTicketsPerUser}
              onChangeText={(value) =>
                setEventForm((prev) => ({ ...prev, maxTicketsPerUser: value }))
              }
            />
            <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('createEventMaxTicketsPerUserHint')}
            </Text>
          </View>
          ) : null}

          {currentStep === 4 ? (
          <View
            className={`rounded-2xl bg-gray-50 p-4 dark:bg-gray-900 ${
              isStepFieldError('promoValue') ||
              isStepFieldError('promoMaxRedemptions') ||
              isStepFieldError('promoEndsAt')
                ? 'border border-red-300 dark:border-red-500'
                : ''
            }`}
            onLayout={(event) => {
              registerFieldOffset('promoValue', event.nativeEvent.layout.y);
              registerFieldOffset('promoMaxRedemptions', event.nativeEvent.layout.y);
              registerFieldOffset('promoEndsAt', event.nativeEvent.layout.y);
            }}
          >
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
              className={`mt-2 rounded-xl border bg-white p-3 text-gray-800 dark:bg-gray-800 dark:text-white ${
                isStepFieldError('promoValue')
                  ? 'border-red-400 dark:border-red-500'
                  : 'border-transparent'
              }`}
              value={eventForm.promoValue}
              onChangeText={(value) =>
                setEventForm((prev) => ({ ...prev, promoValue: value }))
              }
            />
            <TextInput
              placeholder={t('createEventPromoQuotaPlaceholder')}
              placeholderTextColor={isDark ? '#666' : '#999'}
              keyboardType="numeric"
              className={`mt-2 rounded-xl border bg-white p-3 text-gray-800 dark:bg-gray-800 dark:text-white ${
                isStepFieldError('promoMaxRedemptions')
                  ? 'border-red-400 dark:border-red-500'
                  : 'border-transparent'
              }`}
              value={eventForm.promoMaxRedemptions}
              onChangeText={(value) =>
                setEventForm((prev) => ({ ...prev, promoMaxRedemptions: value }))
              }
            />
            <TextInput
              placeholder={t('createEventPromoEndDatePlaceholder')}
              placeholderTextColor={isDark ? '#666' : '#999'}
              className={`mt-2 rounded-xl border bg-white p-3 text-gray-800 dark:bg-gray-800 dark:text-white ${
                isStepFieldError('promoEndsAt')
                  ? 'border-red-400 dark:border-red-500'
                  : 'border-transparent'
              }`}
              value={eventForm.promoEndsAt}
              onChangeText={(value) =>
                setEventForm((prev) => ({ ...prev, promoEndsAt: value }))
              }
            />
            <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
              {t('createEventPromoHint')}
            </Text>
          </View>
          ) : null}

          {currentStep === 3 ? (
          <View
            className={`rounded-2xl bg-gray-50 p-4 dark:bg-gray-900 ${
              isStepFieldError('ticketTypes')
                ? 'border border-red-300 dark:border-red-500'
                : ''
            }`}
            onLayout={(event) => {
              registerFieldOffset('ticketTypes', event.nativeEvent.layout.y);
            }}
          >
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
                <TextInput
                  placeholder={t('createEventTicketTypeDescriptionPlaceholder')}
                  placeholderTextColor={isDark ? '#666' : '#999'}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                  className="mt-2 rounded-xl bg-gray-50 p-3 text-gray-800 dark:bg-gray-900 dark:text-white"
                  value={ticketType.description}
                  onChangeText={(value) =>
                    updateTicketType(ticketType.id, 'description', value)
                  }
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
          ) : null}
          {currentStep === 1 ? (
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
          ) : null}

          {currentStep === 4 ? (
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
          ) : null}
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

        {stepError ? (
          <View className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 dark:border-red-900/60 dark:bg-red-900/20">
            <Text className="text-sm font-medium text-red-700 dark:text-red-300">
              {stepError}
            </Text>
          </View>
        ) : null}

        <View className="mb-10 mt-4 flex-row gap-3">
          <TouchableOpacity
            onPress={goToPreviousStep}
            disabled={loading || currentStep === 1}
            className={`flex-1 items-center rounded-xl border py-4 ${
              currentStep === 1
                ? 'border-gray-200 bg-gray-100 dark:border-gray-700 dark:bg-gray-800'
                : 'border-gray-300 bg-white dark:border-gray-700 dark:bg-gray-900'
            }`}
          >
            <Text className="text-base font-semibold text-gray-700 dark:text-gray-200">
              {t('createEventStepBack')}
            </Text>
          </TouchableOpacity>

          {currentStep < CREATE_EVENT_TOTAL_STEPS ? (
            <TouchableOpacity
              onPress={goToNextStep}
              disabled={loading}
              className="flex-1 items-center rounded-xl bg-[#4c669f] py-4"
            >
              <Text className="text-base font-semibold text-white">
                {t('createEventStepNext')}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={openPreview}
              disabled={loading}
              className="flex-1 items-center rounded-xl bg-[#ff4757] py-4"
            >
              {loading ? (
                <ActivityIndicator color="white" />
              ) : (
                <Text className="text-base font-bold text-white">
                  {t('createEventPublishNow')}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </EventFormWizard>

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
                {selectedPlaceName}
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
                <View className="flex-row items-center border-b border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
                  <TouchableOpacity onPress={() => setShowPicker(false)} className="w-20">
                    <Text className="font-medium text-gray-500">{t('genericCancel')}</Text>
                  </TouchableOpacity>
                  <Text className="flex-1 text-center text-lg font-bold text-gray-800 dark:text-white">
                    {pickerMode === 'date'
                      ? t('createEventPickerDateTitle')
                      : t('createEventPickerTimeTitle')}
                  </Text>
                  <TouchableOpacity onPress={() => setShowPicker(false)} className="w-20 items-end">
                    <Text className="text-lg font-bold text-[#4c669f]">
                      {t('createEventPickerConfirm')}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="items-center px-4 pt-2">
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
                      width: pickerModalWidth,
                      backgroundColor: isDark ? '#111827' : 'white',
                      alignSelf: 'center',
                    }}
                    textColor={isDark ? 'white' : 'black'}
                  />
                </View>
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

      {showCheckInPicker ? (
        Platform.OS === 'ios' ? (
          <Modal transparent animationType="slide" visible={showCheckInPicker}>
            <View className="flex-1 justify-end bg-black/50">
              <View className="overflow-hidden rounded-t-3xl bg-white pb-8 dark:bg-gray-900">
                <View className="flex-row items-center border-b border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800">
                  <TouchableOpacity
                    onPress={() => setShowCheckInPicker(false)}
                    className="w-20"
                  >
                    <Text className="font-medium text-gray-500">{t('genericCancel')}</Text>
                  </TouchableOpacity>
                  <Text className="flex-1 text-center text-lg font-bold text-gray-800 dark:text-white">
                    {checkInPickerTarget === 'open'
                      ? t('createEventCheckInPickerTitleOpen')
                      : t('createEventCheckInPickerTitleClose')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowCheckInPicker(false)}
                    className="w-20 items-end"
                  >
                    <Text className="text-lg font-bold text-[#4c669f]">
                      {t('createEventPickerConfirm')}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View className="items-center px-4 pt-2">
                  <DateTimePicker
                    value={checkInPickerValue}
                    mode="time"
                    is24Hour
                    display="spinner"
                    onChange={onCheckInPickerChange}
                    style={{
                      height: 200,
                      width: pickerModalWidth,
                      backgroundColor: isDark ? '#111827' : 'white',
                      alignSelf: 'center',
                    }}
                    textColor={isDark ? 'white' : 'black'}
                  />
                </View>
              </View>
            </View>
          </Modal>
        ) : (
          <DateTimePicker
            value={checkInPickerValue}
            mode="time"
            is24Hour
            display="default"
            onChange={onCheckInPickerChange}
          />
        )
      ) : null}
    </View>
  );
}
