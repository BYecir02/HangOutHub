import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { useI18n } from '@/hooks/use-i18n';
import {
  getStoredLocation,
  type StoredLocation,
} from '@/services/location-preferences';

export default function MapScreen() {
  const { t } = useI18n();
  const [selectedLocation, setSelectedLocation] =
    useState<StoredLocation | null>(null);
  const [mapCenter, setMapCenter] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

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
    if (
      typeof selectedLocation?.latitude === 'number' &&
      typeof selectedLocation?.longitude === 'number'
    ) {
      setMapCenter({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
      });
    }
  }, [selectedLocation]);

  const locationLabel =
    (selectedLocation?.mode === 'city' ||
      (!selectedLocation?.mode && selectedLocation?.cityName)) &&
    selectedLocation.cityName
      ? `${selectedLocation.cityName}, ${
          selectedLocation.country || t('homeLocationCountry')
        }`
      : selectedLocation?.country
        ? selectedLocation.country
        : t('homeLocationAllCountries');

  const handleRecenter = () => {
    if (
      typeof selectedLocation?.latitude !== 'number' ||
      typeof selectedLocation?.longitude !== 'number'
    ) {
      Alert.alert(t('mapRecenterTitle'), t('mapRecenterMissingCoords'));
      return;
    }

    setMapCenter({
      latitude: selectedLocation.latitude,
      longitude: selectedLocation.longitude,
    });
    Alert.alert(
      t('mapRecenterTitle'),
      t('mapRecenterMessage', { location: locationLabel }),
    );
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-xl font-bold text-gray-800 dark:text-white">
          {t('mapTitle')}
        </Text>
        <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
          {t('mapSubtitle')}
        </Text>
      </View>

      <View className="px-5 pb-6">
        <View className="mb-3 self-start rounded-full bg-white px-3 py-1.5 dark:bg-gray-800">
          <Text className="text-xs font-semibold text-gray-600 dark:text-gray-100">
            {t('homeLocationCurrentLabel')}: {locationLabel}
          </Text>
        </View>
        <View className="mb-3 self-start rounded-full bg-white px-3 py-1.5 dark:bg-gray-800">
          <Text className="text-xs font-semibold text-gray-600 dark:text-gray-100">
            {t('mapCenterLabel')}:{" "}
            {mapCenter
              ? `${mapCenter.latitude.toFixed(3)}, ${mapCenter.longitude.toFixed(3)}`
              : t('mapCenterFallback')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleRecenter}
          className="flex-row items-center justify-center rounded-2xl bg-[#4c669f] px-4 py-3"
        >
          <Ionicons name="locate-outline" size={18} color="#fff" />
          <Text className="ml-2 text-sm font-semibold text-white">
            {t('mapRecenterCta')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
