import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';

import FormImagePicker from '@/components/forms/FormImagePicker';
import FormTextArea from '@/components/forms/FormTextArea';
import FormTextField from '@/components/forms/FormTextField';
import ScreenHeader from '@/components/ui/ScreenHeader';
import ScreenState from '@/components/ui/ScreenState';
import { useI18n } from '@/hooks/use-i18n';
import api, { getApiErrorMessage } from '@/services/api';
import { getCache, setCache } from '@/services/dataCache';
import { getStoredLocation } from '@/services/location-preferences';
import { patchStoredUserSession } from '@/services/user-session';

const PRICE_LEVELS = [1, 2, 3, 4] as const;
const PHONE_REGEX = /^\+?[0-9\s().-]{8,20}$/;
const CREATE_PLACE_TOTAL_STEPS = 5;
const DAY_ORDER = [
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
] as const;
type DayKey = (typeof DAY_ORDER)[number];

type UploadFile = {
  uri: string;
  name: string;
  type: string;
};

type CityOption = {
  id: number;
  name: string;
  region?: string | null;
  country?: string | null;
};

type PlaceTagOption = {
  id: number;
  name: string;
  status?: string | null;
};

type PlaceCategoryOption = {
  id: number;
  name: string;
  Tag?: PlaceTagOption[];
};

type DaySchedule = {
  openHour: string;
  openMinute: string;
  closeHour: string;
  closeMinute: string;
};

const toUploadFile = (
  image: ImagePicker.ImagePickerAsset,
  fallbackName: string,
): UploadFile => ({
  uri: image.uri,
  name: image.fileName || fallbackName,
  type: image.mimeType || 'image/jpeg',
});

const createInitialWeeklySchedule = (): Record<DayKey, DaySchedule> =>
  DAY_ORDER.reduce(
    (acc, day) => ({
      ...acc,
      [day]: {
        openHour: '',
        openMinute: '',
        closeHour: '',
        closeMinute: '',
      },
    }),
    {} as Record<DayKey, DaySchedule>,
  );

