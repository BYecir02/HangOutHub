import React, { useEffect, useMemo, useState } from 'react';
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
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import EventFormWizard from '@/components/ui/EventFormWizard';
import api, { getApiErrorMessage } from '@/services/api';
import { clearCache } from '@/services/dataCache';
import { getMySettings } from '@/services/settings';

interface OwnedPlaceOption {
  id: string;
  name: string;
  address?: string | null;
}

type EventPlaceSource = 'owned' | 'all';

interface DraftTicketType {
  id: string;
  name: string;
  description: string;
  price: string;
  quantity: string;
}

interface NormalizedTicketTypePayload {
  name: string;
  description: string;
  price: number;
  quantity: number;
}

interface EventImageItem {
  uri: string;
  fileName?: string;
  mimeType?: string;
  isLocal: boolean;
}

interface EventPayload {
  id: string;
  title: string;
  description?: string | null;
  cancellationPolicy?: string | null;
  refundPolicy?: string | null;
  startTime: string;
  endTime?: string | null;
  checkInOpensAtOffsetMin?: number | null;
  checkInClosesAtOffsetMin?: number | null;
  maxTicketsPerUser?: number | null;
  entryFee?: number | string | null;
  coverUrl?: string | null;
  images?: string[];
  placeId?: string | null;
  TicketType?: {
    id: string;
    name: string;
    description?: string | null;
    price: number | string;
    quantity: number;
  }[];
  Promotion?: {
    id: string;
    code?: string | null;
    discountType?: string | null;
    discountValue?: number | string | null;
    maxRedemptions?: number | null;
    endDate?: string | null;
  }[];
}

