import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type DimensionValue,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { useI18n } from '@/shared/hooks/use-i18n';
import api from '@/services/api';
import {
  getRecommendationOnboardingPreferences,
  setRecommendationOnboardingPreferences,
  type OnboardingBudgetPreference,
  type OnboardingRadiusPreference,
} from '@/services/shared/recommendation-onboarding';
import { syncStoredUserSessionFromApi } from '@/services/auth/user-session';
import type { TranslationKey } from '@/services/shared/i18n';
import { setStoredLocation, type StoredLocation } from '@/services/shared/location-preferences';

type PreferenceStep = 1 | 2 | 3 | 4 | 5;
type PreferencesMode = 'onboarding' | 'edit';

interface PreferenceCity {
  id: number;
  name: string;
  region: string | null;
  country: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface PreferenceCountry {
  name: string;
  cityCount: number;
}

interface PreferenceTag {
  id: number;
  name: string;
}

interface PreferenceCategory {
  id: number;
  name: string;
  color: string;
  icon: string;
  tags: PreferenceTag[];
}

interface PreferencesResponse {
  categories: PreferenceCategory[];
  selectedTagIds: number[];
}

interface CitiesResponse {
  id: number;
  name: string;
  slug: string;
  region: string | null;
  imageUrl?: string | null;
  country: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface UserProfileResponse {
  id: string;
  residenceCityId?: number | null;
  UserCityInterest?: Array<{ cityId?: number | null } | null>;
  UserTagInterest?: Array<{ tagId?: number | null } | null>;
}

const TOTAL_STEPS = 5;
const BUDGET_OPTIONS: Array<{
  value: OnboardingBudgetPreference;
  labelKey: 'preferencesBudgetLow' | 'preferencesBudgetMedium' | 'preferencesBudgetHigh';
}> = [
  { value: 'low', labelKey: 'preferencesBudgetLow' },
  { value: 'medium', labelKey: 'preferencesBudgetMedium' },
  { value: 'high', labelKey: 'preferencesBudgetHigh' },
];

const RADIUS_OPTIONS: Array<{
  value: OnboardingRadiusPreference;
}> = [
  { value: 2 },
  { value: 5 },
  { value: 10 },
  { value: 20 },
  { value: 'unlimited' },
];

function normalizeMode(value: string | string[] | undefined): PreferencesMode {
  const raw = Array.isArray(value) ? value[0] : value;

  return raw === 'onboarding' ? 'onboarding' : 'edit';
}

function formatCityLabel(city: PreferenceCity, t: (key: TranslationKey, params?: Record<string, string | number>) => string) {
  return [city.name, city.region, city.country || t('homeLocationCountry')]
    .filter(Boolean)
    .join(' • ');
}

function normalizeCountryName(value: string | null | undefined) {
  return value?.trim() || '';
}

export default function PreferencesScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ mode?: string }>();
  const mode = normalizeMode(params.mode);
  const isOnboarding = mode === 'onboarding';
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { t } = useI18n();

