import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import BottomSheetModal from '@/components/ui/BottomSheetModal';
import { useI18n } from '@/hooks/use-i18n';
import type { StoredLocation } from '@/services/location-preferences';

export type LocationCityOption = {
  id: number;
  name: string;
  country: string | null;
  region?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type LocationFilterSheetProps = {
  visible: boolean;
  onClose: () => void;
  loading?: boolean;
  cities: LocationCityOption[];
  selectedLocation?: StoredLocation | null;
  onSelectAllCities?: () => void;
  onSelectCity: (city: LocationCityOption) => void;
};

function normalize(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

export default function LocationFilterSheet({
  visible,
  onClose,
  loading = false,
  cities,
  selectedLocation = null,
  onSelectAllCities,
  onSelectCity,
}: LocationFilterSheetProps) {
  const [query, setQuery] = useState('');
  const { t } = useI18n();
  const isSearching = query.trim().length > 0;
  const defaultCountry = t('homeLocationCountry');
  const lockedCountry = useMemo(
    () => selectedLocation?.country?.trim() || defaultCountry,
    [defaultCountry, selectedLocation?.country],
  );
  const normalizedDefaultCountry = defaultCountry.trim().toLowerCase();
  const normalizedLockedCountry = lockedCountry.trim().toLowerCase();
  const allCitiesSelected =
    !selectedLocation ||
    selectedLocation.mode === 'all' ||
    (!selectedLocation.mode && !selectedLocation.cityName);

  const filteredCities = useMemo(() => {
    const normalizedQuery = normalize(query);
    return [...cities]
      .filter((city) => {
        const cityCountry =
          city.country?.trim().toLowerCase() || normalizedDefaultCountry;

        if (cityCountry !== normalizedLockedCountry) {
          return false;
        }

        if (!normalizedQuery) {
          return true;
        }

        const searchableText = [city.name, city.region, city.country]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchableText.includes(normalizedQuery);
      })
      .sort((left, right) => {
        const regionCompare = (left.region ?? '').localeCompare(right.region ?? '');
        if (regionCompare !== 0) {
          return regionCompare;
        }

        return left.name.localeCompare(right.name);
      });
  }, [cities, normalizedDefaultCountry, normalizedLockedCountry, query]);

  return (
    <BottomSheetModal
      visible={visible}
      onClose={() => {
        setQuery('');
        onClose();
      }}
      title={t('homeLocationSelectTitle')}
      subtitle={lockedCountry}
      maxHeight={540}
      contentMode={isSearching ? 'fill' : 'auto'}
    >
      <View className="space-y-4">
        <View>
          <Text className="mt-2 text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
            {t('homeLocationCityLabel')}
          </Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t('homeLocationSearchPlaceholder')}
            placeholderTextColor="#9ca3af"
            className="mt-3 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-base text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </View>

        <View className="mt-6">
          <TouchableOpacity
            onPress={() => {
              setQuery('');
              if (onSelectAllCities) {
                onSelectAllCities();
              } else {
                onClose();
              }
            }}
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
            </View>
            {allCitiesSelected ? (
              <Ionicons name="checkmark-circle" size={22} color="#4c669f" />
            ) : null}
          </TouchableOpacity>

          {loading && cities.length === 0 ? (
            <View className="items-center py-6">
              <ActivityIndicator size="small" color="#4c669f" />
            </View>
          ) : (
            <>
              {filteredCities.length > 0 ? (
                filteredCities.map((city) => {
                  const selected =
                    selectedLocation?.mode === 'city' &&
                    (selectedLocation.cityId === city.id ||
                      selectedLocation.cityName?.toLowerCase() === city.name.toLowerCase());

                  return (
                    <TouchableOpacity
                      key={city.id}
                      onPress={() => {
                        setQuery('');
                        onSelectCity(city);
                      }}
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
                        <Ionicons name="checkmark-circle" size={22} color="#4c669f" />
                      ) : null}
                    </TouchableOpacity>
                  );
                })
              ) : (
                <Text className="mt-4 text-center text-sm text-gray-500 dark:text-gray-400">
                  {t('homeLocationEmpty')}
                </Text>
              )}
            </>
          )}
        </View>
      </View>
    </BottomSheetModal>
  );
}
