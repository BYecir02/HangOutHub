import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Dimensions, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image as ExpoImage } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import MapView, { Marker, type MapStyleElement, type Region } from 'react-native-maps';
import * as Location from 'expo-location';

import { useI18n } from '@/hooks/use-i18n';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useLocationScope } from '@/hooks/useLocationScope';
import EventInspirationCard from '@/components/ui/EventInspirationCard';
import MasonryGrid from '@/components/ui/MasonryGrid';
import MediaFrame from '@/components/ui/MediaFrame';
import BottomSheetModal from '@/components/ui/BottomSheetModal';
import PlaceInspirationCard from '@/components/ui/PlaceInspirationCard';
import api, { clearAuthState, getImageUrl, storage } from '@/services/api';
import { formatEventCardPriceLabel, formatEventDate } from '@/services/formatters';
import { useVisibleItemAutoplay } from '@/hooks/useVisibleItemAutoplay';

const DARK_MAP_STYLE: MapStyleElement[] = [
  { elementType: 'geometry', stylers: [{ color: '#1d2c4d' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#1a3646' }] },
  { featureType: 'administrative', elementType: 'geometry.stroke', stylers: [{ color: '#4b6878' }] },
  { featureType: 'administrative.land_parcel', elementType: 'labels.text.fill', stylers: [{ color: '#64779e' }] },
  { featureType: 'landscape.natural', elementType: 'geometry', stylers: [{ color: '#023e58' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#283d6a' }] },
  { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#6f9ba5' }] },
  { featureType: 'poi.park', elementType: 'geometry.fill', stylers: [{ color: '#023e58' }] },
  { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#3C7680' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#304a7d' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#98a5be' }] },
  { featureType: 'road', elementType: 'labels.text.stroke', stylers: [{ color: '#1d2c4d' }] },
  { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#2c6675' }] },
  { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#255763' }] },
  { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#b0d5ce' }] },
  { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#284a5d' }] },
  { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#8ec3b9' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#0e1626' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#4e6d8c' }] },
  { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#0e1626' }] },
];

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

interface PlaceSheetDetail extends PlacePin {
  description?: string | null;
  images?: string[];
  phone?: string | null;
  whatsapp?: string | null;
  openingHours?: string | null;
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
  TicketType?: {
    id?: string;
    price: number | string;
    quantity: number;
  }[];
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

type MapMarkerRenderItem =
  | {
      id: string;
      kind: 'place';
      latitude: number;
      longitude: number;
      place: PlacePin;
      groupSize: number;
    }
  | {
      id: string;
      kind: 'event';
      latitude: number;
      longitude: number;
      event: EventPin;
      groupSize: number;
    };

type MapSuggestionTile =
  | {
      id: string;
      kind: 'place';
      place: PlacePin;
      imageHeight: number;
    }
  | {
      id: string;
      kind: 'event';
      event: EventPin;
      imageHeight: number;
    };

const BENIN_CENTER = { latitude: 9.3077, longitude: 2.3158 };
const COUNTRY_CENTER_ZOOM = 5.2;
const CITY_CENTER_ZOOM = 12;
const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200';

function zoomToRegionDelta(zoom: number) {
  const longitudeDelta = Math.max(0.005, 360 / Math.pow(2, zoom));
  return {
    latitudeDelta: longitudeDelta * 0.75,
    longitudeDelta,
  };
}

function regionFromCenter(center: MapCenter, zoom: number): Region {
  const delta = zoomToRegionDelta(zoom);
  return {
    latitude: center.latitude,
    longitude: center.longitude,
    latitudeDelta: delta.latitudeDelta,
    longitudeDelta: delta.longitudeDelta,
  };
}

function getCoordinateKey(latitude: number, longitude: number) {
  return `${latitude.toFixed(5)}:${longitude.toFixed(5)}`;
}

function offsetMarkerCoordinate(
  latitude: number,
  longitude: number,
  index: number,
  total: number,
) {
  if (total <= 1) {
    return { latitude, longitude };
  }

  const angle = (Math.PI * 2 * index) / total - Math.PI / 2;
  const radius = 0.00008 + Math.min(total, 5) * 0.00001;
  const latitudeOffset = Math.sin(angle) * radius;
  const longitudeScale = Math.max(Math.cos((latitude * Math.PI) / 180), 0.35);
  const longitudeOffset = (Math.cos(angle) * radius) / longitudeScale;

  return {
    latitude: latitude + latitudeOffset,
    longitude: longitude + longitudeOffset,
  };
}

function collectMapSheetPrefetchUrls(
  tiles: MapSuggestionTile[],
  selectedPlaceHeroSource: string,
  selectedEventHeroSource: string | null,
) {
  const urls = new Set<string>();

  if (selectedPlaceHeroSource && selectedPlaceHeroSource !== PLACE_PLACEHOLDER) {
    urls.add(selectedPlaceHeroSource);
  }

  if (selectedEventHeroSource && selectedEventHeroSource !== PLACE_PLACEHOLDER) {
    urls.add(selectedEventHeroSource);
  }

  tiles.slice(0, 8).forEach((tile) => {
    const source =
      tile.kind === 'place'
        ? getImageUrl(tile.place.coverUrl)
        : getImageUrl(tile.event.coverUrl);

    if (source && source !== PLACE_PLACEHOLDER) {
      urls.add(source);
    }
  });

  return Array.from(urls).slice(0, 10);
}

function MapSuggestionsMasonry({
  tiles,
  activeItemId,
  onPressPlace,
  onPressEvent,
  isPlaceSaved,
  isSavingPlace,
  onToggleSavePlace,
  locale,
  fallbackNewLabel,
  freeLabel,
  soldOutLabel,
  registerLayout,
}: {
  tiles: MapSuggestionTile[];
  activeItemId: string | null;
  onPressPlace: (place: PlacePin) => void;
  onPressEvent: (event: EventPin) => void;
  isPlaceSaved: (placeId: string) => boolean;
  isSavingPlace: (placeId: string) => boolean;
  onToggleSavePlace: (placeId: string) => void;
  locale: string;
  fallbackNewLabel: string;
  freeLabel: string;
  soldOutLabel: string;
  registerLayout: (id: string, layout: { y: number; height: number }) => void;
}) {
  return (
    <MasonryGrid
      items={tiles}
      getKey={(tile) => tile.id}
      estimateItemHeight={(_, index) => [184, 248, 210, 276, 196, 232][index % 6] + 144}
      onItemLayout={(tile, layout) => {
        registerLayout(tile.id, layout);
      }}
      renderItem={(tile, index) => {
        const imageHeights = [184, 240, 206, 262, 194, 228];
        const imageHeight = imageHeights[index % imageHeights.length];

        if (tile.kind === 'place') {
          const place = {
            ...tile.place,
            coverUrl: tile.place.coverUrl ?? null,
          };

          return (
            <PlaceInspirationCard
              place={place}
              imageHeight={imageHeight}
              fallbackNewLabel={fallbackNewLabel}
              onPress={() => onPressPlace(place)}
              isSaved={isPlaceSaved(place.id)}
              onToggleSave={() => onToggleSavePlace(place.id)}
              saving={isSavingPlace(place.id)}
              shouldPlay={activeItemId === tile.id}
              adaptiveHeight={false}
            />
          );
        }

        const event = {
          ...tile.event,
          coverUrl: tile.event.coverUrl ?? null,
        };

        return (
          <EventInspirationCard
            event={event}
            imageHeight={imageHeight}
            cityLabel={event.Place?.City?.name || ''}
            placeLabel={event.Place?.name || event.Place?.City?.name || ''}
            dateLabel={formatEventDate(event.startTime, locale, {
              includeWeekday: true,
            })}
            priceLabel={formatEventCardPriceLabel(event, locale, {
              freeLabel,
              soldOutLabel,
            })}
            onPress={() => onPressEvent(event)}
            shouldPlay={activeItemId === tile.id}
            adaptiveHeight={false}
          />
        );
      }}
    />
  );
}

export default function MapScreen() {
  const { locale, t } = useI18n();
  const colorScheme = useColorScheme();
  const isDarkMode = colorScheme === 'dark';
  const router = useRouter();
  const params = useLocalSearchParams<{ placeId?: string }>();
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
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());
  const [savingPlaceIds, setSavingPlaceIds] = useState<Set<string>>(new Set());
  const [userCoords, setUserCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(true);
  const [mapCenter, setMapCenter] = useState<MapCenter>(BENIN_CENTER);
  const [mapZoom, setMapZoom] = useState(COUNTRY_CENTER_ZOOM);
  const mapRef = useRef<any>(null);
  const focusedPlaceIdRef = useRef<string | null>(null);
  const skipNextMapPressRef = useRef(false);
  const [mapSheetVisible, setMapSheetVisible] = useState(false);
  const [selectedPlaceDetails, setSelectedPlaceDetails] = useState<PlaceSheetDetail | null>(null);
  const [selectedPlaceDetailsLoading, setSelectedPlaceDetailsLoading] = useState(false);
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  const headerSurfaceStyle = useMemo(
    () => ({
      backgroundColor: isDarkMode ? 'rgba(17,24,39,0.94)' : 'rgba(255,255,255,0.96)',
      borderColor: isDarkMode ? 'rgba(75,85,99,0.72)' : 'rgba(229,231,235,0.92)',
    }),
    [isDarkMode],
  );
  const floatingButtonBottomOffset = 16;
  const mapSheetMaxHeight = Math.min(520, Math.round(screenHeight * 0.56));
  const selectedPlaceHeroWidth = Math.min(340, Math.round(screenWidth * 0.84));
  const selectedPlaceHeroSource =
    getImageUrl(
      selectedPlaceDetails?.images?.[0] ||
        selectedPlaceDetails?.coverUrl ||
        selectedPlace?.coverUrl ||
        PLACE_PLACEHOLDER,
    ) || PLACE_PLACEHOLDER;
  const selectedEventHeroSource = selectedEvent ? getImageUrl(selectedEvent.coverUrl) || PLACE_PLACEHOLDER : null;

  const updateMapCamera = useCallback((center: MapCenter, zoom: number) => {
    setMapCenter(center);
    setMapZoom(zoom);
    mapRef.current?.animateToRegion(regionFromCenter(center, zoom), 600);
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

  const loadSavedPlaces = useCallback(async () => {
    const token = await storage.getItem('userToken');

    if (!token) {
      setSavedPlaceIds(new Set());
      return;
    }

    try {
      const response = await api.get<{ id: string }[]>('/places/saved/mine');
      setSavedPlaceIds(new Set(response.data.map((place) => place.id)));
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'response' in error &&
        (error as { response?: { status?: number } }).response?.status === 401
      ) {
        await clearAuthState();
        router.replace('/');
        return;
      }

      setSavedPlaceIds(new Set());
    }
  }, [router]);

  const handleTogglePlaceSave = useCallback(
    async (placeId: string) => {
      const token = await storage.getItem('userToken');

      if (!token) {
        Alert.alert(
          t('placeDetailLoginRequiredTitle'),
          t('placeDetailLoginRequiredMessage'),
        );
        return;
      }

      if (savingPlaceIds.has(placeId)) {
        return;
      }

      setSavingPlaceIds((current) => {
        const next = new Set(current);
        next.add(placeId);
        return next;
      });

      try {
        const response = await api.post<{ saved: boolean }>(`/places/${placeId}/save`);
        setSavedPlaceIds((current) => {
          const next = new Set(current);
          if (response.data.saved) {
            next.add(placeId);
          } else {
            next.delete(placeId);
          }
          return next;
        });
      } catch (error) {
        if (
          typeof error === 'object' &&
          error !== null &&
          'response' in error &&
          (error as { response?: { status?: number } }).response?.status === 401
        ) {
          await clearAuthState();
          router.replace('/');
          return;
        }

        Alert.alert(t('commonErrorTitle'), t('placeDetailSaveUpdateFailed'));
      } finally {
        setSavingPlaceIds((current) => {
          const next = new Set(current);
          next.delete(placeId);
          return next;
        });
      }
    },
    [router, savingPlaceIds, t],
  );

  const fetchEvents = useCallback(async () => {
    try {
      const response = await api.get<{ items: EventPin[]; nextCursor: string | null; hasMore: boolean }>('/events?limit=100');
      setEvents(response.data.items || []);
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
    void loadSavedPlaces();
  }, [loadSavedPlaces]);

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

  const mapSuggestionTiles = useMemo<MapSuggestionTile[]>(() => {
    if (activeLayer === 'places') {
      return filteredPlaces.map((place) => ({
        id: `place-${place.id}`,
        kind: 'place' as const,
        place,
        imageHeight: 0,
      }));
    }

    if (activeLayer === 'events') {
      return filteredEvents.map((event) => ({
        id: `event-${event.id}`,
        kind: 'event' as const,
        event,
        imageHeight: 0,
      }));
    }

    return [
      ...filteredPlaces.map((place) => ({
        id: `place-${place.id}`,
        kind: 'place' as const,
        place,
        imageHeight: 0,
      })),
      ...filteredEvents.map((event) => ({
        id: `event-${event.id}`,
        kind: 'event' as const,
        event,
        imageHeight: 0,
      })),
    ];
  }, [activeLayer, filteredEvents, filteredPlaces]);

  const mapSuggestionAutoplay = useVisibleItemAutoplay(
    mapSuggestionTiles,
    (item) => item.id,
  );

  useEffect(() => {
    const urlsToPrefetch = collectMapSheetPrefetchUrls(
      mapSuggestionTiles,
      selectedPlace ? selectedPlaceHeroSource : '',
      selectedEvent ? selectedEventHeroSource : null,
    );

    if (urlsToPrefetch.length === 0) {
      return;
    }

    void Promise.all(urlsToPrefetch.map((url) => ExpoImage.prefetch(url))).catch(() => {
      // Préchargement opportuniste: on ignore les erreurs réseau.
    });
  }, [mapSuggestionTiles, selectedEvent, selectedEventHeroSource, selectedPlace, selectedPlaceHeroSource]);

  const renderedMarkers = useMemo<MapMarkerRenderItem[]>(() => {
    const rawMarkers: Array<
      | {
          id: string;
          kind: 'place';
          latitude: number;
          longitude: number;
          place: PlacePin;
        }
      | {
          id: string;
          kind: 'event';
          latitude: number;
          longitude: number;
          event: EventPin;
        }
    > = [];

    if (activeLayer === 'all' || activeLayer === 'places') {
      filteredPlaces.forEach((place) => {
        if (typeof place.latitude === 'number' && typeof place.longitude === 'number') {
          rawMarkers.push({
            id: `place-${place.id}`,
            kind: 'place',
            latitude: place.latitude,
            longitude: place.longitude,
            place,
          });
        }
      });
    }

    if (activeLayer === 'all' || activeLayer === 'events') {
      filteredEvents.forEach((event) => {
        const latitude = event.Place?.latitude;
        const longitude = event.Place?.longitude;

        if (typeof latitude === 'number' && typeof longitude === 'number') {
          rawMarkers.push({
            id: `event-${event.id}`,
            kind: 'event',
            latitude,
            longitude,
            event,
          });
        }
      });
    }

    const groupedMarkers = new Map<string, typeof rawMarkers>();

    rawMarkers.forEach((marker) => {
      const key = getCoordinateKey(marker.latitude, marker.longitude);
      const group = groupedMarkers.get(key);
      if (group) {
        group.push(marker);
        return;
      }

      groupedMarkers.set(key, [marker]);
    });

    const nextMarkers: MapMarkerRenderItem[] = [];

    groupedMarkers.forEach((group) => {
      group.forEach((marker, index) => {
        const coordinate = offsetMarkerCoordinate(
          marker.latitude,
          marker.longitude,
          index,
          group.length,
        );

        if (marker.kind === 'place') {
          nextMarkers.push({
            id: marker.id,
            kind: 'place',
            latitude: coordinate.latitude,
            longitude: coordinate.longitude,
            place: marker.place,
            groupSize: group.length,
          });
          return;
        }

        nextMarkers.push({
          id: marker.id,
          kind: 'event',
          latitude: coordinate.latitude,
          longitude: coordinate.longitude,
          event: marker.event,
          groupSize: group.length,
        });
      });
    });

    return nextMarkers;
  }, [activeLayer, filteredEvents, filteredPlaces]);

  const focusOnPlace = useCallback((place: PlacePin) => {
    if (
      typeof place.latitude !== 'number' ||
      typeof place.longitude !== 'number'
    ) {
      return;
    }

    setSelectedEvent(null);
    setSelectedPlaceDetails(null);
    setSelectedPlaceDetailsLoading(true);
    updateMapCamera(
      {
        latitude: place.latitude,
        longitude: place.longitude,
      },
      CITY_CENTER_ZOOM,
    );
    setMapSheetVisible(true);
    setSelectedPlace(place);
  }, [updateMapCamera]);

  const focusOnEvent = (event: EventPin) => {
    const latitude = event.Place?.latitude;
    const longitude = event.Place?.longitude;

    if (typeof latitude !== 'number' || typeof longitude !== 'number') {
      return;
    }

    setSelectedPlace(null);
    setSelectedPlaceDetails(null);
    updateMapCamera(
      {
        latitude,
        longitude,
      },
      CITY_CENTER_ZOOM,
    );
    setMapSheetVisible(true);
    setSelectedEvent(event);
  };

  const clearSelectedPlace = useCallback((keepSheetVisible = true) => {
    setSelectedPlace(null);
    setSelectedPlaceDetails(null);
    focusedPlaceIdRef.current = null;
    if (typeof params.placeId === 'string' && params.placeId) {
      router.replace('/(tabs)/map');
    }
    setMapSheetVisible(keepSheetVisible);
  }, [params.placeId, router]);

  useEffect(() => {
    const placeId = typeof params.placeId === 'string' ? params.placeId : '';
    if (!placeId) {
      focusedPlaceIdRef.current = null;
      return;
    }

    if (focusedPlaceIdRef.current === placeId) {
      return;
    }

    const targetPlace = places.find((place) => place.id === placeId);
    if (!targetPlace) {
      return;
    }

    setActiveLayer('places');

    if (selectedPlace?.id !== targetPlace.id) {
      focusOnPlace(targetPlace);
    }

    focusedPlaceIdRef.current = placeId;
  }, [focusOnPlace, params.placeId, places]);

  useEffect(() => {
    let isMounted = true;

    const loadSelectedPlaceDetails = async () => {
      if (!selectedPlace) {
        setSelectedPlaceDetails(null);
        setSelectedPlaceDetailsLoading(false);
        return;
      }

      setSelectedPlaceDetailsLoading(true);

      try {
        const response = await api.get<PlaceSheetDetail>(`/places/${selectedPlace.id}`);
        if (isMounted) {
          setSelectedPlaceDetails(response.data);
        }
      } catch {
        if (isMounted) {
          setSelectedPlaceDetails(selectedPlace);
        }
      } finally {
        if (isMounted) {
          setSelectedPlaceDetailsLoading(false);
        }
      }
    };

    void loadSelectedPlaceDetails();

    return () => {
      isMounted = false;
    };
  }, [selectedPlace]);

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

  const handleRegionChangeComplete = useCallback((region: Region) => {
    setMapCenter({
      latitude: region.latitude,
      longitude: region.longitude,
    });

    if (typeof region.longitudeDelta === 'number' && region.longitudeDelta > 0) {
      setMapZoom(Math.log2(360 / region.longitudeDelta));
    }
  }, []);

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        initialRegion={regionFromCenter(mapCenter, mapZoom)}
        customMapStyle={isDarkMode ? DARK_MAP_STYLE : undefined}
        showsCompass
        showsMyLocationButton={false}
        showsUserLocation={useMyLocation}
        onPress={() => {
          if (skipNextMapPressRef.current) {
            skipNextMapPressRef.current = false;
            return;
          }

          if (selectedPlace || selectedEvent) {
            clearSelectedPlace(true);
            setSelectedEvent(null);
          }
        }}
        onRegionChangeComplete={handleRegionChangeComplete}
      >
        {renderedMarkers.map((marker) => {
          const isSelectedPlace = marker.kind === 'place' && selectedPlace?.id === marker.place.id;
          const isSelectedEvent = marker.kind === 'event' && selectedEvent?.id === marker.event.id;
          const isSelected = isSelectedPlace || isSelectedEvent;

          return (
            <Marker
              key={marker.id}
              coordinate={{ latitude: marker.latitude, longitude: marker.longitude }}
              anchor={{ x: 0.5, y: 1 }}
              onPress={() => {
                skipNextMapPressRef.current = true;
                setMapSheetVisible(true);

                if (marker.kind === 'place') {
                  setSelectedEvent(null);
                  setSelectedPlace(marker.place);
                  return;
                }

                setSelectedPlace(null);
                setSelectedEvent(marker.event);
              }}
            >
              <View className="items-center justify-center">
                {isSelected ? <View className="absolute h-10 w-10 rounded-full bg-white/20" /> : null}
                <View
                  className={`rounded-full border-2 border-white shadow-lg ${
                    isSelected ? 'h-5 w-5' : 'h-4 w-4'
                  }`}
                  style={{ backgroundColor: marker.kind === 'place' ? '#2ecc71' : '#f39c12' }}
                />
                {marker.groupSize > 1 ? (
                  <View className="mt-1 rounded-full bg-black/70 px-1.5 py-0.5">
                    <Text className="text-[10px] font-bold text-white">+{marker.groupSize - 1}</Text>
                  </View>
                ) : null}
              </View>
            </Marker>
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

      <BottomSheetModal
        visible={mapSheetVisible}
        onClose={() => setMapSheetVisible(false)}
        title={
          selectedPlace
            ? selectedPlace.name
            : selectedEvent
              ? selectedEvent.title
              : activeLayer === 'events'
                ? 'Suggestions d\'événements'
                : 'Suggestions de lieux'
        }
        subtitle={
          selectedPlace
            ? selectedPlaceDetails?.address || selectedPlace.City?.name || t('homeAddressToConfirm')
            : selectedEvent
              ? selectedEvent.Place?.name || selectedEvent.Place?.City?.name || t('homeLocationToConfirm')
              : activeLayer === 'events'
                ? 'Touchez un événement pour voir son aperçu.'
                : 'Touchez un lieu pour voir sa galerie et ouvrir sa fiche.'
        }
        maxHeight={mapSheetMaxHeight}
        backdropOpacity={0}
        contentMode="auto"
        onContentLayout={mapSuggestionAutoplay.onLayout}
        onContentScroll={mapSuggestionAutoplay.onScroll}
        onContentScrollBeginDrag={mapSuggestionAutoplay.beginInteraction}
        onContentScrollEndDrag={mapSuggestionAutoplay.endInteraction}
        onContentMomentumScrollBegin={mapSuggestionAutoplay.beginMomentum}
        onContentMomentumScrollEnd={mapSuggestionAutoplay.endMomentum}
        heroContent={
          selectedPlace ? (
            <View className="items-center">
              <View
                className="overflow-hidden rounded-3xl bg-gray-50 dark:bg-gray-800"
                style={{ width: selectedPlaceHeroWidth }}
              >
                {selectedPlaceDetailsLoading ? (
                  <View className="h-32 items-center justify-center">
                    <ActivityIndicator size="large" color="#2ecc71" />
                  </View>
                ) : (
                  <MediaFrame
                    source={selectedPlaceHeroSource}
                    adaptiveHeight
                    minHeight={108}
                    maxHeight={164}
                    className="bg-gray-200 dark:bg-gray-800"
                    style={{ width: selectedPlaceHeroWidth }}
                    shouldPlay
                    muted
                    loop
                  />
                )}
              </View>
            </View>
          ) : undefined
        }
      >
        {selectedPlace ? (
          <View className="space-y-4">
            <View className="rounded-3xl bg-gray-50 p-4 dark:bg-gray-800">
              <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {selectedPlaceDetails?.description || selectedPlace.address || selectedPlace.City?.name || t('homeLocationToConfirm')}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/place/[id]',
                    params: { id: selectedPlace.id },
                  })
                }
                className="mt-4 flex-row items-center justify-center rounded-2xl bg-[#2ecc71] px-4 py-3"
              >
                <Text className="text-sm font-semibold text-white">
                  Voir la fiche du lieu
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
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
          </View>
        ) : selectedEvent ? (
          <View className="space-y-4">
            <MediaFrame
              source={getImageUrl(selectedEvent.coverUrl) || PLACE_PLACEHOLDER}
              className="h-44 w-full rounded-3xl bg-gray-200 dark:bg-gray-800"
              shouldPlay
              muted
              loop
            />
            <View className="rounded-3xl bg-gray-50 p-4 dark:bg-gray-800">
              <Text className="text-base font-semibold text-gray-900 dark:text-white">
                {selectedEvent.title}
              </Text>
              <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                {selectedEvent.Place?.name || selectedEvent.Place?.City?.name || t('homeLocationToConfirm')}
              </Text>
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/event/[id]',
                    params: { id: selectedEvent.id },
                  })
                }
                className="mt-4 flex-row items-center justify-center rounded-2xl bg-[#f39c12] px-4 py-3"
              >
                <Text className="text-sm font-semibold text-white">
                  Voir l'événement
                </Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : mapSuggestionTiles.length > 0 ? (
          <MapSuggestionsMasonry
            tiles={mapSuggestionTiles}
            activeItemId={mapSuggestionAutoplay.activeId}
            locale={locale}
            fallbackNewLabel={t('placesNewBadge')}
            freeLabel={t('homePriceFree')}
            soldOutLabel={t('homePriceSoldOut')}
            onPressPlace={focusOnPlace}
            onPressEvent={focusOnEvent}
            isPlaceSaved={(placeId) => savedPlaceIds.has(placeId)}
            isSavingPlace={(placeId) => savingPlaceIds.has(placeId)}
            onToggleSavePlace={(placeId) => void handleTogglePlaceSave(placeId)}
            registerLayout={mapSuggestionAutoplay.registerLayout}
          />
        ) : activeLayer === 'events' ? (
          <View className="items-center justify-center rounded-3xl bg-gray-50 px-4 py-10 dark:bg-gray-800">
            <Text className="text-sm font-semibold text-gray-900 dark:text-white">
              Aucun événement pour ce filtre.
            </Text>
          </View>
        ) : (
          <View className="items-center justify-center rounded-3xl bg-gray-50 px-4 py-10 dark:bg-gray-800">
            <Text className="text-sm font-semibold text-gray-900 dark:text-white">
              Aucun lieu pour ce filtre.
            </Text>
          </View>
        )}
      </BottomSheetModal>

      {mapSheetVisible ? null : (
        <View
          className="absolute inset-x-0 items-center px-4"
          style={{ bottom: floatingButtonBottomOffset }}
        >
          <TouchableOpacity
            onPress={() => setMapSheetVisible(true)}
            className="rounded-full bg-[#2ecc71] px-4 py-2.5 shadow-lg"
          >
            <Text className="text-xs font-semibold text-white">Ouvrir les suggestions</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}