  const [step, setStep] = useState<PreferenceStep>(1);
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [cities, setCities] = useState<PreferenceCity[]>([]);
  const [categories, setCategories] = useState<PreferenceCategory[]>([]);
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedCityIds, setSelectedCityIds] = useState<number[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [budget, setBudget] = useState<OnboardingBudgetPreference>('medium');
  const [radiusKm, setRadiusKm] = useState<OnboardingRadiusPreference>(5);
  const [countryQuery, setCountryQuery] = useState('');
  const [cityQuery, setCityQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const loadPreferences = useCallback(async () => {
    setLoading(true);

    try {
      const [citiesResult, profileResult, tagsResult] = await Promise.allSettled([
        api.get<CitiesResponse[]>('/cities'),
        api.get<UserProfileResponse>('/users/me'),
        api.get<PreferencesResponse>('/users/me/preferences'),
      ]);

      const nextCities =
        citiesResult.status === 'fulfilled'
          ? citiesResult.value.data.map((city) => ({
              id: city.id,
              name: city.name,
              region: city.region,
              country: city.country,
              latitude: city.latitude,
              longitude: city.longitude,
            }))
          : [];

      setCities(nextCities);

      let nextSelectedCountry: string | null = null;

      if (profileResult.status === 'fulfilled') {
        setUserId(profileResult.value.data.id);
        setSelectedCityId(profileResult.value.data.residenceCityId || null);
        const currentCityIds =
          profileResult.value.data.UserCityInterest?.map((item) => item?.cityId)
            .filter((value): value is number => typeof value === 'number') || [];
        setSelectedCityIds(currentCityIds);

        const residenceCity = nextCities.find(
          (city) => city.id === profileResult.value.data.residenceCityId,
        );
        nextSelectedCountry = normalizeCountryName(residenceCity?.country);
      }

      if (tagsResult.status === 'fulfilled') {
        setCategories(tagsResult.value.data.categories || []);
        setSelectedTagIds(tagsResult.value.data.selectedTagIds || []);
      } else {
        setCategories([]);
        setSelectedTagIds([]);
      }

      const localPreferences = await getRecommendationOnboardingPreferences(
        profileResult.status === 'fulfilled' ? profileResult.value.data.id : null,
      );
      setBudget(localPreferences.budget);
      setRadiusKm(localPreferences.radiusKm);

      if (!nextSelectedCountry) {
        nextSelectedCountry = normalizeCountryName(nextCities.find((city) => city.country)?.country);
      }

      setSelectedCountry(nextSelectedCountry || null);
    } catch (error) {
      console.error('Erreur chargement preferences:', error);
      setCities([]);
      setCategories([]);
      setSelectedTagIds([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPreferences();
  }, [loadPreferences]);

  const countries = useMemo<PreferenceCountry[]>(() => {
    const counts = new Map<string, number>();

    cities.forEach((city) => {
      const countryName = normalizeCountryName(city.country);

      if (!countryName) {
        return;
      }

      counts.set(countryName, (counts.get(countryName) || 0) + 1);
    });

    return Array.from(counts.entries())
      .map(([name, cityCount]) => ({ name, cityCount }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [cities]);

  const filteredCountries = useMemo(() => {
    const normalizedQuery = countryQuery.trim().toLowerCase();

    const orderedCountries = [...countries].sort((left, right) => {
      if (left.name === selectedCountry) {
        return -1;
      }

      if (right.name === selectedCountry) {
        return 1;
      }

      return left.name.localeCompare(right.name);
    });

    if (!normalizedQuery) {
      return orderedCountries;
    }

    return orderedCountries.filter((country) => country.name.toLowerCase().includes(normalizedQuery));
  }, [countryQuery, countries, selectedCountry]);

  const selectedCountryCities = useMemo(() => {
    const normalizedCountry = normalizeCountryName(selectedCountry);

    if (!normalizedCountry) {
      return [...cities];
    }

    return cities.filter((city) => normalizeCountryName(city.country) === normalizedCountry);
  }, [cities, selectedCountry]);

  const cityChoices = useMemo(() => {
    const normalizedQuery = cityQuery.trim().toLowerCase();

    const orderedCities = [...selectedCountryCities].sort((left, right) => {
      if (left.id === selectedCityId) {
        return -1;
      }

      if (right.id === selectedCityId) {
        return 1;
      }

      return left.name.localeCompare(right.name);
    });

    if (!normalizedQuery) {
      return orderedCities.slice(0, 24);
    }

    return orderedCities.filter((city) => {
      const searchableText = [city.name, city.region, city.country]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return searchableText.includes(normalizedQuery);
    });
  }, [cityQuery, selectedCityId, selectedCountryCities]);

  const otherCityChoices = useMemo(
    () => selectedCountryCities.filter((city) => city.id !== selectedCityId),
    [selectedCityId, selectedCountryCities],
  );

  const selectedCountryLabel = useMemo(
    () => selectedCountry || t('preferencesCountryRequired'),
    [selectedCountry, t],
  );

  const selectedCity = useMemo(
    () => cities.find((city) => city.id === selectedCityId) || null,
    [cities, selectedCityId],
  );

  const currentStepTitle = useMemo(() => {
    if (step === 1) {
      return t('preferencesStepCountryTitle');
    }

    if (step === 2) {
      return t('preferencesStepCityTitle');
    }

    if (step === 3) {
      return t('preferencesStepCitiesTitle');
    }

    if (step === 4) {
      return t('preferencesStepInterestsTitle');
    }

    return t('preferencesStepBudgetTitle');
  }, [step, t]);

  const currentStepSubtitle = useMemo(() => {
    if (step === 1) {
      return t('preferencesStepCountrySubtitle');
    }

    if (step === 2) {
      return t('preferencesStepCitySubtitle');
    }

    if (step === 3) {
      return t('preferencesStepCitiesSubtitle');
    }

    if (step === 4) {
      return t('preferencesStepInterestsSubtitle');
    }

    return t('preferencesStepBudgetSubtitle');
  }, [step, t]);

  const handleSelectCountry = useCallback((countryName: string) => {
    setSelectedCountry(countryName);
    setSelectedCityId(null);
    setSelectedCityIds([]);
    setCountryQuery('');
    setCityQuery('');
  }, []);

  const handleSelectCity = useCallback((city: PreferenceCity) => {
    setSelectedCityId(city.id);
    setSelectedCountry(normalizeCountryName(city.country) || selectedCountry);
    setCityQuery('');
  }, [selectedCountry]);

  const toggleCityInterest = useCallback((cityId: number) => {
    setSelectedCityIds((current) =>
      current.includes(cityId)
        ? current.filter((item) => item !== cityId)
        : [...current, cityId],
    );
  }, []);

  const toggleTag = useCallback((tagId: number) => {
    setSelectedTagIds((current) =>
      current.includes(tagId)
        ? current.filter((item) => item !== tagId)
        : [...current, tagId],
    );
  }, []);

  const saveCityStep = useCallback(async () => {
    if (!selectedCity) {
      Alert.alert(t('commonErrorTitle'), t('preferencesCityRequired'));
      return false;
    }

    setSaving(true);

    try {
      await api.patch('/users/me', {
        residenceCityId: selectedCity.id,
      });

      const storedLocation: StoredLocation = {
        mode: 'city',
        cityId: selectedCity.id,
        cityName: selectedCity.name,
        region: selectedCity.region,
        country: selectedCity.country || t('homeLocationCountry'),
        latitude: selectedCity.latitude ?? undefined,
        longitude: selectedCity.longitude ?? undefined,
      };

      await setStoredLocation(storedLocation);
      await syncStoredUserSessionFromApi();
      setUserId((current) => current);
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde ville:', error);
      Alert.alert(t('commonErrorTitle'), t('preferencesSaveError'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [selectedCity, t]);

  const saveCitiesStep = useCallback(async () => {
    setSaving(true);

    try {
      await api.patch('/users/me/city-preferences', {
        cityIds: selectedCityIds,
      });

      await syncStoredUserSessionFromApi();
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde villes:', error);
      Alert.alert(t('commonErrorTitle'), t('preferencesSaveError'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [selectedCityIds, t]);

  const saveTagsStep = useCallback(async () => {
    if (selectedTagIds.length < 3) {
      Alert.alert(t('preferencesMinTagTitle'), t('preferencesMinTagMessage'));
      return false;
    }

    setSaving(true);

    try {
      await api.patch('/users/me/preferences', {
        tagIds: selectedTagIds,
      });

      await syncStoredUserSessionFromApi();
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde tags:', error);
      Alert.alert(t('commonErrorTitle'), t('preferencesSaveError'));
      return false;
    } finally {
      setSaving(false);
    }
  }, [selectedTagIds, t]);

  const saveBudgetStep = useCallback(async () => {
    const currentSession = await syncStoredUserSessionFromApi();

    try {
      await setRecommendationOnboardingPreferences(
        {
          budget,
          radiusKm,
        },
        currentSession?.id || userId || null,
      );
      return true;
    } catch (error) {
      console.error('Erreur sauvegarde onboarding local:', error);
      Alert.alert(t('commonErrorTitle'), t('preferencesSaveError'));
      return false;
    }
  }, [budget, radiusKm, t, userId]);

  const handlePrimaryAction = useCallback(async () => {
    if (step === 1) {
      if (!selectedCountry) {
        Alert.alert(t('commonErrorTitle'), t('preferencesCountryRequired'));
        return;
      }

      setStep(2);
      return;
    }

    if (step === 2) {
      const saved = await saveCityStep();
      if (saved) {
        setStep(3);
      }
      return;
    }

    if (step === 3) {
      const saved = await saveCitiesStep();
      if (saved) {
        setStep(4);
      }
      return;
    }

    if (step === 4) {
      const saved = await saveTagsStep();
      if (saved) {
        setStep(5);
      }
      return;
    }

    const saved = await saveBudgetStep();
    if (!saved) {
      return;
    }

    if (isOnboarding) {
      router.replace('/(tabs)/home');
      return;
    }

    Alert.alert(t('preferencesSavedTitle'), t('preferencesSavedMessage'), [
      { text: t('preferencesSavedConfirm'), onPress: () => router.back() },
    ]);
  }, [
    isOnboarding,
    router,
    saveBudgetStep,
    saveCityStep,
    saveCitiesStep,
    saveTagsStep,
    step,
    t,
  ]);

  const handleSkipStep = useCallback(async () => {
    if (step === 3) {
      setStep(4);
      return;
    }

    if (step === 5) {
      const saved = await saveBudgetStep();
      if (!saved) {
        return;
      }

      if (isOnboarding) {
        router.replace('/(tabs)/home');
        return;
      }

      router.back();
    }
  }, [isOnboarding, router, saveBudgetStep, step]);

  const goBack = useCallback(() => {
    if (step > 1) {
      setStep((current) => (current - 1) as PreferenceStep);
      return;
    }

    router.back();
  }, [isOnboarding, router, step]);

  const progressWidth: DimensionValue = `${(step / TOTAL_STEPS) * 100}%`;
  const primaryButtonColors: [string, string] = isDark
    ? (step === 5 ? ['#4c669f', '#ff7a45'] : ['#4c669f', '#2ecc71'])
    : (step === 5 ? ['#3b82f6', '#f97316'] : ['#2563eb', '#10b981']);

  if (loading) {
    return (
      <View className={`flex-1 items-center justify-center ${isDark ? 'bg-black' : 'bg-slate-50'}`}>
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }

  return (
    <SafeAreaView className={`flex-1 ${isDark ? 'bg-black' : 'bg-slate-50'}`} edges={['top', 'bottom']}>
      <LinearGradient
        colors={isDark ? ['#050816', '#0d1324', '#050816'] : ['#f7fbff', '#eef4ff', '#fff8f0']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        className="absolute inset-0"
      />

      <View className="flex-1">
        <View className="px-5 pt-4">
          <View className="mb-4 flex-row items-center justify-between">
            {isOnboarding && step === 1 ? (
              <View className="h-10 w-24" />
            ) : (
              <TouchableOpacity onPress={goBack} className="rounded-full bg-white/80 px-4 py-2 dark:bg-white/10">
                <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-800'}`}>
                  {step > 1 ? t('preferencesBack') : t('preferencesCancel')}
                </Text>
              </TouchableOpacity>
            )}

            <Text className={`text-xs font-semibold uppercase tracking-[0.24em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {t('preferencesStepCounter', { current: step, total: TOTAL_STEPS })}
            </Text>
          </View>

          <View className={`h-2 overflow-hidden rounded-full ${isDark ? 'bg-white/10' : 'bg-slate-200'}`}>
            <View className="h-full rounded-full bg-[#4c669f]" style={{ width: progressWidth }} />
          </View>

          <Text className={`mt-6 text-[32px] font-black leading-[36px] ${isDark ? 'text-white' : 'text-slate-950'}`}>
            {currentStepTitle}
          </Text>
          <Text className={`mt-3 text-base leading-7 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            {currentStepSubtitle}
          </Text>
        </View>

        <ScrollView className="flex-1 px-5" showsVerticalScrollIndicator={false}>
          {step === 1 ? (
            <View className="mt-6 rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-[#07101dcc]">
              <TextInput
                value={countryQuery}
                onChangeText={setCountryQuery}
                placeholder={t('preferencesCountrySearchPlaceholder')}
                placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                className={`mb-4 rounded-2xl px-4 py-3 text-base ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-900'}`}
              />

              {filteredCountries.length > 0 ? (
                filteredCountries.map((country) => {
                  const isSelected = country.name === selectedCountry;

                  return (
                    <TouchableOpacity
                      key={country.name}
                      onPress={() => handleSelectCountry(country.name)}
                      className={`mb-3 rounded-2xl border px-4 py-3 ${
                        isSelected
                          ? 'border-[#4c669f] bg-[#4c669f]/10'
                          : isDark
                            ? 'border-white/10 bg-white/5'
                            : 'border-slate-200 bg-white'
                      }`}
                    >
                      <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {country.name}
                      </Text>
                      <Text className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                        {t('preferencesCountryCityCount', { count: country.cityCount })}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View className="rounded-2xl bg-slate-100 p-4 dark:bg-white/5">
                  <Text className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                    {t('preferencesCountryEmpty')}
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {step === 2 ? (
            <View className="mt-6 rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-[#07101dcc]">
              <View className="mb-4 rounded-2xl bg-[#4c669f]/10 px-4 py-3">
                <Text className={`text-sm font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t('preferencesCountryCurrentLabel')}
                </Text>
                <Text className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {selectedCountryLabel}
                </Text>
              </View>

              <Text className={`mb-4 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {t('preferencesCityCountryHint')}
              </Text>

              <TextInput
                value={cityQuery}
                onChangeText={setCityQuery}
                placeholder={t('preferencesCitySearchPlaceholder')}
                placeholderTextColor={isDark ? '#94a3b8' : '#64748b'}
                className={`mb-4 rounded-2xl px-4 py-3 text-base ${isDark ? 'bg-white/10 text-white' : 'bg-slate-100 text-slate-900'}`}
              />

              {cityChoices.length > 0 ? (
                cityChoices.map((city) => {
                  const isSelected = city.id === selectedCityId;

                  return (
                    <TouchableOpacity
                      key={city.id}
                      onPress={() => handleSelectCity(city)}
                      className={`mb-3 flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
                        isSelected
                          ? 'border-[#4c669f] bg-[#4c669f]/10'
                          : isDark
                            ? 'border-white/10 bg-white/5'
                            : 'border-slate-200 bg-white'
                      }`}
                    >
                      <View className="flex-1 pr-3">
                        <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {city.name}
                        </Text>
                        <Text className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                          {formatCityLabel(city, t)}
                        </Text>
                      </View>
                      <View className={`h-8 w-8 items-center justify-center rounded-full ${isSelected ? 'bg-[#2ecc71]' : isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                        <Ionicons name={isSelected ? 'checkmark' : 'add'} size={18} color={isSelected ? '#ffffff' : isDark ? '#e2e8f0' : '#475569'} />
                      </View>
                    </TouchableOpacity>
                  );
                })
              ) : (
                <View className="rounded-2xl bg-slate-100 p-4 dark:bg-white/5">
                  <Text className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                    {t('preferencesCityEmpty')}
                  </Text>
                </View>
              )}
            </View>
          ) : null}

          {step === 3 ? (
            <View className="mt-6 space-y-4">
              <View className="mb-4 rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-[#07101dcc]">
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {selectedCountryLabel}
                </Text>
                <Text className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('preferencesCitiesHint')}
                </Text>
              </View>

              <View className="mt-2">
                {otherCityChoices.length > 0 ? (
                  otherCityChoices.map((city) => {
                    const isSelected = selectedCityIds.includes(city.id);

                    return (
                      <TouchableOpacity
                        key={city.id}
                        onPress={() => toggleCityInterest(city.id)}
                        className={`mb-3 flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
                          isSelected
                            ? 'border-[#2ecc71] bg-[#2ecc71]/10'
                            : isDark
                              ? 'border-white/10 bg-white/5'
                              : 'border-slate-200 bg-white'
                        }`}
                      >
                        <View className="flex-1 pr-3">
                          <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {city.name}
                          </Text>
                          <Text className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-500'}`}>
                            {formatCityLabel(city, t)}
                          </Text>
                        </View>
                        <View className={`h-8 w-8 items-center justify-center rounded-full ${isSelected ? 'bg-[#2ecc71]' : isDark ? 'bg-white/10' : 'bg-slate-100'}`}>
                          <Ionicons name={isSelected ? 'checkmark' : 'add'} size={18} color={isSelected ? '#ffffff' : isDark ? '#e2e8f0' : '#475569'} />
                        </View>
                      </TouchableOpacity>
                    );
                  })
                ) : (
                  <View className="rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-[#07101dcc]">
                    <Text className={isDark ? 'text-slate-300' : 'text-slate-600'}>
                      {t('preferencesCityEmpty')}
                    </Text>
                  </View>
                )}
              </View>
            </View>
          ) : null}

          {step === 4 ? (
            <View className="mt-6 space-y-4">
              <View className="rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-[#07101dcc]">
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t('preferencesStepInterestsTitle')}
                </Text>
                <Text className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('preferencesStepInterestsSubtitle')}
                </Text>

                {categories.length === 0 ? (
                  <Text className={`mt-4 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                    {t('preferencesNoCategory')}
                  </Text>
                ) : null}

                {categories.map((category) => (
                  <View
                    key={category.id}
                    className="mt-4 rounded-[24px] border border-white/60 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-[#07101dcc]"
                  >
                    <View className="mb-4 flex-row items-center">
                      <View className="mr-3 h-6 w-1 rounded-full" style={{ backgroundColor: category.color || '#4c669f' }} />
                      <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {category.name}
                      </Text>
                    </View>

                    <View className="flex-row flex-wrap">
                      {category.tags.map((tag) => {
                        const isSelected = selectedTagIds.includes(tag.id);

                        return (
                          <TouchableOpacity
                            key={tag.id}
                            onPress={() => toggleTag(tag.id)}
                            activeOpacity={0.8}
                            className={`mr-2 mb-2 rounded-full border px-4 py-2.5 ${
                              isSelected
                                ? 'border-[#4c669f] bg-[#4c669f]'
                                : isDark
                                  ? 'border-white/10 bg-white/5'
                                  : 'border-slate-200 bg-slate-50'
                            }`}
                          >
                            <Text className={`text-sm font-medium ${isSelected ? 'text-white' : isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                              {isSelected ? '✓ ' : ''}
                              {tag.name}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {step === 5 ? (
            <View className="mt-6 space-y-4">
              <View className="mb-4 rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-[#07101dcc]">
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t('preferencesBudgetSectionTitle')}
                </Text>
                <Text className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('preferencesBudgetSectionSubtitle')}
                </Text>

                <View className="mt-4 flex-row flex-wrap">
                  {BUDGET_OPTIONS.map((option) => {
                    const isSelected = budget === option.value;

                    return (
                      <TouchableOpacity
                        key={option.value}
                        onPress={() => setBudget(option.value)}
                        className={`mr-2 mb-2 rounded-full border px-4 py-3 ${
                          isSelected
                            ? 'border-[#ff7a45] bg-[#ff7a45]'
                            : isDark
                              ? 'border-white/10 bg-white/5'
                              : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <Text className={`text-sm font-semibold ${isSelected ? 'text-white' : isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                          {t(option.labelKey)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View className="rounded-[28px] border border-white/60 bg-white/90 p-4 shadow-sm dark:border-white/10 dark:bg-[#07101dcc]">
                <Text className={`text-lg font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {t('preferencesRadiusSectionTitle')}
                </Text>
                <Text className={`mt-1 text-sm ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                  {t('preferencesRadiusSectionSubtitle')}
                </Text>

                <View className="mt-4 flex-row flex-wrap">
                  {RADIUS_OPTIONS.map((option) => {
                    const isSelected = radiusKm === option.value;
                    const label =
                      option.value === 'unlimited'
                        ? t('preferencesRadiusUnlimited')
                        : t('mapRadiusKm', { value: option.value });

                    return (
                      <TouchableOpacity
                        key={String(option.value)}
                        onPress={() => setRadiusKm(option.value)}
                        className={`mr-2 mb-2 rounded-full border px-4 py-3 ${
                          isSelected
                            ? 'border-[#4c669f] bg-[#4c669f]'
                            : isDark
                              ? 'border-white/10 bg-white/5'
                              : 'border-slate-200 bg-slate-50'
                        }`}
                      >
                        <Text className={`text-sm font-semibold ${isSelected ? 'text-white' : isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                          {label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          ) : null}

          <View className="h-10" />
        </ScrollView>

        <View className="px-5 pb-5 pt-3">
          <TouchableOpacity
            onPress={() => {
              void handlePrimaryAction();
            }}
            disabled={saving}
            activeOpacity={0.92}
            className={`h-14 overflow-hidden rounded-[28px] border ${saving ? 'opacity-70' : ''}`}
            style={{
              borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(15,23,42,0.08)',
              shadowColor: isDark ? '#000' : '#1d4ed8',
              shadowOffset: { width: 0, height: 10 },
              shadowOpacity: isDark ? 0.3 : 0.18,
              shadowRadius: 16,
              elevation: 8,
            }}
          >
            <LinearGradient
              colors={primaryButtonColors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              className="absolute inset-0"
            />
            <View className="h-full w-full items-center justify-center rounded-[28px] px-6">
              {saving ? (
                <ActivityIndicator color="#ffffff" />
              ) : (
                <Text className={`text-base font-semibold ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  {step === 5
                    ? isOnboarding
                      ? t('preferencesFinish')
                      : t('preferencesSave')
                    : t('preferencesContinue')}
                </Text>
              )}
            </View>
          </TouchableOpacity>

          {isOnboarding && (step === 3 || step === 5) ? (
            <TouchableOpacity onPress={() => void handleSkipStep()} className="mt-3 items-center py-2">
              <Text className={`text-sm font-semibold ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                {step === 3 ? t('preferencesSkipCities') : t('preferencesSkipBudget')}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      </View>
    </SafeAreaView>
  );
}