import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Image, Text, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Callout, Marker, type Region } from 'react-native-maps';

import { useI18n } from '@/hooks/use-i18n';
import api, { getImageUrl } from '@/services/api';
import {
  getStoredLocation,
  type StoredLocation,
} from '@/services/location-preferences';

interface PlacePin {
  id: string;
  name: string;
  coverUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  avgRating?: number | null;
  City?: {
    name?: string | null;
    country?: string | null;
  } | null;
  address?: string | null;
}

const BENIN_CENTER = { latitude: 9.3077, longitude: 2.3158 };
const COUNTRY_DELTA = { latitudeDelta: 5.2, longitudeDelta: 5.2 };
const CITY_DELTA = { latitudeDelta: 0.15, longitudeDelta: 0.15 };
const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200';

export default function MapScreen() {
  const { t } = useI18n();
  const router = useRouter();
  const mapRef = useRef<MapView | null>(null);
  const [selectedLocation, setSelectedLocation] =
    useState<StoredLocation | null>(null);
  const [places, setPlaces] = useState<PlacePin[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlacePin | null>(null);
  const [mapRegion, setMapRegion] = useState<Region>({
    ...BENIN_CENTER,
    ...COUNTRY_DELTA,
  });

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
      setMapRegion({
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        ...CITY_DELTA,
      });
      return;
    }

    if (selectedLocation?.country) {
      setMapRegion({
        ...BENIN_CENTER,
        ...COUNTRY_DELTA,
      });
    }
  }, [selectedLocation]);

  const fetchPlaces = useCallback(async () => {
    try {
      const response = await api.get<PlacePin[]>('/places');
      setPlaces(response.data || []);
    } catch {
      setPlaces([]);
    }
  }, []);

  useEffect(() => {
    void fetchPlaces();
  }, [fetchPlaces]);

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

  const defaultCountry = t('homeLocationCountry').trim().toLowerCase();
  const activeCityName =
    (selectedLocation?.mode === 'city' ||
      (!selectedLocation?.mode && selectedLocation?.cityName)) &&
    selectedLocation.cityName
      ? selectedLocation.cityName.trim().toLowerCase()
      : '';
  const activeCountry =
    selectedLocation?.country?.trim().toLowerCase() || '';

  const filteredPlaces = useMemo(
    () =>
      places.filter((place) => {
        if (
          typeof place.latitude !== 'number' ||
          typeof place.longitude !== 'number'
        ) {
          return false;
        }

        if (activeCountry) {
          const placeCountry =
            place.City?.country?.trim().toLowerCase() || defaultCountry;
          if (placeCountry !== activeCountry) {
            return false;
          }
        }

        if (activeCityName) {
          const cityName = place.City?.name?.trim().toLowerCase();
          const address = place.address?.trim().toLowerCase();
          const matchesCity =
            cityName === activeCityName ||
            (!!address && address.includes(activeCityName));
          if (!matchesCity) {
            return false;
          }
        }

        return true;
      }),
    [activeCityName, activeCountry, defaultCountry, places],
  );

  const handleRecenter = () => {
    if (
      typeof selectedLocation?.latitude === 'number' &&
      typeof selectedLocation?.longitude === 'number'
    ) {
      const nextRegion = {
        latitude: selectedLocation.latitude,
        longitude: selectedLocation.longitude,
        ...CITY_DELTA,
      };
      mapRef.current?.animateToRegion(nextRegion, 600);
      setMapRegion(nextRegion);
      Alert.alert(
        t('mapRecenterTitle'),
        t('mapRecenterMessage', { location: locationLabel }),
      );
      return;
    }

    if (selectedLocation?.country) {
      const nextRegion = {
        ...BENIN_CENTER,
        ...COUNTRY_DELTA,
      };
      mapRef.current?.animateToRegion(nextRegion, 600);
      setMapRegion(nextRegion);
      Alert.alert(
        t('mapRecenterTitle'),
        t('mapRecenterMessage', { location: locationLabel }),
      );
      return;
    }

    Alert.alert(t('mapRecenterTitle'), t('mapRecenterMissingCoords'));
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        region={mapRegion}
        onRegionChangeComplete={setMapRegion}
        onPress={() => setSelectedPlace(null)}
        showsUserLocation={false}
        showsMyLocationButton={false}
        showsCompass={true}
      >
        {filteredPlaces.map((place) => (
          <Marker
            key={place.id}
            coordinate={{
              latitude: place.latitude as number,
              longitude: place.longitude as number,
            }}
            onPress={() => setSelectedPlace(place)}
            title={place.name}
            description={place.address || place.City?.name || undefined}
          >
            <Callout
              onPress={() =>
                router.push({
                  pathname: '/place/[id]',
                  params: { id: place.id },
                })
              }
            >
              <View className="w-48">
                <Text className="text-sm font-semibold text-gray-900">
                  {place.name}
                </Text>
                <Text className="mt-1 text-xs text-gray-500">
                  {place.address || place.City?.name || t('homeAddressToConfirm')}
                </Text>
                <Text className="mt-2 text-xs font-semibold text-[#4c669f]">
                  {t('mapOpenPlaceCta')}
                </Text>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      <View className="absolute inset-x-0 top-0 px-5 pt-14">
        <View className="rounded-3xl bg-white/95 p-4 shadow-lg dark:bg-gray-900/95">
          <Text className="text-xs uppercase tracking-[0.22em] text-gray-400 dark:text-gray-500">
            {t('mapTitle')}
          </Text>
          <Text className="mt-1 text-xl font-bold text-gray-900 dark:text-white">
            {locationLabel}
          </Text>
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {t('mapSubtitle')}
          </Text>
          <View className="mt-3 flex-row items-center justify-between">
            <View className="rounded-full bg-gray-100 px-3 py-1.5 dark:bg-gray-800">
              <Text className="text-xs font-semibold text-gray-600 dark:text-gray-100">
                {t('homeLocationCurrentLabel')}: {locationLabel}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => router.push('/location')}
              className="rounded-full border border-gray-200 px-3 py-1.5 dark:border-gray-700"
            >
              <Text className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                {t('homeLocationChangeCta')}
              </Text>
            </TouchableOpacity>
          </View>
          <View className="mt-3 flex-row items-center justify-between">
            <View className="rounded-full bg-gray-100 px-3 py-1.5 dark:bg-gray-800">
              <Text className="text-xs font-semibold text-gray-600 dark:text-gray-100">
                {t('mapCenterLabel')}: {mapRegion.latitude.toFixed(3)},{' '}
                {mapRegion.longitude.toFixed(3)}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleRecenter}
              className="flex-row items-center rounded-full bg-[#4c669f] px-3 py-1.5"
            >
              <Ionicons name="locate-outline" size={16} color="#fff" />
              <Text className="ml-1 text-xs font-semibold text-white">
                {t('mapRecenterCta')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {selectedPlace ? (
        <View className="absolute inset-x-0 bottom-6 px-5">
          <TouchableOpacity
            onPress={() =>
              setSelectedPlace(null)
            }
            className="mb-3 self-center rounded-full bg-black/60 px-3 py-1"
          >
            <Text className="text-xs font-semibold text-white">
              {t('mapHideCard')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/place/[id]',
                params: { id: selectedPlace.id },
              })
            }
            className="flex-row items-center rounded-[28px] bg-white p-3 shadow-xl dark:bg-gray-900"
          >
            <Image
              source={{
                uri: getImageUrl(selectedPlace.coverUrl) || PLACE_PLACEHOLDER,
              }}
              className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-gray-800"
              resizeMode="cover"
            />
            <View className="ml-4 flex-1">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {selectedPlace.name}
              </Text>
              <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {selectedPlace.address ||
                  selectedPlace.City?.name ||
                  t('homeAddressToConfirm')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
          </TouchableOpacity>
        </View>
      ) : null}
    </View>
  );
}
