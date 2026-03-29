import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import { useI18n } from '@/hooks/use-i18n';
import api from '@/services/api';
import { getCache, setCache } from '@/services/dataCache';
import {
  getStoredLocation,
  setStoredLocation,
  type StoredLocation,
} from '@/services/location-preferences';

interface CityOption {
  id: number;
  name: string;
  slug?: string | null;
  region?: string | null;
  imageUrl?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

type CountryOption = {
  name: string;
};

export default function LocationScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const cachedCities = getCache<CityOption[]>('cities');
  const [cities, setCities] = useState<CityOption[]>(cachedCities ?? []);
  const [loading, setLoading] = useState(!cachedCities);
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedLocation, setSelectedLocation] =
    useState<StoredLocation | null>(null);

  useFocusEffect(
    useCallback(() => {
      let isMounted = true;

      const hydrateLocation = async () => {
        const storedLocation = await getStoredLocation();
        if (!isMounted) {
          return;
        }

        setSelectedLocation(storedLocation);
      };

      void hydrateLocation();

      return () => {
        isMounted = false;
      };
    }, []),
  );

  useEffect(() => {
    let isMounted = true;

    const loadCities = async () => {
      setLoading(!cachedCities);
      try {
        const response = await api.get<CityOption[]>('/cities');
        if (!isMounted) {
          return;
        }
        setCities(response.data);
        setCache('cities', response.data);
      } catch {
        if (isMounted && cachedCities) {
          setCities(cachedCities);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    void loadCities();

    return () => {
      isMounted = false;
    };
  }, [cachedCities]);

  const defaultCountry = t('homeLocationCountry');
  const selectedCountry = selectedLocation?.country;
  const normalizedDefaultCountry = defaultCountry.trim().toLowerCase();
  const effectiveCountry =
    selectedCountry || (selectedLocation?.cityName ? defaultCountry : undefined);

  const normalizedSelectedCountry = effectiveCountry
    ? effectiveCountry.trim().toLowerCase()
    : '';

  const countryOptions = useMemo<CountryOption[]>(() => {
    const unique = new Set<string>();

    cities.forEach((city) => {
      const cityCountry = city.country?.trim();
      if (cityCountry) {
        unique.add(cityCountry);
      }
    });

    if (unique.size === 0) {
      unique.add(defaultCountry);
    }

    return Array.from(unique).map((name) => ({ name }));
  }, [cities, defaultCountry]);

  const filteredCities = useMemo(() => {
    const normalizedQuery = locationQuery.trim().toLowerCase();

    return cities.filter((city) => {
      const cityCountry =
        city.country?.trim().toLowerCase() || normalizedDefaultCountry;

      if (normalizedSelectedCountry && cityCountry !== normalizedSelectedCountry) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      const searchableText = [city.name, city.region, city.slug]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchableText.includes(normalizedQuery);
    });
  }, [
    cities,
    locationQuery,
    normalizedDefaultCountry,
    normalizedSelectedCountry,
  ]);

  const allCountriesSelected = !effectiveCountry;
  const allCitiesSelected =
    !selectedLocation ||
    selectedLocation.mode === 'all' ||
    (!selectedLocation.mode && !selectedLocation.cityName);

  const isCountrySelected = (country: CountryOption) => {
    if (!effectiveCountry) {
      return false;
    }

    return effectiveCountry.toLowerCase() === country.name.toLowerCase();
  };

  const isCitySelected = (city: CityOption) => {
    const isCityMode =
      selectedLocation?.mode === 'city' ||
      (!selectedLocation?.mode && !!selectedLocation?.cityName);

    if (!isCityMode) {
      return false;
    }

    if (selectedLocation?.cityId) {
      return selectedLocation.cityId === city.id;
    }

    return (
      selectedLocation?.cityName?.toLowerCase() === city.name.toLowerCase()
    );
  };

  const handleSelectCountry = (country?: CountryOption) => {
    if (!country) {
      const nextLocation: StoredLocation = { mode: 'all' };
      setSelectedLocation(nextLocation);
      void setStoredLocation(nextLocation);
      setLocationQuery('');
      return;
    }

    const nextLocation: StoredLocation = {
      mode: 'all',
      country: country.name,
    };
    setSelectedLocation(nextLocation);
    void setStoredLocation(nextLocation);
    setLocationQuery('');
  };

  const handleSelectAllCities = () => {
    const nextLocation: StoredLocation = {
      mode: 'all',
      country: effectiveCountry || undefined,
    };
    setSelectedLocation(nextLocation);
    void setStoredLocation(nextLocation);
    router.back();
  };

  const handleSelectCity = (city: CityOption) => {
    const nextLocation: StoredLocation = {
      mode: 'city',
      cityId: city.id,
      cityName: city.name,
      region: city.region ?? null,
      country: effectiveCountry || defaultCountry,
      latitude: typeof city.latitude === 'number' ? city.latitude : undefined,
      longitude: typeof city.longitude === 'number' ? city.longitude : undefined,
    };
    setSelectedLocation(nextLocation);
    void setStoredLocation(nextLocation);
    router.back();
  };

  return (
    <View className="flex-1 bg-gray-50 pt-16 dark:bg-black">
      <View className="px-5 pb-4">
        <View className="flex-row items-center">
          <TouchableOpacity
            onPress={() => router.back()}
            className="mr-4 rounded-full bg-white p-3 dark:bg-gray-900"
          >
            <Ionicons name="arrow-back" size={22} color="#4c669f" />
          </TouchableOpacity>

          <View className="flex-1">
            <Text className="text-xs uppercase tracking-[0.24em] text-gray-400 dark:text-gray-500">
              {t('homeLocationLabel')}
            </Text>
            <Text className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
              {t('homeLocationSelectTitle')}
            </Text>
            <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {t('homeLocationSelectSubtitle')}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="px-5 pb-6">
          <Text className="mt-2 text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('homeLocationCountryLabel')}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingVertical: 10 }}
          >
            <TouchableOpacity
              onPress={() => handleSelectCountry(undefined)}
              className={`mr-3 rounded-full border px-4 py-2 ${
                allCountriesSelected
                  ? 'border-[#4c669f] bg-blue-50 dark:bg-blue-950/30'
                  : 'border-gray-200 dark:border-gray-700'
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  allCountriesSelected
                    ? 'text-[#4c669f]'
                    : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                {t('homeLocationAllCountries')}
              </Text>
            </TouchableOpacity>
            {countryOptions.map((country) => {
              const selected = isCountrySelected(country);
              return (
                <TouchableOpacity
                  key={country.name}
                  onPress={() => handleSelectCountry(country)}
                  className={`mr-3 rounded-full border px-4 py-2 ${
                    selected
                      ? 'border-[#4c669f] bg-blue-50 dark:bg-blue-950/30'
                      : 'border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <Text
                    className={`text-sm font-semibold ${
                      selected
                        ? 'text-[#4c669f]'
                        : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {country.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text className="mt-2 text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('homeLocationCityLabel')}
          </Text>
          <TextInput
            value={locationQuery}
            onChangeText={setLocationQuery}
            placeholder={t('homeLocationSearchPlaceholder')}
            placeholderTextColor="#9ca3af"
            className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />

          <View className="mt-4">
            {loading && cities.length === 0 ? (
              <View className="items-center py-6">
                <ActivityIndicator size="small" color="#4c669f" />
              </View>
            ) : (
              <>
                <TouchableOpacity
                  onPress={handleSelectAllCities}
                  className={`flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
                    allCitiesSelected
                      ? 'border-[#4c669f] bg-blue-50 dark:bg-gray-800'
                      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                  }`}
                >
                  <View>
                    <Text
                      className={`text-base font-semibold ${
                        allCitiesSelected
                          ? 'text-gray-900 dark:text-white'
                          : 'text-gray-800 dark:text-gray-100'
                      }`}
                    >
                      {t('homeLocationAllCities')}
                    </Text>
                    {allCitiesSelected ? (
                      <Text className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                        {t('homeLocationCurrentLabel')}
                      </Text>
                    ) : null}
                  </View>
                  {allCitiesSelected ? (
                    <Ionicons name="checkmark-circle" size={22} color="#4c669f" />
                  ) : null}
                </TouchableOpacity>

                {filteredCities.length > 0 ? (
                  filteredCities.map((city) => {
                    const selected = isCitySelected(city);
                    return (
                    <TouchableOpacity
                      key={city.id}
                      onPress={() => handleSelectCity(city)}
                      className={`mt-3 flex-row items-center justify-between rounded-2xl border px-4 py-3 ${
                        selected
                          ? 'border-[#4c669f] bg-blue-50 dark:bg-gray-800'
                          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                      }`}
                    >
                      <View className="flex-1 pr-3">
                        <Text
                          className={`text-base font-semibold ${
                            selected
                              ? 'text-gray-900 dark:text-white'
                              : 'text-gray-800 dark:text-gray-100'
                          }`}
                        >
                          {city.name}
                        </Text>
                        {city.region ? (
                          <Text className="mt-1 text-xs text-gray-500 dark:text-gray-300">
                            {city.region}
                          </Text>
                        ) : null}
                      </View>
                      {selected ? (
                        <Ionicons
                          name="checkmark-circle"
                          size={22}
                          color="#4c669f"
                        />
                      ) : null}
                    </TouchableOpacity>
                  )})
                ) : (
                  <Text className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                    {t('homeLocationEmpty')}
                  </Text>
                )}
              </>
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}
