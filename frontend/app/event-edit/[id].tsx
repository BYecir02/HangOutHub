import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import api from '@/services/api';

interface OwnedPlaceOption {
  id: string;
  name: string;
  address?: string | null;
}

interface DraftTicketType {
  id: string;
  name: string;
  price: string;
  quantity: string;
}

interface EventPayload {
  id: string;
  title: string;
  description?: string | null;
  startTime: string;
  endTime?: string | null;
  entryFee?: number | string | null;
  placeId?: string | null;
  TicketType?: Array<{
    id: string;
    name: string;
    price: number | string;
    quantity: number;
  }>;
}

export default function EditEventScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const eventId = typeof params.id === 'string' ? params.id : '';
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { locale, t } = useI18n();

  const [initialLoading, setInitialLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [ownedPlaces, setOwnedPlaces] = useState<OwnedPlaceOption[]>([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    startTime: new Date(),
    endTime: new Date(Date.now() + 3600000),
  });
  const [ticketTypes, setTicketTypes] = useState<DraftTicketType[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [currentField, setCurrentField] = useState<'start' | 'end'>('start');

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      if (!eventId) {
        setInitialLoading(false);
        return;
      }

      try {
        const [eventRes, meRes] = await Promise.all([
          api.get<EventPayload>(`/events/${eventId}`),
          api.get('/users/me'),
        ]);

        if (!isMounted) {
          return;
        }

        const event = eventRes.data;
        const places = meRes.data?.OwnedPlaces || [];
        const eventTicketTypes = (event.TicketType || []).map((ticketType) => ({
          id: ticketType.id,
          name: ticketType.name,
          price: String(Number(ticketType.price || 0)),
          quantity: String(ticketType.quantity || 1),
        }));

        setOwnedPlaces(places);
        setSelectedPlaceId(event.placeId || places[0]?.id || null);
        setEventForm({
          title: event.title || '',
          description: event.description || '',
          startTime: new Date(event.startTime),
          endTime: new Date(event.endTime || event.startTime),
        });
        setTicketTypes(
          eventTicketTypes.length > 0
            ? eventTicketTypes
            : [
                {
                  id: `ticket-${Date.now()}`,
                  name: 'Standard',
                  price: String(Number(event.entryFee || 0)),
                  quantity: '100',
                },
              ],
        );
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

  const showDatepicker = (field: 'start' | 'end', mode: 'date' | 'time') => {
    setCurrentField(field);
    setPickerMode(mode);
    setShowPicker(true);
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

    const serializedTicketTypes = ticketTypes.map((ticketType) => ({
      name: ticketType.name.trim(),
      price: Number(ticketType.price || 0),
      quantity: Number(ticketType.quantity || 0),
    }));

    const minimumPrice = serializedTicketTypes.length > 0
      ? Math.min(...serializedTicketTypes.map((ticketType) => ticketType.price))
      : 0;

    setSaving(true);
    try {
      await api.patch(`/events/${eventId}`, {
        title: eventForm.title.trim(),
        description: eventForm.description.trim(),
        startTime: eventForm.startTime.toISOString(),
        endTime: eventForm.endTime.toISOString(),
        entryFee: minimumPrice,
        placeId: selectedPlaceId || undefined,
        ticketTypes: JSON.stringify(serializedTicketTypes),
      });

      Alert.alert(t('eventEditSuccessTitle'), t('eventEditSuccessMessage'));
      router.replace({
        pathname: '/event/[id]',
        params: { id: eventId },
      });
    } catch {
      Alert.alert(t('commonErrorTitle'), t('eventEditSaveFailed'));
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

  if (initialLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-white dark:bg-black">
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white pt-14 dark:bg-black">
      <View className="flex-row items-center border-b border-gray-100 px-5 pb-4 dark:border-gray-800">
        <TouchableOpacity
          onPress={() => router.back()}
          className="mr-4 rounded-full bg-gray-50 p-2 dark:bg-gray-800"
        >
          <Ionicons name="close" size={24} color={isDark ? '#fff' : '#333'} />
        </TouchableOpacity>
        <Text className="flex-1 text-xl font-bold text-gray-800 dark:text-white">
          {t('eventEditTitle')}
        </Text>
      </View>

      <ScrollView className="flex-1 p-5" showsVerticalScrollIndicator={false}>
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
            {ownedPlaces.length > 0 ? (
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
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {t('createEventNoAttachedPlace')}
              </Text>
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
      </ScrollView>

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