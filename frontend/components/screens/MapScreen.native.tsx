import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import {
  Camera,
  MapView,
  PointAnnotation,
  UserLocation,
  type CameraRef,
} from '@maplibre/maplibre-react-native';
import * as Location from 'expo-location';

import { useI18n } from '@/hooks/use-i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocationScope } from '@/hooks/useLocationScope';
import MediaFrame from '@/components/ui/MediaFrame';
import api, { getImageUrl } from '@/services/api';

interface PlacePin {
  id: string;
  name: string;
  coverUrl?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  avgRating?: number | null;
  PlaceTag?: {
    Tag?: {
      id: number;
      name: string;
      categoryId?: number | null;
    } | null;
  }[];
  City?: {
    name?: string | null;
    country?: string | null;
  } | null;
  address?: string | null;
}

interface CategoryItem {
  id: number;
  name: string;
  color?: string | null;
  icon?: string | null;
}

interface EventPin {
  id: string;
  title: string;
  startTime: string;
  coverUrl?: string | null;
  Place?: {
    id?: string;
    name?: string | null;
    address?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    City?: {
      name?: string | null;
      country?: string | null;
    } | null;
  } | null;
}

type MapLayer = 'all' | 'places' | 'events';
type MapCenter = {
  latitude: number;
  longitude: number;
};

const BENIN_CENTER = { latitude: 9.3077, longitude: 2.3158 };
const COUNTRY_CENTER_ZOOM = 5.2;
const CITY_CENTER_ZOOM = 12;
const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200';