export default function CreatePlaceScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const [loading, setLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedCountry, setSelectedCountry] = useState('');
  const [selectedCity, setSelectedCity] = useState<CityOption | null>(null);
  const [categories, setCategories] = useState<PlaceCategoryOption[]>(
    () => getCache<PlaceCategoryOption[]>('categories') || [],
  );
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [categoriesError, setCategoriesError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [weeklySchedule, setWeeklySchedule] = useState<Record<DayKey, DaySchedule>>(
    createInitialWeeklySchedule,
  );
  const [address, setAddress] = useState('');
  const [latitudeInput, setLatitudeInput] = useState('');
  const [longitudeInput, setLongitudeInput] = useState('');
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [priceLevel, setPriceLevel] = useState<(typeof PRICE_LEVELS)[number]>(1);
  const dayLabels = useMemo(
    () => ({
      monday: t('createPlaceDayMonday'),
      tuesday: t('createPlaceDayTuesday'),
      wednesday: t('createPlaceDayWednesday'),
      thursday: t('createPlaceDayThursday'),
      friday: t('createPlaceDayFriday'),
      saturday: t('createPlaceDaySaturday'),
      sunday: t('createPlaceDaySunday'),
    }),
    [t],
  );
  const parsedCoordinates = useMemo(() => {
    const lat = Number(latitudeInput.replace(',', '.'));
    const lng = Number(longitudeInput.replace(',', '.'));
    if (Number.isNaN(lat) || Number.isNaN(lng)) {
      return null;
    }
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return null;
    }
    return { lat, lng };
  }, [latitudeInput, longitudeInput]);
  const selectedCategoryOption = useMemo(
    () => categories.find((option) => option.id === selectedCategoryId) || null,
    [categories, selectedCategoryId],
  );
  const availableTags = useMemo(
    () => selectedCategoryOption?.Tag || [],
    [selectedCategoryOption],
  );
  const stepTitle = useMemo(() => {
    if (currentStep === 1) {
      return t('createPlaceStepTitleBasics');
    }
    if (currentStep === 2) {
      return t('createPlaceStepTitleHours');
    }
    if (currentStep === 3) {
      return t('createPlaceStepTitleLocation');
    }
    if (currentStep === 4) {
      return t('createPlaceStepTitlePhotos');
    }
    return t('createPlaceStepTitleReview');
  }, [currentStep, t]);

  const schedulePreviewByDay = useMemo(
    () =>
      DAY_ORDER.map((day) => {
        const schedule = weeklySchedule[day];
        const hasAnyValue = Object.values(schedule).some((part) => part.trim().length > 0);
        let display = t('createPlaceHoursClosed');
        if (hasAnyValue) {
          const isComplete = Object.values(schedule).every((part) => part.trim().length > 0);
          if (isComplete) {
            display = `${schedule.openHour.padStart(2, '0')}:${schedule.openMinute.padStart(2, '0')} - ${schedule.closeHour.padStart(2, '0')}:${schedule.closeMinute.padStart(2, '0')}`;
          } else {
            display = t('createPlaceHoursIncomplete');
          }
        }
        return {
          day,
          label: dayLabels[day],
          display,
          hasAnyValue,
        };
      }),
    [dayLabels, t, weeklySchedule],
  );
  const hasDraftChanges = useMemo(() => {
    const hasSchedule =
      DAY_ORDER.some((day) =>
        Object.values(weeklySchedule[day]).some((part) => part.trim().length > 0),
      );

    return Boolean(
      name.trim()
      || description.trim()
      || selectedCategory.trim()
      || selectedCategoryId !== null
      || selectedTagIds.length > 0
      || phone.trim()
      || whatsapp.trim()
      || selectedCountry.trim()
      || selectedCity
      || latitudeInput.trim()
      || longitudeInput.trim()
      || images.length > 0
      || hasSchedule
      || priceLevel !== 1,
    );
  }, [
    description,
    images.length,
    latitudeInput,
    longitudeInput,
    name,
    phone,
    priceLevel,
    selectedCategory,
    selectedCategoryId,
    selectedTagIds.length,
    selectedCity,
    selectedCountry,
    whatsapp,
    weeklySchedule,
  ]);

  const loadCategories = useCallback(async (signal?: AbortSignal) => {
    setCategoriesLoading(true);
    setCategoriesError(null);
    try {
      const response = await api.get<PlaceCategoryOption[]>('/categories', { signal });
      const nextCategories = response.data || [];
      setCategories(nextCategories);
      setCache('categories', nextCategories);
    } catch (error) {
      if (signal?.aborted) return;
      setCategoriesError(
        getApiErrorMessage(error, t('createPlaceCategoryLoadFailed')),
      );
    } finally {
      if (!signal?.aborted) {
        setCategoriesLoading(false);
      }
    }
  }, [t]);

  useEffect(() => {
    if (categories.length > 0 && categories.some((category) => Array.isArray(category.Tag))) {
      return;
    }
    const controller = new AbortController();
    void loadCategories(controller.signal);
    return () => controller.abort();
  }, [categories.length, loadCategories]);

  useEffect(() => {
    if (!selectedCategoryOption) {
      return;
    }

    if (availableTags.length === 0) {
      if (selectedTagIds.length > 0) {
        setSelectedTagIds([]);
      }
      return;
    }

    const allowedTagIds = new Set(availableTags.map((tag) => tag.id));
    const filteredTagIds = selectedTagIds.filter((tagId) => allowedTagIds.has(tagId));

    if (filteredTagIds.length === 0) {
      setSelectedTagIds([availableTags[0].id]);
      return;
    }

    if (filteredTagIds.length !== selectedTagIds.length) {
      setSelectedTagIds(filteredTagIds);
    }
  }, [availableTags, selectedCategoryOption, selectedTagIds]);

  useEffect(() => {
    if (!selectedCountry || !selectedCity?.country) {
      return;
    }

    if (selectedCity.country.toLowerCase() !== selectedCountry.toLowerCase()) {
      setSelectedCity(null);
    }
  }, [selectedCity, selectedCountry]);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      const hydrateLocationSelection = async () => {
        const storedLocation = await getStoredLocation();
        if (!mounted) {
          return;
        }

        if (storedLocation?.mode === 'city' && storedLocation.cityId && storedLocation.cityName) {
          setSelectedCountry(storedLocation.country || '');
          setSelectedCity({
            id: storedLocation.cityId,
            name: storedLocation.cityName,
            region: storedLocation.region ?? null,
            country: storedLocation.country ?? null,
          });
          return;
        }

        setSelectedCountry(storedLocation?.country || '');
        setSelectedCity(null);
      };

      void hydrateLocationSelection();

      return () => {
        mounted = false;
      };
    }, []),
  );

  const openLocationSelector = useCallback(() => {
    router.push('/location');
  }, [router]);

  const updateScheduleField = (
    day: DayKey,
    field: keyof DaySchedule,
    value: string,
  ) => {
    const numericValue = value.replace(/\D/g, '').slice(0, 2);
    setWeeklySchedule((current) => ({
      ...current,
      [day]: {
        ...current[day],
        [field]: numericValue,
      },
    }));
    setSubmitError(null);
  };

  const toggleTag = useCallback((tagId: number) => {
    setSelectedTagIds((current) => {
      if (current.includes(tagId)) {
        if (current.length === 1) {
          return current;
        }

        return current.filter((currentTagId) => currentTagId !== tagId);
      }

      return [...current, tagId];
    });
    setSubmitError(null);
  }, []);

  const padTimePart = (value: string) => value.padStart(2, '0');

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: 'images',
      allowsMultipleSelection: true,
      selectionLimit: 10,
      aspect: [16, 9],
      quality: 0.7,
    });

    if (result.canceled) {
      return;
    }

    setImages((current) => [...current, ...result.assets]);
    setSubmitError(null);
  };

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    setSubmitError(null);

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          t('createPlacePermissionDeniedTitle'),
          t('createPlacePermissionDeniedMessage'),
        );
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const nextCoords = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };
      setLatitudeInput(nextCoords.lat.toFixed(6));
      setLongitudeInput(nextCoords.lng.toFixed(6));

      const reverseGeocode = await Location.reverseGeocodeAsync({
        latitude: nextCoords.lat,
        longitude: nextCoords.lng,
      });

      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        const formattedAddress = `${addr.street || ''} ${addr.name || ''}, ${
          addr.city || ''
        }`.trim();
        if (formattedAddress) {
          setAddress(formattedAddress);
        }
      }
    } catch {
      Alert.alert(t('commonErrorTitle'), t('createPlaceGpsError'));
    } finally {
      setLocationLoading(false);
    }
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      if (!name.trim() || !selectedCountry || !selectedCity) {
        Alert.alert(t('commonErrorTitle'), t('createPlaceStepBasicsInvalid'));
        return false;
      }

      if (categories.length > 0 && !selectedCategoryId) {
        Alert.alert(t('commonErrorTitle'), t('createPlaceCategoryRequired'));
        return false;
      }
    }

    if (step === 3 && !parsedCoordinates) {
      Alert.alert(t('commonErrorTitle'), t('createPlaceStepLocationInvalid'));
      return false;
    }

    return true;
  };

  const handleNextStep = () => {
    if (!validateStep(currentStep)) {
      return;
    }
    setCurrentStep((value) => Math.min(CREATE_PLACE_TOTAL_STEPS, value + 1));
  };

  const handlePrevStep = () => {
    setCurrentStep((value) => Math.max(1, value - 1));
  };

  const handleCancelCreation = () => {
    if (loading) {
      return;
    }

    if (!hasDraftChanges) {
      router.back();
      return;
    }

    Alert.alert(
      t('createPlaceUnsavedExitTitle'),
      t('createPlaceUnsavedExitMessage'),
      [
        {
          text: t('genericCancel'),
          style: 'cancel',
        },
        {
          text: t('createPlaceUnsavedExitDiscardAction'),
          style: 'destructive',
          onPress: () => {
            router.back();
          },
        },
      ],
    );
  };

  const handleSubmit = async () => {
    if (!name.trim() || !parsedCoordinates) {
      Alert.alert(
        t('createPlaceMissingRequiredTitle'),
        t('createPlaceMissingRequiredMessage'),
      );
      return;
    }

    if (!selectedCountry) {
      Alert.alert(t('commonErrorTitle'), t('createPlaceValidationCountryRequired'));
      return;
    }

    if (!selectedCity) {
      Alert.alert(t('commonErrorTitle'), t('createPlaceValidationCityRequired'));
      return;
    }

    if (categories.length > 0 && !selectedCategoryId) {
      Alert.alert(t('commonErrorTitle'), t('createPlaceCategoryRequired'));
      return;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      const normalizedCategory = selectedCategory.trim();
      const normalizedPhone = phone.trim();
      const normalizedWhatsapp = whatsapp.trim();
      const normalizedAddress = address.trim()
        || [selectedCity?.name, selectedCountry]
          .filter(Boolean)
          .join(', ')
        || `${parsedCoordinates.lat.toFixed(6)}, ${parsedCoordinates.lng.toFixed(6)}`;

      if (normalizedPhone && !PHONE_REGEX.test(normalizedPhone)) {
        Alert.alert(t('commonErrorTitle'), t('createPlacePhoneInvalid'));
        setLoading(false);
        return;
      }

      if (normalizedWhatsapp && !PHONE_REGEX.test(normalizedWhatsapp)) {
        Alert.alert(t('commonErrorTitle'), t('createPlaceWhatsappInvalid'));
        setLoading(false);
        return;
      }

      const normalizedHoursByDay: string[] = [];
      for (const day of DAY_ORDER) {
        const schedule = weeklySchedule[day];
        const hasAnyValue = Object.values(schedule).some((part) => part.trim().length > 0);

        if (!hasAnyValue) {
          continue;
        }

        const isComplete = Object.values(schedule).every((part) => part.trim().length > 0);
        if (!isComplete) {
          Alert.alert(
            t('commonErrorTitle'),
            t('createPlaceHoursPairInvalidForDay', { day: dayLabels[day] }),
          );
          setLoading(false);
          return;
        }

        const openHour = Number(schedule.openHour);
        const openMinute = Number(schedule.openMinute);
        const closeHour = Number(schedule.closeHour);
        const closeMinute = Number(schedule.closeMinute);
        const isInvalid =
          Number.isNaN(openHour)
          || Number.isNaN(openMinute)
          || Number.isNaN(closeHour)
          || Number.isNaN(closeMinute)
          || openHour < 0
          || openHour > 23
          || closeHour < 0
          || closeHour > 23
          || openMinute < 0
          || openMinute > 59
          || closeMinute < 0
          || closeMinute > 59;

        if (isInvalid) {
          Alert.alert(
            t('commonErrorTitle'),
            t('createPlaceHoursInvalidForDay', { day: dayLabels[day] }),
          );
          setLoading(false);
          return;
        }

        normalizedHoursByDay.push(
          `${dayLabels[day]} ${padTimePart(schedule.openHour)}:${padTimePart(schedule.openMinute)}-${padTimePart(schedule.closeHour)}:${padTimePart(schedule.closeMinute)}`,
        );
      }

      const normalizedHours = normalizedHoursByDay.join(' | ');

      const formData = new FormData();
      formData.append('name', name.trim());
      formData.append('description', description.trim());
      if (normalizedCategory) {
        formData.append('category', normalizedCategory);
      }
      if (selectedTagIds.length > 0) {
        formData.append('tagIds', JSON.stringify(selectedTagIds));
      }
      formData.append('address', normalizedAddress);
      if (normalizedPhone) {
        formData.append('phone', normalizedPhone);
      }
      if (normalizedWhatsapp) {
        formData.append('whatsapp', normalizedWhatsapp);
      }
      if (normalizedHours) {
        formData.append('openingHours', normalizedHours);
      }
      formData.append('latitude', String(parsedCoordinates.lat));
      formData.append('longitude', String(parsedCoordinates.lng));
      formData.append('priceLevel', String(priceLevel));
      formData.append('cityId', String(selectedCity.id));

      if (images.length > 0) {
        const safeCoverIndex = Math.min(coverIndex, images.length - 1);
        const coverImage = images[safeCoverIndex];

        formData.append(
          'cover',
          toUploadFile(coverImage, 'place-cover.jpg') as unknown as Blob,
        );

        images.forEach((image, index) => {
          if (index === safeCoverIndex) {
            return;
          }

          formData.append(
            'gallery',
            toUploadFile(image, `gallery-${index}.jpg`) as unknown as Blob,
          );
        });
      }

      const response = await api.post('/places', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      await patchStoredUserSession({ hasPlace: true });
      Alert.alert(t('createPlaceSuccessTitle'), t('createPlaceSuccessMessage'));

      router.replace({
        pathname: '/place/[id]',
        params: { id: response.data.id },
      });
    } catch (error) {
      const message = getApiErrorMessage(error, t('createPlaceCreateFailed'));
      setSubmitError(message);
      Alert.alert(t('commonErrorTitle'), message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <ScrollView
        className="flex-1 bg-gray-50 px-5 pt-16 dark:bg-black"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 96 }}
      >
        <ScreenHeader
          title={t('createPlaceTitle')}
          subtitle={t('createActionAddPlaceDesc')}
          label={t('createActionAddPlaceLabel')}
          onBack={handleCancelCreation}
          rightSlot={(
            <View className="rounded-full border border-[#4c669f]/20 bg-[#4c669f]/10 px-3 py-1.5">
              <Text className="text-xs font-semibold text-[#4c669f]">
                {currentStep}/{CREATE_PLACE_TOTAL_STEPS}
              </Text>
            </View>
          )}
        />

        {submitError ? (
          <ScreenState
            mode="warning"
            title={submitError}
            containerClassName="px-0 py-0 pt-4"
          />
        ) : null}

        <View className="mt-5 rounded-3xl bg-[#4c669f]/10 p-5">
          <Text className="text-xs font-semibold uppercase tracking-[0.24em] text-[#4c669f]">
            {t('createPlaceStepProgress', {
              current: currentStep,
              total: CREATE_PLACE_TOTAL_STEPS,
            })}
          </Text>
          <Text className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
            {stepTitle}
          </Text>
          <View className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/60 dark:bg-gray-900/50">
            <View
              className="h-full rounded-full bg-[#4c669f]"
              style={{ width: `${Math.round((currentStep / CREATE_PLACE_TOTAL_STEPS) * 100)}%` }}
            />
          </View>
        </View>

        {currentStep === 4 ? (
          <FormImagePicker
            containerClassName="mt-5"
            images={images}
            coverIndex={coverIndex}
            onSelectCover={setCoverIndex}
            onAddPress={() => {
              void pickImage();
            }}
            addLabel={t('createPlaceAddPhotos')}
            coverLabel={t('createPlaceCover')}
          />
        ) : null}

        <View className="mt-5 rounded-[24px] bg-white p-5 dark:bg-gray-900">
          {currentStep === 1 ? (
            <>
          <FormTextField
            label={t('createPlaceNameLabel')}
            required
            value={name}
            onChangeText={(value) => {
              setName(value);
              setSubmitError(null);
            }}
            placeholder={t('createPlaceNamePlaceholder')}
            inputClassName="text-base font-semibold"
          />

          <View className="mt-4">
            <Text className="mb-2 ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('createPlaceCountryLabel')}
              <Text className="text-red-500"> *</Text>
            </Text>
            <TouchableOpacity
              onPress={openLocationSelector}
              className="flex-row items-center justify-between rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
            >
              <View className="flex-1 pr-3">
                <Text
                  className={`text-base font-semibold ${
                    selectedCountry
                      ? 'text-gray-800 dark:text-white'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                  numberOfLines={1}
                >
                  {selectedCountry || t('createPlaceCountryPlaceholder')}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color="#9ca3af" />
            </TouchableOpacity>
          </View>

          <View className="mt-4">
            <Text className="mb-2 ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('createPlaceCityLabel')}
              <Text className="text-red-500"> *</Text>
            </Text>
            <TouchableOpacity
              onPress={openLocationSelector}
              className={`flex-row items-center justify-between rounded-xl border px-4 py-3 ${
                selectedCountry
                  ? 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                  : 'border-gray-200 bg-gray-100/70 dark:border-gray-700 dark:bg-gray-800/60'
              }`}
            >
              <View className="flex-1 pr-3">
                <Text
                  className={`text-base font-semibold ${
                    selectedCity
                      ? 'text-gray-800 dark:text-white'
                      : 'text-gray-400 dark:text-gray-500'
                  }`}
                  numberOfLines={1}
                >
                  {selectedCity
                    ? [selectedCity.name, selectedCity.region].filter(Boolean).join(' - ')
                    : selectedCountry
                      ? t('createPlaceCityPlaceholder')
                      : t('createPlaceCitySelectCountryFirst')}
                </Text>
              </View>
              <Ionicons name="chevron-down" size={18} color="#9ca3af" />
            </TouchableOpacity>
            <Text className="mt-2 ml-1 text-xs text-gray-400 dark:text-gray-500">
              {selectedCountry
                ? t('createPlaceCityHelper')
                : t('createPlaceCityCountryHint')}
            </Text>
          </View>

          <View className="mt-4">
            <Text className="mb-3 ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('createPlaceCategoryLabel')}
            </Text>
            {categoriesLoading ? (
              <View className="items-start py-2">
                <ActivityIndicator size="small" color="#4c669f" />
              </View>
            ) : categories.length > 0 ? (
              <View className="flex-row flex-wrap gap-2">
                {categories.map((option) => {
                  const active = selectedCategoryId === option.id;
                  return (
                    <TouchableOpacity
                      key={option.id}
                      onPress={() => {
                        setSelectedCategory(option.name);
                        setSelectedCategoryId(option.id);
                        setSelectedTagIds((option.Tag?.length ?? 0) > 0 ? [option.Tag![0].id] : []);
                        setSubmitError(null);
                      }}
                      className={`rounded-full px-4 py-2.5 ${
                        active
                          ? 'bg-[#4c669f]'
                          : 'border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                      }`}
                    >
                      <Text
                        className={`text-sm font-semibold ${
                          active ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {option.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : (
              <Text className="text-sm text-gray-500 dark:text-gray-400">
                {t('createPlaceCategoryEmpty')}
              </Text>
            )}

            {selectedCategoryOption ? (
              <View className="mt-4">
                <Text className="mb-3 ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                  {t('createEventTagsTitle')}
                </Text>
                {availableTags.length > 0 ? (
                  <View className="flex-row flex-wrap gap-2">
                    {availableTags.map((tag) => {
                      const active = selectedTagIds.includes(tag.id);

                      return (
                        <TouchableOpacity
                          key={tag.id}
                          onPress={() => toggleTag(tag.id)}
                          className={`rounded-full px-3 py-2 ${
                            active
                              ? 'bg-[#2ecc71]'
                              : 'border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                          }`}
                        >
                          <Text
                            className={`text-xs font-semibold ${
                              active ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                            }`}
                          >
                            #{tag.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : (
                  <Text className="text-xs text-gray-400 dark:text-gray-500">
                    {t('createPlaceTagsEmpty')}
                  </Text>
                )}
              </View>
            ) : categories.length > 0 ? (
              <Text className="mt-2 text-xs text-gray-400 dark:text-gray-500">
                {t('createPlaceTagsSelectCategoryFirst')}
              </Text>
            ) : null}

            {categoriesError ? (
              <View className="mt-3 flex-row items-center justify-between gap-3">
                <Text className="flex-1 text-xs text-rose-500">{categoriesError}</Text>
                <TouchableOpacity
                  onPress={() => {
                    void loadCategories();
                  }}
                  className="rounded-full border border-rose-300 px-3 py-1.5"
                >
                  <Text className="text-xs font-semibold text-rose-600">
                    {t('commonRetry')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>

          <FormTextField
            containerClassName="mt-4"
            label={t('createPlacePhoneLabel')}
            value={phone}
            onChangeText={(value) => {
              setPhone(value);
              setSubmitError(null);
            }}
            keyboardType="phone-pad"
            placeholder={t('createPlacePhonePlaceholder')}
          />

          <FormTextField
            containerClassName="mt-4"
            label={t('createPlaceWhatsappLabel')}
            value={whatsapp}
            onChangeText={(value) => {
              setWhatsapp(value);
              setSubmitError(null);
            }}
            keyboardType="phone-pad"
            placeholder={t('createPlaceWhatsappPlaceholder')}
          />
            </>
          ) : null}


          {currentStep === 2 ? (
            <>
          <View className="mt-4">
            <Text className="mb-3 ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('createPlaceHoursLabel')}
            </Text>
            <Text className="mb-2 ml-1 text-xs text-gray-400 dark:text-gray-500">
              {t('createPlaceHoursStructuredHint')}
            </Text>

            {/* Aperçu des horaires saisis */}
            <View className="mb-4 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
              <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-[#4c669f]">
                {t('createPlaceHoursPreviewTitle')}
              </Text>
              {schedulePreviewByDay.map((item) => (
                  <View key={item.day} className="flex-row items-center py-1">
                    <Text className="w-28 text-xs font-semibold text-gray-700 dark:text-gray-200">
                      {item.label}
                    </Text>
                    <Text className="text-xs text-gray-500 dark:text-gray-400">
                      {item.display}
                    </Text>
                  </View>
              ))}
            </View>

            {DAY_ORDER.map((day) => (
              <View
                key={day}
                className="mt-2 rounded-2xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800"
              >
                <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                  {dayLabels[day]}
                </Text>
                <View className="mt-3 flex-row items-center">
                  <Text className="w-16 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t('createPlaceHoursOpenLabel')}
                  </Text>
                  <TextInput
                    value={weeklySchedule[day].openHour}
                    onChangeText={(value) => updateScheduleField(day, 'openHour', value)}
                    keyboardType="number-pad"
                    placeholder="HH"
                    placeholderTextColor="#9ca3af"
                    maxLength={2}
                    className="h-10 w-12 rounded-lg border border-gray-200 bg-white px-2 text-center text-sm font-semibold text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  />
                  <Text className="mx-1 text-base font-semibold text-gray-500 dark:text-gray-300">:</Text>
                  <TextInput
                    value={weeklySchedule[day].openMinute}
                    onChangeText={(value) => updateScheduleField(day, 'openMinute', value)}
                    keyboardType="number-pad"
                    placeholder="MM"
                    placeholderTextColor="#9ca3af"
                    maxLength={2}
                    className="h-10 w-12 rounded-lg border border-gray-200 bg-white px-2 text-center text-sm font-semibold text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  />
                </View>
                <View className="mt-2 flex-row items-center">
                  <Text className="w-16 text-xs font-medium text-gray-500 dark:text-gray-400">
                    {t('createPlaceHoursCloseLabel')}
                  </Text>
                  <TextInput
                    value={weeklySchedule[day].closeHour}
                    onChangeText={(value) => updateScheduleField(day, 'closeHour', value)}
                    keyboardType="number-pad"
                    placeholder="HH"
                    placeholderTextColor="#9ca3af"
                    maxLength={2}
                    className="h-10 w-12 rounded-lg border border-gray-200 bg-white px-2 text-center text-sm font-semibold text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  />
                  <Text className="mx-1 text-base font-semibold text-gray-500 dark:text-gray-300">:</Text>
                  <TextInput
                    value={weeklySchedule[day].closeMinute}
                    onChangeText={(value) => updateScheduleField(day, 'closeMinute', value)}
                    keyboardType="number-pad"
                    placeholder="MM"
                    placeholderTextColor="#9ca3af"
                    maxLength={2}
                    className="h-10 w-12 rounded-lg border border-gray-200 bg-white px-2 text-center text-sm font-semibold text-gray-700 dark:border-gray-600 dark:bg-gray-900 dark:text-gray-100"
                  />
                </View>
              </View>
            ))}
          </View>

          <FormTextArea
            containerClassName="mt-4"
            label={t('createPlaceDescriptionLabel')}
            value={description}
            onChangeText={(value) => {
              setDescription(value);
              setSubmitError(null);
            }}
            placeholder={t('createPlaceDescriptionPlaceholder')}
          />

          <View className="mt-4">
            <Text className="mb-3 ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('createPlacePriceLevelLabel')}
            </Text>
            <View className="flex-row gap-3">
              {PRICE_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level}
                  onPress={() => setPriceLevel(level)}
                  className={`flex-1 items-center rounded-xl border py-3 ${
                    priceLevel === level
                      ? 'border-[#2ecc71] bg-[#2ecc71]'
                      : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                  }`}
                >
                  <Text
                    className={`text-lg font-bold ${
                      priceLevel === level ? 'text-white' : 'text-gray-400'
                    }`}
                  >
                    {Array(level).fill('$').join('')}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
            </>
          ) : null}

          {currentStep === 3 ? (
            <>
          <View className="my-5 h-px bg-gray-100 dark:bg-gray-800" />

          <View>
            <Text className="mb-3 ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">
              {t('createPlaceLocationLabel')}
              <Text className="text-red-500"> *</Text>
            </Text>

            <TouchableOpacity
              onPress={() => {
                void getCurrentLocation();
              }}
              className={`mb-4 flex-row items-center justify-center rounded-xl border border-dashed p-4 ${
                parsedCoordinates
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20'
                  : 'border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/20'
              }`}
            >
              {locationLoading ? (
                <ActivityIndicator color="#4c669f" />
              ) : (
                <>
                  <Ionicons
                    name={parsedCoordinates ? 'checkmark-circle' : 'navigate'}
                    size={20}
                    color={parsedCoordinates ? '#2ecc71' : '#4c669f'}
                  />
                  <Text
                    className={`ml-2 font-bold ${
                      parsedCoordinates
                        ? 'text-green-700 dark:text-green-300'
                        : 'text-blue-700 dark:text-blue-300'
                    }`}
                  >
                    {parsedCoordinates
                      ? t('createPlaceGpsDetected')
                      : t('createPlaceUseCurrentPosition')}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <FormTextField
              label={t('createPlaceLatitudeLabel')}
              required
              value={latitudeInput}
              onChangeText={(value) => {
                setLatitudeInput(value.replace(',', '.'));
                setSubmitError(null);
              }}
              keyboardType="decimal-pad"
              placeholder={t('createPlaceLatitudePlaceholder')}
            />
            <FormTextField
              containerClassName="mt-3"
              label={t('createPlaceLongitudeLabel')}
              required
              value={longitudeInput}
              onChangeText={(value) => {
                setLongitudeInput(value.replace(',', '.'));
                setSubmitError(null);
              }}
              keyboardType="decimal-pad"
              placeholder={t('createPlaceLongitudePlaceholder')}
            />
            <Text className="mt-2 ml-1 text-xs text-gray-400 dark:text-gray-500">
              {t('createPlaceCoordinatesHint')}
            </Text>

            {parsedCoordinates ? (
              <Text className="mt-2 text-center text-xs text-gray-400 dark:text-gray-500">
                Lat: {parsedCoordinates.lat.toFixed(5)} | Lng: {parsedCoordinates.lng.toFixed(5)}
              </Text>
            ) : null}
          </View>
            </>
          ) : null}

          {currentStep === 4 ? (
            <>
              <View className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800">
                <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                  {t('createPlacePhotosSummaryTitle')}
                </Text>
                <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {images.length > 0
                    ? t('createPlacePhotosSummaryCount', { count: images.length })
                    : t('createPlacePhotosSummaryEmpty')}
                </Text>
              </View>
            </>
          ) : null}

          {currentStep === 5 ? (
            <>
              <View className="rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t('createPlaceReviewSectionIdentity')}
                </Text>
                <Text className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {name.trim() || '-'}
                </Text>
                <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {[
                    selectedCategoryOption?.name || selectedCategory || '-',
                    selectedCity?.name || '-',
                    selectedCountry || '-',
                  ].join(' • ')}
                </Text>
                <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {phone.trim() || '-'} | {whatsapp.trim() || '-'}
                </Text>
                <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {selectedTagIds.length > 0
                    ? selectedTagIds
                        .map((tagId) => availableTags.find((tag) => tag.id === tagId)?.name)
                        .filter((tagName): tagName is string => Boolean(tagName))
                        .map((tagName) => `#${tagName}`)
                        .join(', ')
                    : '-'}
                </Text>
              </View>

              <View className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t('createPlaceReviewSectionHours')}
                </Text>
                <View className="mt-2">
                  {schedulePreviewByDay.map((item) => (
                    <View key={item.day} className="mb-1 flex-row items-center justify-between">
                      <Text className="text-xs font-medium text-gray-600 dark:text-gray-300">
                        {item.label}
                      </Text>
                      <Text className="text-xs text-gray-500 dark:text-gray-400">
                        {item.display}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>

              <View className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t('createPlaceReviewSectionLocation')}
                </Text>
                <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {parsedCoordinates
                    ? `Lat: ${parsedCoordinates.lat.toFixed(6)} • Lng: ${parsedCoordinates.lng.toFixed(6)}`
                    : '-'}
                </Text>
              </View>

              <View className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                  {t('createPlaceReviewSectionMedia')}
                </Text>
                <Text className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {images.length > 0
                    ? t('createPlacePhotosSummaryCount', { count: images.length })
                    : t('createPlacePhotosSummaryEmpty')}
                </Text>
              </View>

              <View className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 dark:border-emerald-800/50 dark:bg-emerald-900/20">
                <Text className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {t('createPlaceReviewFinalHint')}
                </Text>
              </View>
            </>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={handleCancelCreation}
          disabled={loading}
          className="mt-6 items-center rounded-xl border border-gray-200 bg-white py-3 dark:border-gray-700 dark:bg-gray-900"
        >
          <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
            {t('createPlaceCancelCreation')}
          </Text>
        </TouchableOpacity>

        <View className="mt-3 flex-row items-center gap-3 pb-4">
          {currentStep > 1 ? (
            <TouchableOpacity
              onPress={handlePrevStep}
              className="flex-1 items-center rounded-xl border border-gray-200 bg-white py-3 dark:border-gray-700 dark:bg-gray-900"
            >
              <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
                {t('createPlaceStepBack')}
              </Text>
            </TouchableOpacity>
          ) : null}

          {currentStep < CREATE_PLACE_TOTAL_STEPS ? (
            <TouchableOpacity
              onPress={handleNextStep}
              className="flex-1 items-center rounded-xl bg-[#4c669f] py-3"
            >
              <Text className="text-sm font-semibold text-white">
                {t('createPlaceStepNext')}
              </Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={() => {
                void handleSubmit();
              }}
              disabled={loading}
              className="flex-1 items-center rounded-xl bg-[#2ecc71] py-3 disabled:opacity-70"
            >
              {loading ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text className="text-sm font-semibold text-white">
                  {t('createPlacePublish')}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>

    </View>
  );
}

