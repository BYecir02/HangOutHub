import React, { useEffect, useRef, useState } from 'react';
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
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as SecureStore from 'expo-secure-store';

import ScreenHeader from '@/shared/ui/ScreenHeader';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { useI18n } from '@/shared/hooks/use-i18n';
import api, { getImageUrl } from '@/services/api';
import { formatEventDate } from '@/services/shared/formatters';

interface PlaceOption {
  id: string;
  name: string;
  address?: string | null;
  City?: {
    id: number;
    name: string;
  } | null;
}

interface FriendshipOverview {
  connections: {
    friendshipId: string;
    user: {
      id: string;
      username: string;
      displayName?: string | null;
      avatarUrl?: string | null;
    };
  }[];
}

interface OutingDraftPayload {
  title: string;
  scheduledDate: string;
  selectedPlaceId: string | null;
  selectedParticipantIds: string[];
  currentStep: number;
}

function getInitialScheduledDate(rawValue?: string) {
  if (!rawValue) {
    return new Date(Date.now() + 2 * 60 * 60 * 1000);
  }

  const parsedDate = new Date(rawValue);
  return Number.isNaN(parsedDate.getTime())
    ? new Date(Date.now() + 2 * 60 * 60 * 1000)
    : parsedDate;
}

export default function CreateOutingScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    title?: string;
    placeId?: string;
    scheduledDate?: string;
    sourceLabel?: string;
    eventId?: string;
  }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { locale, t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [placesLoading, setPlacesLoading] = useState(true);
  const [connectionsLoading, setConnectionsLoading] = useState(true);
  const [places, setPlaces] = useState<PlaceOption[]>([]);
  const [connections, setConnections] = useState<
    FriendshipOverview['connections']
  >([]);
  const [selectedPlaceId, setSelectedPlaceId] = useState<string | null>(null);
  const [selectedParticipantIds, setSelectedParticipantIds] = useState<string[]>(
    [],
  );
  const [title, setTitle] = useState('');
  const [scheduledDate, setScheduledDate] = useState<Date>(() =>
    getInitialScheduledDate(
      typeof params.scheduledDate === 'string' ? params.scheduledDate : undefined,
    ),
  );
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [currentStep, setCurrentStep] = useState(1);
  const isEventFlow = Boolean(params.eventId);
  const totalSteps = isEventFlow ? 2 : 3;
  const isDraftHydratedRef = useRef(false);
  const lastSavedDraftRef = useRef<string | null>(null);
  const OUTING_DRAFT_KEY = 'outing-draft-v1';
  const scheduledDateLabel = formatEventDate(scheduledDate, locale);

  useEffect(() => {
    if (typeof params.title === 'string' && params.title.trim()) {
      setTitle(params.title);
    }

    if (typeof params.scheduledDate === 'string') {
      setScheduledDate(getInitialScheduledDate(params.scheduledDate));
    }
  }, [params.scheduledDate, params.title]);

  useEffect(() => {
    let isMounted = true;

    const fetchPlaces = async () => {
      try {
        const response = await api.get<PlaceOption[]>('/places');
        if (isMounted) {
          setPlaces(response.data);
          const preselectedPlaceId =
            typeof params.placeId === 'string' &&
            response.data.some((place) => place.id === params.placeId)
              ? params.placeId
              : null;

          if (isEventFlow) {
            setSelectedPlaceId(preselectedPlaceId || null);
          } else {
            setSelectedPlaceId(preselectedPlaceId || response.data[0]?.id || null);
          }
        }
      } catch {
        if (isMounted) {
          setPlaces([]);
          setSelectedPlaceId(null);
        }
      } finally {
        if (isMounted) {
          setPlacesLoading(false);
        }
      }
    };

    void fetchPlaces();

    return () => {
      isMounted = false;
    };
  }, [isEventFlow, params.placeId]);

  useEffect(() => {
    let isMounted = true;

    const fetchConnections = async () => {
      try {
        const response = await api.get<FriendshipOverview>('/friendships/mine');
        if (isMounted) {
          setConnections(response.data.connections);
        }
      } catch {
        if (isMounted) {
          setConnections([]);
        }
      } finally {
        if (isMounted) {
          setConnectionsLoading(false);
        }
      }
    };

    void fetchConnections();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const hydrateDraft = async () => {
      try {
        const rawDraft = await SecureStore.getItemAsync(OUTING_DRAFT_KEY);
        if (!isMounted) {
          return;
        }

        if (!rawDraft) {
          isDraftHydratedRef.current = true;
          return;
        }

        const parsed = JSON.parse(rawDraft) as OutingDraftPayload;
        setTitle(parsed.title || '');
        setScheduledDate(getInitialScheduledDate(parsed.scheduledDate));
        setSelectedPlaceId(parsed.selectedPlaceId ?? null);
        setSelectedParticipantIds(
          Array.isArray(parsed.selectedParticipantIds)
            ? parsed.selectedParticipantIds
            : [],
        );
        setCurrentStep(
          parsed.currentStep && parsed.currentStep >= 1 && parsed.currentStep <= totalSteps
            ? parsed.currentStep
            : 1,
        );
        lastSavedDraftRef.current = rawDraft;
      } catch {
        // ignore draft errors
      } finally {
        if (isMounted) {
          isDraftHydratedRef.current = true;
        }
      }
    };

    void hydrateDraft();

    return () => {
      isMounted = false;
    };
  }, [totalSteps]);

  useEffect(() => {
    if (!isDraftHydratedRef.current) {
      return;
    }

    const payload: OutingDraftPayload = {
      title,
      scheduledDate: scheduledDate.toISOString(),
      selectedPlaceId,
      selectedParticipantIds,
      currentStep,
    };
    const serialized = JSON.stringify(payload);

    if (serialized === lastSavedDraftRef.current) {
      return;
    }

    const timeoutId = setTimeout(() => {
      void SecureStore.setItemAsync(OUTING_DRAFT_KEY, serialized).then(() => {
        lastSavedDraftRef.current = serialized;
      });
    }, 700);

    return () => clearTimeout(timeoutId);
  }, [currentStep, scheduledDate, selectedParticipantIds, selectedPlaceId, title]);

  const toggleParticipant = (participantId: string) => {
    setSelectedParticipantIds((current) =>
      current.includes(participantId)
        ? current.filter((id) => id !== participantId)
        : [...current, participantId],
    );
  };

  const onDateChange = (_event: unknown, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowPicker(false);
    }

    if (!selectedDate) {
      return;
    }

    setScheduledDate(selectedDate);
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!title.trim()) {
        Alert.alert(t('commonErrorTitle'), t('outingCreateRequiredTitle'));
        return false;
      }

      if (!isEventFlow && scheduledDate.getTime() < Date.now()) {
        Alert.alert(t('commonErrorTitle'), t('outingCreateDateInvalid'));
        return false;
      }
    }

    return true;
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    setCurrentStep((step) => Math.min(totalSteps, step + 1));
  };

  const handlePrevStep = () => {
    setCurrentStep((step) => Math.max(1, step - 1));
  };

  const handleSkipPlace = () => {
    if (isEventFlow) {
      return;
    }
    setSelectedPlaceId(null);
    setCurrentStep(3);
  };

  const handleCreateOuting = async () => {
    if (!title.trim()) {
      Alert.alert(t('commonErrorTitle'), t('outingCreateRequiredTitle'));
      return;
    }

    if (!isEventFlow && scheduledDate.getTime() < Date.now()) {
      Alert.alert(t('commonErrorTitle'), t('outingCreateDateInvalid'));
      return;
    }

    setLoading(true);

    try {
      await api.post('/outings', {
        title: title.trim(),
        scheduledDate: scheduledDate.toISOString(),
        placeId: selectedPlaceId || undefined,
        participantIds: selectedParticipantIds,
      });

      await SecureStore.deleteItemAsync(OUTING_DRAFT_KEY);
      lastSavedDraftRef.current = null;

      Alert.alert(t('outingCreateSuccessTitle'), t('outingCreateSuccessMessage'));
      router.replace('/(tabs)/profile');
    } catch (error) {
      console.error(error);
      Alert.alert(t('commonErrorTitle'), t('outingCreateFailedMessage'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white pt-14 dark:bg-black">
      <View className="border-b border-gray-100 px-5 pb-4 dark:border-gray-800">
        <ScreenHeader
          title={t('outingCreateTitle')}
          onBack={() => router.back()}
          backIcon="close"
        />
      </View>

      <ScrollView className="flex-1 px-5 py-5" showsVerticalScrollIndicator={false}>
        <View className="rounded-3xl bg-[#4c669f]/10 p-5">
          <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-[#4c669f]">
            {t('outingCreateLabel')}
          </Text>
          <Text className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
            {t('outingCreateHeroTitle')}
          </Text>
          <Text className="mt-3 text-base leading-7 text-gray-600 dark:text-gray-300">
            {t('outingCreateHeroSubtitle')}
          </Text>
          <View className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/60 dark:bg-gray-900/50">
            <View
              className="h-full rounded-full bg-[#4c669f]"
              style={{ width: `${Math.round((currentStep / totalSteps) * 100)}%` }}
            />
          </View>
          <View className="mt-4 self-start rounded-full bg-white/70 px-3 py-1.5 dark:bg-gray-900/60">
            <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
              {t('outingCreateStepLabel', { current: currentStep, total: totalSteps })}
            </Text>
          </View>
        </View>

        <View className="mt-6 gap-4">
          {currentStep === 1 ? (
            <>
              <TextInput
                placeholder={t('outingCreateInputTitlePlaceholder')}
                placeholderTextColor={isDark ? '#666' : '#999'}
                className="rounded-2xl bg-gray-50 p-4 text-lg font-semibold text-gray-800 dark:bg-gray-800 dark:text-white"
                value={title}
                onChangeText={setTitle}
              />

              {isEventFlow ? (
                <View className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
                  <Text className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    {t('outingCreateEventSummaryTitle')}
                  </Text>
                  <Text className="text-base font-semibold text-gray-900 dark:text-white">
                    {params.sourceLabel || title}
                  </Text>
                  <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                    {t('outingCreateEventDateFixed')}
                  </Text>
                  <Text className="mt-1 text-base text-gray-800 dark:text-white">
                    {scheduledDateLabel}
                  </Text>
                  {selectedPlaceId ? (
                    <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                      {t('outingCreateEventPlaceLabel')}:{' '}
                      {places.find((place) => place.id === selectedPlaceId)?.name ||
                        t('homeAddressToConfirm')}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
                  <Text className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                    {t('outingCreateDateTimeLabel')}
                  </Text>

                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      onPress={() => {
                        setPickerMode('date');
                        setShowPicker(true);
                      }}
                      className="flex-1 items-center rounded-xl bg-white p-3 dark:bg-gray-800"
                    >
                      <Text className="text-gray-800 dark:text-white">
                        {scheduledDate.toLocaleDateString(locale)}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setPickerMode('time');
                        setShowPicker(true);
                      }}
                      className="flex-1 items-center rounded-xl bg-white p-3 dark:bg-gray-800"
                    >
                      <Text className="text-gray-800 dark:text-white">
                        {scheduledDate.toLocaleTimeString(locale, {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </>
          ) : null}

          {currentStep === 2 && !isEventFlow ? (
            <View className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
              <Text className="mb-3 text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                {selectedPlaceId
                  ? t('outingCreateSelectedPlaceLabel')
                  : t('outingCreateSuggestedPlaceLabel')}
              </Text>

              {placesLoading ? (
                <ActivityIndicator color="#4c669f" />
              ) : places.length > 0 ? (
                places.slice(0, 6).map((place) => (
                  <TouchableOpacity
                    key={place.id}
                    onPress={() => setSelectedPlaceId(place.id)}
                    className={`mb-3 rounded-2xl border p-4 ${
                      selectedPlaceId === place.id
                        ? 'border-[#4c669f] bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                    }`}
                  >
                    <Text className="text-base font-semibold text-gray-900 dark:text-white">
                      {place.name}
                    </Text>
                    <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      {place.City?.name || place.address || t('homeAddressToConfirm')}
                    </Text>
                  </TouchableOpacity>
                ))
              ) : (
                <Text className="text-sm text-gray-500 dark:text-gray-400">
                  {t('outingCreateNoPlace')}
                </Text>
              )}

              <TouchableOpacity
                onPress={() => setSelectedPlaceId(null)}
                className={`mt-2 self-start rounded-full px-4 py-2 ${
                  selectedPlaceId === null
                    ? 'bg-[#4c669f]'
                    : 'bg-white dark:bg-gray-800'
                }`}
              >
                <Text
                  className={`font-semibold ${
                    selectedPlaceId === null
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {t('outingCreateFreeMode')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {currentStep === (isEventFlow ? 2 : 3) ? (
            <View className="rounded-2xl bg-gray-50 p-4 dark:bg-gray-900">
              <View className="mb-3 flex-row items-center justify-between">
                <Text className="text-sm font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {t('outingCreateInviteConnectionsLabel')}
                </Text>
                {selectedParticipantIds.length > 0 ? (
                  <View className="rounded-full bg-[#4c669f]/10 px-3 py-1">
                    <Text className="text-xs font-semibold text-[#4c669f]">
                      {selectedParticipantIds.length > 1
                        ? t('outingCreateSelectionMany', {
                            count: selectedParticipantIds.length,
                          })
                        : t('outingCreateSelectionOne', {
                            count: selectedParticipantIds.length,
                          })}
                    </Text>
                  </View>
                ) : null}
              </View>

              {connectionsLoading ? (
                <ActivityIndicator color="#4c669f" />
              ) : connections.length > 0 ? (
                <>
                  {connections.map((connection) => {
                    const isSelected = selectedParticipantIds.includes(
                      connection.user.id,
                    );

                    return (
                      <TouchableOpacity
                        key={connection.friendshipId}
                        onPress={() => toggleParticipant(connection.user.id)}
                        className={`mb-3 flex-row items-center rounded-2xl border p-3 ${
                          isSelected
                            ? 'border-[#4c669f] bg-blue-50 dark:bg-blue-900/20'
                            : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                        }`}
                      >
                        <Image
                          source={{
                            uri:
                              getImageUrl(connection.user.avatarUrl) ||
                              `https://i.pravatar.cc/150?u=${connection.user.id}`,
                          }}
                          className="h-12 w-12 rounded-full bg-gray-200 dark:bg-gray-700"
                          resizeMode="cover"
                        />
                        <View className="ml-3 flex-1">
                          <Text className="text-base font-semibold text-gray-900 dark:text-white">
                            {connection.user.displayName || connection.user.username}
                          </Text>
                          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            @{connection.user.username}
                          </Text>
                        </View>
                        <View
                          className={`h-7 w-7 items-center justify-center rounded-full border ${
                            isSelected
                              ? 'border-[#4c669f] bg-[#4c669f]'
                              : 'border-gray-300 dark:border-gray-600'
                          }`}
                        >
                          {isSelected ? (
                            <Ionicons name="checkmark" size={16} color="white" />
                          ) : null}
                        </View>
                      </TouchableOpacity>
                    );
                  })}

                  <TouchableOpacity
                    onPress={() => router.push('/search')}
                    className="mt-1 self-start rounded-full bg-white px-4 py-2 dark:bg-gray-800"
                  >
                    <Text className="font-semibold text-[#4c669f]">
                      {t('outingCreateAddMoreConnections')}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View className="rounded-2xl bg-white p-4 dark:bg-gray-800">
                  <Text className="text-sm text-gray-500 dark:text-gray-400">
                    {t('outingCreateNoConnections')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/search')}
                    className="mt-4 self-start rounded-full bg-[#4c669f] px-4 py-2"
                  >
                    <Text className="font-semibold text-white">
                      {t('outingCreateOpenSearch')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          ) : null}
        </View>

        <View className="mb-10 mt-8">
          {currentStep === 2 && !isEventFlow ? (
            <TouchableOpacity onPress={handleSkipPlace} className="mb-3 self-end">
              <Text className="text-sm font-semibold text-[#4c669f]">
                {t('outingCreateStepSkipPlace')}
              </Text>
            </TouchableOpacity>
          ) : null}

          <View className="flex-row gap-3">
            {currentStep > 1 ? (
              <TouchableOpacity
                onPress={handlePrevStep}
                className="flex-1 items-center rounded-2xl border border-gray-200 bg-white py-4 dark:border-gray-700 dark:bg-gray-900"
              >
                <Text className="text-lg font-bold text-gray-700 dark:text-gray-200">
                  {t('outingCreateStepBack')}
                </Text>
              </TouchableOpacity>
            ) : null}

            {currentStep < totalSteps ? (
              <TouchableOpacity
                onPress={handleNextStep}
                className="flex-1 items-center rounded-2xl bg-[#4c669f] py-4"
              >
                <Text className="text-lg font-bold text-white">
                  {t('outingCreateStepNext')}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={handleCreateOuting}
                disabled={loading}
                className="flex-1 items-center rounded-2xl bg-[#4c669f] py-4"
              >
                {loading ? (
                  <ActivityIndicator color="white" />
                ) : (
                  <Text className="text-lg font-bold text-white">
                    {t('outingCreateSubmit')}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
        </View>
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
                  value={scheduledDate}
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
            value={scheduledDate}
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