export default function MapScreen() {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  const cameraRef = useRef<CameraRef | null>(null);
  const { selectedLocation, filterByLocation, locationValueLabel } = useLocationScope({
    defaultCountry: t('homeLocationCountry'),
    currentLabel: t('homeLocationCurrentLabel'),
    allCitiesLabel: t('homeLocationAllCities'),
    allCountriesLabel: t('homeLocationAllCountries'),
  });
  const [places, setPlaces] = useState<PlacePin[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlacePin | null>(null);
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [activeCategoryId, setActiveCategoryId] = useState<number | null>(null);
  const [events, setEvents] = useState<EventPin[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventPin | null>(null);
  const [activeLayer, setActiveLayer] = useState<MapLayer>('all');
  const [useMyLocation, setUseMyLocation] = useState(false);
  const [radiusKm, setRadiusKm] = useState(5);
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);
  const [mapCenter, setMapCenter] = useState<MapCenter>(BENIN_CENTER);
  const [mapZoom, setMapZoom] = useState(COUNTRY_CENTER_ZOOM);
  const headerSurfaceStyle = useMemo(
    () => ({
      backgroundColor: isDarkMode ? 'rgba(17,24,39,0.94)' : 'rgba(255,255,255,0.96)',
      borderColor: isDarkMode ? 'rgba(75,85,99,0.72)' : 'rgba(229,231,235,0.92)',
    }),
    [isDarkMode],
  );

  const updateMapCamera = useCallback((center: MapCenter, zoom: number) => {
    setMapCenter(center);
    setMapZoom(zoom);
    cameraRef.current?.setCamera({
      centerCoordinate: [center.longitude, center.latitude],
      zoomLevel: zoom,
      animationDuration: 600,
      animationMode: 'flyTo',
    });
  }, []);

  useEffect(() => {
    if (
      typeof selectedLocation?.latitude === 'number' &&
      typeof selectedLocation?.longitude === 'number'
    ) {
      updateMapCamera(
        {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        },
        CITY_CENTER_ZOOM,
      );
      return;
    }

    if (selectedLocation?.country) {
      updateMapCamera(BENIN_CENTER, COUNTRY_CENTER_ZOOM);
    }
  }, [selectedLocation, updateMapCamera]);

  const fetchPlaces = useCallback(async () => {
    try {
      const response = await api.get<PlacePin[]>('/places');
      setPlaces(response.data || []);
    } catch {
      setPlaces([]);
    }
  }, []);

  const fetchEvents = useCallback(async () => {
    try {
      const response = await api.get<EventPin[]>('/events');
      setEvents(response.data || []);
    } catch {
      setEvents([]);
    }
  }, []);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await api.get<CategoryItem[]>('/categories');
      setCategories(response.data || []);
    } catch {
      setCategories([]);
    }
  }, []);

  useEffect(() => {
    void fetchPlaces();
  }, [fetchPlaces]);

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  useEffect(() => {
    if (activeLayer === 'events') {
      setSelectedPlace(null);
    }
    if (activeLayer === 'places') {
      setSelectedEvent(null);
    }
  }, [activeLayer]);

  const locationLabel = locationValueLabel;

  const distanceKm = useCallback(
    (from: { latitude: number; longitude: number }, to: { latitude: number; longitude: number }) => {
      const R = 6371;
      const dLat = ((to.latitude - from.latitude) * Math.PI) / 180;
      const dLon = ((to.longitude - from.longitude) * Math.PI) / 180;
      const lat1 = (from.latitude * Math.PI) / 180;
      const lat2 = (to.latitude * Math.PI) / 180;

      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return R * c;
    },
    [],
  );

  const filteredPlaces = useMemo(
    () => {
      const locationFilteredPlaces = filterByLocation(places, (place) => ({
        city: place.City?.name,
        country: place.City?.country,
        address: place.address,
      }));

      return locationFilteredPlaces.filter((place) => {
        if (
          typeof place.latitude !== 'number' ||
          typeof place.longitude !== 'number'
        ) {
          return false;
        }

        if (activeCategoryId) {
          const matchCategory = place.PlaceTag?.some(
            (tag) => tag.Tag?.categoryId === activeCategoryId,
          );
          if (!matchCategory) {
            return false;
          }
        }

        if (useMyLocation && userCoords) {
          const distance = distanceKm(userCoords, {
            latitude: place.latitude,
            longitude: place.longitude,
          });
          if (distance > radiusKm) {
            return false;
          }
        }

        return true;
      });
    },
    [
      activeCategoryId,
      distanceKm,
      filterByLocation,
      places,
      radiusKm,
      useMyLocation,
      userCoords,
    ],
  );

  const filteredEvents = useMemo(
    () => {
      const locationFilteredEvents = filterByLocation(events, (event) => ({
        city: event.Place?.City?.name,
        country: event.Place?.City?.country,
        address: event.Place?.address,
      }));

      return locationFilteredEvents.filter((event) => {
        const latitude = event.Place?.latitude;
        const longitude = event.Place?.longitude;

        if (typeof latitude !== 'number' || typeof longitude !== 'number') {
          return false;
        }

        if (useMyLocation && userCoords) {
          const distance = distanceKm(userCoords, {
            latitude,
            longitude,
          });
          if (distance > radiusKm) {
            return false;
          }
        }

        return true;
      });
    },
    [
      distanceKm,
      events,
      filterByLocation,
      radiusKm,
      useMyLocation,
      userCoords,
    ],
  );

  const focusOnPlace = (place: PlacePin) => {
    if (
      typeof place.latitude !== 'number' ||
      typeof place.longitude !== 'number'
    ) {
      return;
    }

    updateMapCamera(
      {
        latitude: place.latitude,
        longitude: place.longitude,
      },
      CITY_CENTER_ZOOM,
    );
    setSelectedPlace(place);
  };

  const focusOnEvent = (event: EventPin) => {
    const latitude = event.Place?.latitude;
    const longitude = event.Place?.longitude;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return;
    }

    updateMapCamera(
      {
        latitude,
        longitude,
      },
      CITY_CENTER_ZOOM,
    );
    setSelectedEvent(event);
  };

  const handleToggleMyLocation = async () => {
    if (useMyLocation) {
      setUseMyLocation(false);
      return;
    }

    setLocating(true);
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      setLocating(false);
      Alert.alert(
        t('mapLocationPermissionTitle'),
        t('mapLocationPermissionMessage'),
      );
      return;
    }

    try {
      const position = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const coords = {
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      };
      setUserCoords(coords);
      setUseMyLocation(true);
      updateMapCamera(coords, CITY_CENTER_ZOOM);
    } catch {
      Alert.alert(t('commonErrorTitle'), t('mapLocationFailed'));
    } finally {
      setLocating(false);
    }
  };

  const handleRecenter = () => {
    if (
      typeof selectedLocation?.latitude === 'number' &&
      typeof selectedLocation?.longitude === 'number'
    ) {
      updateMapCamera(
        {
          latitude: selectedLocation.latitude,
          longitude: selectedLocation.longitude,
        },
        CITY_CENTER_ZOOM,
      );
      Alert.alert(
        t('mapRecenterTitle'),
        t('mapRecenterMessage', { location: locationLabel }),
      );
      return;
    }

    if (selectedLocation?.country) {
      updateMapCamera(BENIN_CENTER, COUNTRY_CENTER_ZOOM);
      Alert.alert(
        t('mapRecenterTitle'),
        t('mapRecenterMessage', { location: locationLabel }),
      );
      return;
    }

    Alert.alert(t('mapRecenterTitle'), t('mapRecenterMissingCoords'));
  };

  const handleRegionDidChange = useCallback((feature: any) => {
    const coordinates = feature?.geometry?.coordinates;
    if (Array.isArray(coordinates) && coordinates.length >= 2) {
      const [longitude, latitude] = coordinates;
      if (typeof latitude === 'number' && typeof longitude === 'number') {
        setMapCenter({ latitude, longitude });
      }
    }

    const zoomLevel = feature?.properties?.zoomLevel;
    if (typeof zoomLevel === 'number') {
      setMapZoom(zoomLevel);
    }
  }, []);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <MapView
        style={{ flex: 1 }}
        onPress={() => {
          setSelectedPlace(null);
          setSelectedEvent(null);
        }}
        onRegionDidChange={handleRegionDidChange}
        compassEnabled
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [mapCenter.longitude, mapCenter.latitude],
            zoomLevel: mapZoom,
          }}
        />
        <UserLocation visible={useMyLocation} />
        {(activeLayer === 'all' || activeLayer === 'places'
          ? filteredPlaces
          : []
        ).map((place) => (
          <PointAnnotation
            key={place.id}
            id={`place-${place.id}`}
            coordinate={[place.longitude as number, place.latitude as number]}
            selected={selectedPlace?.id === place.id}
            onSelected={() => setSelectedPlace(place)}
            anchor={{ x: 0.5, y: 1 }}
          >
            <View className="items-center justify-center">
              <View
                className="h-10 w-10 items-center justify-center rounded-full border-2 border-white shadow-lg"
                style={{ backgroundColor: '#2ecc71' }}
              >
                <Ionicons name="location" size={16} color="#fff" />
              </View>
              <View
                className="-mt-1 h-2.5 w-2.5 rounded-full border border-white"
                style={{ backgroundColor: '#2ecc71' }}
              />
            </View>
          </PointAnnotation>
        ))}
        {(activeLayer === 'all' || activeLayer === 'events'
          ? filteredEvents
          : []
        ).map((event) => {
          const latitude = event.Place?.latitude;
          const longitude = event.Place?.longitude;
          if (typeof latitude !== 'number' || typeof longitude !== 'number') {
            return null;
          }
          return (
            <PointAnnotation
              key={event.id}
              id={`event-${event.id}`}
              coordinate={[longitude, latitude]}
              selected={selectedEvent?.id === event.id}
              onSelected={() => setSelectedEvent(event)}
              anchor={{ x: 0.5, y: 1 }}
            >
              <View className="items-center justify-center">
                <View
                  className="h-10 w-10 items-center justify-center rounded-full border-2 border-white shadow-lg"
                  style={{ backgroundColor: '#f39c12' }}
                >
                  <Ionicons name="calendar" size={16} color="#fff" />
                </View>
                <View
                  className="-mt-1 h-2.5 w-2.5 rounded-full border border-white"
                  style={{ backgroundColor: '#f39c12' }}
                />
              </View>
            </PointAnnotation>
          );
        })}
      </MapView>

      <View className="absolute inset-x-0 top-0 px-5 pt-14">
        {headerCollapsed ? (
          <View
            className="flex-row items-center justify-between rounded-full border px-4 py-2 shadow-lg"
            style={headerSurfaceStyle}
          >
            <View className="flex-row items-center">
              <Ionicons name="location-outline" size={16} color="#2ecc71" />
              <Text className="ml-2 text-sm font-semibold text-gray-900 dark:text-white">
                {locationLabel}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => setHeaderCollapsed(false)}
              className="rounded-full bg-[#4c669f] px-3 py-1.5"
            >
              <Text className="text-xs font-semibold text-white">
                {t('mapHeaderExpand')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View className="rounded-3xl border p-4 shadow-lg" style={headerSurfaceStyle}>
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
            <TouchableOpacity
              onPress={() => setHeaderCollapsed(true)}
              className="rounded-full border border-gray-200 px-3 py-1.5 dark:border-gray-700"
            >
              <Text className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                {t('mapHeaderCollapse')}
              </Text>
            </TouchableOpacity>
            <View />
          </View>
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
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingTop: 12, paddingBottom: 4 }}
          >
            {(['all', 'places', 'events'] as MapLayer[]).map((layer) => {
              const active = activeLayer === layer;
              return (
                <TouchableOpacity
                  key={`map-layer-${layer}`}
                  onPress={() => setActiveLayer(layer)}
                  className={`mr-2 rounded-full border px-3 py-1.5 ${
                    active
                      ? 'border-[#2ecc71] bg-[#2ecc71]'
                      : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                  }`}
                >
                  <Text
                    className={`text-xs font-semibold ${
                      active ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    {layer === 'all'
                      ? t('mapFilterAll')
                      : layer === 'places'
                        ? t('mapFilterPlaces')
                        : t('mapFilterEvents')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
          {activeLayer !== 'events' ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingTop: 6, paddingBottom: 4 }}
            >
              <TouchableOpacity
                onPress={() => setActiveCategoryId(null)}
                className={`mr-2 rounded-full border px-3 py-1.5 ${
                  !activeCategoryId
                    ? 'border-[#2ecc71] bg-[#2ecc71]'
                    : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                }`}
              >
                <Text
                  className={`text-xs font-semibold ${
                    !activeCategoryId
                      ? 'text-white'
                      : 'text-gray-700 dark:text-gray-200'
                  }`}
                >
                  {t('placesFilterAll')}
                </Text>
              </TouchableOpacity>
              {categories.map((category) => {
                const active = activeCategoryId === category.id;
                return (
                  <TouchableOpacity
                    key={`map-category-${category.id}`}
                    onPress={() => setActiveCategoryId(category.id)}
                    className={`mr-2 rounded-full border px-3 py-1.5 ${
                      active
                        ? 'border-[#2ecc71] bg-[#2ecc71]'
                        : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                    }`}
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        active ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {category.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : null}
          <View className="mt-2 flex-row items-center justify-between">
            <TouchableOpacity
              onPress={handleToggleMyLocation}
              className={`rounded-full border px-3 py-1.5 ${
                useMyLocation
                  ? 'border-[#4c669f] bg-[#4c669f]'
                  : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
              }`}
            >
              <Text
                className={`text-xs font-semibold ${
                  useMyLocation ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                }`}
              >
                {locating ? t('mapLocating') : t('mapAroundMe')}
              </Text>
            </TouchableOpacity>
            {useMyLocation ? (
              <View className="flex-row items-center">
                {[2, 5, 10].map((value) => {
                  const active = radiusKm === value;
                  return (
                    <TouchableOpacity
                      key={`radius-${value}`}
                      onPress={() => setRadiusKm(value)}
                      className={`ml-2 rounded-full border px-3 py-1.5 ${
                        active
                          ? 'border-[#2ecc71] bg-[#2ecc71]'
                          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-900'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          active ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                        }`}
                      >
                        {t('mapRadiusKm', { value })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ) : null}
          </View>
          <View className="mt-3 flex-row items-center justify-between">
            <View className="rounded-full bg-gray-100 px-3 py-1.5 dark:bg-gray-800">
              <Text className="text-xs font-semibold text-gray-600 dark:text-gray-100">
                {t('mapCenterLabel')}: {mapCenter.latitude.toFixed(3)},{' '}
                {mapCenter.longitude.toFixed(3)}
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
        )}
      </View>

      <View className="absolute inset-x-0 bottom-6 px-5">
        {activeLayer !== 'events' && filteredPlaces.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: selectedPlace ? 12 : 0 }}
          >
            {filteredPlaces.map((place) => (
              <TouchableOpacity
                key={`map-mini-${place.id}`}
                onPress={() => focusOnPlace(place)}
                className="mr-3 w-48 overflow-hidden rounded-2xl bg-white p-2 shadow-lg dark:bg-gray-900"
              >
                <MediaFrame
                  source={getImageUrl(place.coverUrl) || PLACE_PLACEHOLDER}
                  className="h-20 w-full rounded-xl bg-gray-200 dark:bg-gray-800"
                  shouldPlay
                  muted
                  loop
                />
                <Text
                  className="mt-2 text-sm font-semibold text-gray-900 dark:text-white"
                  numberOfLines={2}
                >
                  {place.name}
                </Text>
                <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {place.City?.name || t('homeLocationToConfirm')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        {activeLayer === 'events' && filteredEvents.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: selectedEvent ? 12 : 0 }}
          >
            {filteredEvents.map((event) => (
              <TouchableOpacity
                key={`map-mini-event-${event.id}`}
                onPress={() => focusOnEvent(event)}
                className="mr-3 w-48 overflow-hidden rounded-2xl bg-white p-2 shadow-lg dark:bg-gray-900"
              >
                <MediaFrame
                  source={getImageUrl(event.coverUrl) || PLACE_PLACEHOLDER}
                  className="h-20 w-full rounded-xl bg-gray-200 dark:bg-gray-800"
                  shouldPlay
                  muted
                  loop
                />
                <Text
                  className="mt-2 text-sm font-semibold text-gray-900 dark:text-white"
                  numberOfLines={2}
                >
                  {event.title}
                </Text>
                <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {event.Place?.name || event.Place?.City?.name || t('homeLocationToConfirm')}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        ) : null}

        {selectedPlace ? (
          <View className="mt-3">
            <TouchableOpacity
              onPress={() => setSelectedPlace(null)}
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
              <MediaFrame
                source={getImageUrl(selectedPlace.coverUrl) || PLACE_PLACEHOLDER}
                className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-gray-800"
                shouldPlay
                muted
                loop
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
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/create-modal',
                  params: {
                    placeId: selectedPlace.id,
                    placeName: selectedPlace.name,
                    cityName: selectedPlace.City?.name || '',
                    sourceLabel: selectedPlace.name,
                    outingTitle: t('placeDetailOutingTitle', { name: selectedPlace.name }),
                  },
                })
              }
              className="mt-3 flex-row items-center justify-center rounded-2xl bg-[#4c669f] px-4 py-3"
            >
              <Ionicons name="add" size={18} color="#fff" />
              <Text className="ml-2 text-sm font-semibold text-white">
                {t('mapCreateOutingCta')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {selectedEvent ? (
          <View className="mt-3">
            <TouchableOpacity
              onPress={() => setSelectedEvent(null)}
              className="mb-3 self-center rounded-full bg-black/60 px-3 py-1"
            >
              <Text className="text-xs font-semibold text-white">
                {t('mapHideCard')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() =>
                router.push({
                  pathname: '/event/[id]',
                  params: { id: selectedEvent.id },
                })
              }
              className="flex-row items-center rounded-[28px] bg-white p-3 shadow-xl dark:bg-gray-900"
            >
              <MediaFrame
                source={getImageUrl(selectedEvent.coverUrl) || PLACE_PLACEHOLDER}
                className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-gray-800"
                shouldPlay
                muted
                loop
              />
              <View className="ml-4 flex-1">
                <Text className="text-base font-semibold text-gray-900 dark:text-white">
                  {selectedEvent.title}
                </Text>
                <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {selectedEvent.Place?.name ||
                    selectedEvent.Place?.City?.name ||
                    t('homeLocationToConfirm')}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </View>
  );
}