export default function EditEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const eventId = typeof params.id === 'string' ? params.id : '';
  const { width: windowWidth } = useWindowDimensions();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const pickerModalWidth = Math.max(280, Math.min(360, windowWidth - 24));
  const { locale, t } = useI18n();

  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ownedPlaces, setOwnedPlaces] = useState<OwnedPlaceOption[]>([]);
  const [allPlaces, setAllPlaces] = useState<OwnedPlaceOption[]>([]);
  const [placeSource, setPlaceSource] = useState<EventPlaceSource>('owned');
  const [placeSearch, setPlaceSearch] = useState('');
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
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
  const [ticketTypes, setTicketTypes] = useState<DraftTicketType[]>([]);
  const [initialTicketTypes, setInitialTicketTypes] = useState<
    NormalizedTicketTypePayload[]
  >([]);
  const [images, setImages] = useState<EventImageItem[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [currentField, setCurrentField] = useState<'start' | 'end'>('start');
  const [checkInInputMode, setCheckInInputMode] = useState<'picker' | 'manual'>(
    'picker',
  );
  const [showCheckInPicker, setShowCheckInPicker] = useState(false);
  const [checkInPickerTarget, setCheckInPickerTarget] = useState<'open' | 'close'>(
    'open',
  );
  const [checkInPickerValue, setCheckInPickerValue] = useState(new Date());

  const normalizeTicketTypes = (
    items: {
      name: string;
      description?: string | null;
      price: number | string;
      quantity: number | string;
    }[],
  ): NormalizedTicketTypePayload[] =>
    items.map((ticketType) => ({
      name: ticketType.name.trim(),
      description: (ticketType.description || '').trim(),
      price: Number(ticketType.price || 0),
      quantity: Number(ticketType.quantity || 0),
    }));

  const areTicketTypesEqual = (
    left: NormalizedTicketTypePayload[],
    right: NormalizedTicketTypePayload[],
  ) => {
    if (left.length !== right.length) {
      return false;
    }

    return left.every((item, index) => {
      const candidate = right[index];
      return (
        candidate !== undefined &&
        candidate.name === item.name &&
        candidate.description === item.description &&
        candidate.price === item.price &&
        candidate.quantity === item.quantity
      );
    });
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      if (!eventId) {
        setInitialLoading(false);
        return;
      }

      try {
        const [eventRes, meRes, allPlacesRes, settingsRes] = await Promise.all([
          api.get<EventPayload>(`/events/${eventId}`),
          api.get('/users/me'),
          api.get<OwnedPlaceOption[]>('/places'),
          getMySettings().catch(() => null),
        ]);

        if (!isMounted) {
          return;
        }

        const event = eventRes.data;
        const places = meRes.data?.OwnedPlaces || [];
        const fetchedPlaces = (allPlacesRes.data || []).map((place) => ({
          id: place.id,
          name: place.name,
          address: place.address,
        }));
        const openDefault = settingsRes?.organizerDefaultCheckInOpenOffsetMin;
        const closeDefault = settingsRes?.organizerDefaultCheckInCloseOffsetMin;
        const maxTicketsDefault = settingsRes?.organizerDefaultMaxTicketsPerUser;
        const cancellationPolicyDefault =
          settingsRes?.organizerDefaultCancellationPolicy || '';
        const refundPolicyDefault = settingsRes?.organizerDefaultRefundPolicy || '';
        const eventTicketTypes = (event.TicketType || []).map((ticketType) => ({
          id: ticketType.id,
          name: ticketType.name,
          description: ticketType.description || '',
          price: String(Number(ticketType.price || 0)),
          quantity: String(ticketType.quantity || 1),
        }));

        const existingCover = event.coverUrl || '';
        const existingGallery = (event.images || []).filter(
          (imageUrl) => imageUrl && imageUrl !== existingCover,
        );
        const eventPromo = event.Promotion?.[0];
        const mergedImages: EventImageItem[] = [];

        if (existingCover) {
          mergedImages.push({
            uri: existingCover,
            isLocal: false,
          });
        }

        for (const imageUrl of existingGallery) {
          mergedImages.push({
            uri: imageUrl,
            isLocal: false,
          });
        }

        setOwnedPlaces(places);
        setAllPlaces(fetchedPlaces);
        setSelectedPlaceId(
          event.placeId || places[0]?.id || fetchedPlaces[0]?.id || null,
        );
        setEventForm({
          title: event.title || '',
          description: event.description || '',
          cancellationPolicy: event.cancellationPolicy || cancellationPolicyDefault,
          refundPolicy: event.refundPolicy || refundPolicyDefault,
          startTime: new Date(event.startTime),
          endTime: new Date(event.endTime || event.startTime),
          checkInOpensAtOffsetMin: String(
            event.checkInOpensAtOffsetMin ?? openDefault ?? -60,
          ),
          checkInClosesAtOffsetMin: String(
            event.checkInClosesAtOffsetMin ?? closeDefault ?? 180,
          ),
          maxTicketsPerUser: String(event.maxTicketsPerUser ?? maxTicketsDefault ?? 1),
          promoCode: eventPromo?.code || '',
          promoType:
            eventPromo?.discountType?.toUpperCase() === 'FIXED' ? 'FIXED' : 'PERCENT',
          promoValue:
            eventPromo?.discountValue !== undefined && eventPromo?.discountValue !== null
              ? String(Number(eventPromo.discountValue))
              : '',
          promoMaxRedemptions:
            eventPromo?.maxRedemptions !== undefined && eventPromo?.maxRedemptions !== null
              ? String(eventPromo.maxRedemptions)
              : '',
          promoEndsAt: eventPromo?.endDate
            ? new Date(eventPromo.endDate).toISOString().slice(0, 16)
            : '',
        });
        setTicketTypes(
          eventTicketTypes.length > 0
            ? eventTicketTypes
            : [
                {
                  id: `ticket-${Date.now()}`,
                  name: 'Standard',
                  description: '',
                  price: String(Number(event.entryFee || 0)),
                  quantity: '100',
                },
              ],
        );
        setInitialTicketTypes(
          normalizeTicketTypes(
            eventTicketTypes.length > 0
              ? eventTicketTypes
              : [
                  {
                    name: 'Standard',
                    description: '',
                    price: String(Number(event.entryFee || 0)),
                    quantity: '100',
                  },
                ],
          ),
        );
        setImages(mergedImages);
        setCoverIndex(0);
      } catch {
        if (isMounted) {
          Alert.alert(t('commonErrorTitle'), t('eventEditLoadFailed'));
          router.back();
        }
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, [eventId, router, t]);

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

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      selectionLimit: 5,
      aspect: [16, 9],
      quality: 0.8,
    });

    if (!result.canceled) {
      const nextItems = result.assets.map((asset) => ({
        uri: asset.uri,
        fileName: asset.fileName || undefined,
        mimeType: asset.mimeType,
        isLocal: true,
      }));

      setImages((current) => [...current, ...nextItems]);
    }
  };

  const showDatepicker = (field: 'start' | 'end', mode: 'date' | 'time') => {
    setCurrentField(field);
    setPickerMode(mode);
    setShowPicker(true);
  };

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

  const onDateChange = (_event: unknown, selectedDate?: Date) => {
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

  const onCheckInPickerChange = (_event: unknown, selectedDate?: Date) => {
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

  const checkInOpenMinutes = Math.abs(parseOffsetMinutes(eventForm.checkInOpensAtOffsetMin, -60));
  const checkInCloseMinutes = Math.max(0, parseOffsetMinutes(eventForm.checkInClosesAtOffsetMin, 180));

  const openTeamScreen = () => {
    if (!eventId) {
      return;
    }

    router.push(`/organizer/event-team?id=${eventId}` as never);
  };

  const openRevisionsScreen = () => {
    if (!eventId) {
      return;
    }

    router.push(`/organizer/event-revisions?id=${eventId}` as never);
  };

  const handleSave = async () => {
    if (!eventId) {
      return;
    }

    if (!eventForm.title.trim()) {
      Alert.alert(t('commonErrorTitle'), t('createEventTitleRequired'));
      return;
    }

    if (eventForm.endTime < eventForm.startTime) {
      Alert.alert(t('commonErrorTitle'), t('createEventEndAfterStart'));
      return;
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
      return;
    }

    const serializedTicketTypes = normalizeTicketTypes(ticketTypes);
    const shouldUpdateTicketTypes = !areTicketTypesEqual(
      serializedTicketTypes,
      initialTicketTypes,
    );

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
      return;
    }

    const maxTicketsPerUser = Number(eventForm.maxTicketsPerUser || 1);
    if (!Number.isInteger(maxTicketsPerUser) || maxTicketsPerUser < 1 || maxTicketsPerUser > 20) {
      Alert.alert(t('commonErrorTitle'), t('createEventMaxTicketsPerUserInvalid'));
      return;
    }

    const normalizedPromoCode = eventForm.promoCode.trim().toUpperCase();
    let promoValue: number | null = null;
    let promoMaxRedemptions: number | null = null;
    let promoEndsAtIso: string | null = null;

    if (normalizedPromoCode) {
      promoValue = Number(eventForm.promoValue || 0);
      if (!Number.isFinite(promoValue) || promoValue <= 0) {
        Alert.alert(t('commonErrorTitle'), t('createEventPromoValueInvalid'));
        return;
      }

      if (eventForm.promoType === 'PERCENT' && promoValue > 100) {
        Alert.alert(t('commonErrorTitle'), t('createEventPromoValuePercentInvalid'));
        return;
      }

      if (eventForm.promoMaxRedemptions.trim()) {
        promoMaxRedemptions = Number(eventForm.promoMaxRedemptions);
        if (!Number.isInteger(promoMaxRedemptions) || promoMaxRedemptions < 1) {
          Alert.alert(t('commonErrorTitle'), t('createEventPromoQuotaInvalid'));
          return;
        }
      }

      if (eventForm.promoEndsAt.trim()) {
        const parsedPromoEnd = new Date(eventForm.promoEndsAt);
        if (Number.isNaN(parsedPromoEnd.getTime())) {
          Alert.alert(t('commonErrorTitle'), t('createEventPromoEndDateInvalid'));
          return;
        }

        promoEndsAtIso = parsedPromoEnd.toISOString();
      }
    }

    const minimumPrice =
      serializedTicketTypes.length > 0
        ? Math.min(...serializedTicketTypes.map((ticketType) => ticketType.price))
        : 0;

    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('title', eventForm.title.trim());
      formData.append('description', eventForm.description.trim());
      formData.append('cancellationPolicy', eventForm.cancellationPolicy.trim());
      formData.append('refundPolicy', eventForm.refundPolicy.trim());
      formData.append('startTime', eventForm.startTime.toISOString());
      formData.append('endTime', eventForm.endTime.toISOString());
      formData.append('entryFee', String(minimumPrice));
      if (shouldUpdateTicketTypes) {
        formData.append('ticketTypes', JSON.stringify(serializedTicketTypes));
      }
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
      } else {
        formData.append('promoCode', '');
      }

      if (selectedPlaceId) {
        formData.append('placeId', selectedPlaceId);
      }

      if (images.length > 0) {
        const coverImage = images[coverIndex];

        if (coverImage?.isLocal) {
          formData.append('cover', {
            uri: coverImage.uri,
            name: coverImage.fileName || 'event-cover.jpg',
            type: coverImage.mimeType || 'image/jpeg',
          } as never);
        } else if (coverImage?.uri) {
          formData.append('existingCoverUrl', coverImage.uri);
        }

        const retainedGallery = images
          .filter((_, index) => index !== coverIndex)
          .filter((item) => !item.isLocal)
          .map((item) => item.uri);
        formData.append('existingImages', JSON.stringify(retainedGallery));

        images.forEach((item, index) => {
          if (index === coverIndex || !item.isLocal) {
            return;
          }

          formData.append('gallery', {
            uri: item.uri,
            name: item.fileName || `gallery-${index}.jpg`,
            type: item.mimeType || 'image/jpeg',
          } as never);
        });
      } else {
        formData.append('existingCoverUrl', '');
        formData.append('existingImages', '[]');
      }

      await api.patch(`/events/${eventId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      clearCache('events');
      clearCache('discover');

      Alert.alert(t('eventEditSuccessTitle'), t('eventEditSuccessMessage'));
      router.replace({
        pathname: '/event/[id]',
        params: { id: eventId },
      });
    } catch (error) {
      Alert.alert(
        t('commonErrorTitle'),
        getApiErrorMessage(error, t('eventEditSaveFailed')),
      );
    } finally {
      setSaving(false);
    }
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

  if (initialLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }

  return (
    <View className="flex-1">
      <EventFormWizard
        title={t('eventEditTitle')}
        onClose={() => router.back()}
        closeIconColor={isDark ? '#fff' : '#333'}
        rightActions={
          <>
            <TouchableOpacity
              onPress={openTeamScreen}
              className="rounded-xl border border-[#4c669f] px-3 py-2"
            >
              <Text className="text-xs font-semibold text-[#4c669f]">
                {t('eventEditOpenTeam')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={openRevisionsScreen}
              className="ml-2 rounded-xl border border-gray-300 px-3 py-2 dark:border-gray-700"
            >
              <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                {t('eventEditOpenRevisions')}
              </Text>
            </TouchableOpacity>
          </>
        }
      >
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
                    index === coverIndex ? 'border-[#4c669f]' : 'border-transparent'
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

            {availablePlaces.length > 0 ? (
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
                    ? 'border-[#4c669f] bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`text-center text-sm font-semibold ${
                    eventForm.promoType === 'PERCENT'
                      ? 'text-[#4c669f]'
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
                    ? 'border-[#4c669f] bg-blue-50 dark:bg-blue-900/20'
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`text-center text-sm font-semibold ${
                    eventForm.promoType === 'FIXED'
                      ? 'text-[#4c669f]'
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
                className="rounded-full border border-[#4c669f] px-3 py-1.5"
              >
                <Text className="text-xs font-semibold text-[#4c669f]">
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
          onPress={handleSave}
          disabled={saving}
          className="mb-10 mt-8 items-center rounded-xl bg-[#4c669f] py-4"
        >
          {saving ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text className="text-lg font-bold text-white">
              {t('eventEditSaveButton')}
            </Text>
          )}
        </TouchableOpacity>
      </EventFormWizard>

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
                    width: pickerModalWidth,
                    backgroundColor: isDark ? '#111827' : 'white',
                    alignSelf: 'center',
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
