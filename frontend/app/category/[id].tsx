import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import LottieView from 'lottie-react-native';

import EventInspirationCard from '@/components/ui/EventInspirationCard';
import LocationFilterSheet, {
  type LocationCityOption,
} from '@/components/ui/LocationFilterSheet';
import MasonryGrid from '@/components/ui/MasonryGrid';
import PlaceInspirationCard from '@/components/ui/PlaceInspirationCard';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import { useLocationScope } from '@/hooks/useLocationScope';
import api, { clearAuthState, getImageUrl, storage } from '@/services/api';
import { getCategoryCache, setCategoryCache } from '@/services/dataCache';
import {
  formatEventCardPriceLabel,
  formatEventDate,
} from '@/services/formatters';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import {
  AnimationMeta,
  getCategoryAnimation,
} from '@/utils/category-animations';
import { useVisibleItemAutoplay } from '@/hooks/useVisibleItemAutoplay';
import { setStoredLocation, type StoredLocation } from '@/services/location-preferences';

interface CategoryTag {
  id: number;
  name: string;
}

interface CategoryResult {
  category: {
    id: number;
    name: string;
    icon: string;
    color: string;
    animationUrl?: string;
    Tag: CategoryTag[];
  };
  events: {
    id: string;
    title: string;
    startTime: string;
    coverUrl: string | null;
    entryFee: number | string | null;
    Place?: {
      id: string;
      name?: string | null;
      address?: string | null;
      City?: {
        id: number;
        name: string;
      } | null;
    } | null;
    address?: string | null;
  }[];
  places: {
    id: string;
    name: string;
    coverUrl: string | null;
    avgRating?: number | null;
    City?: {
      id: number;
      name: string;
    } | null;
    address?: string | null;
  }[];
}

interface CityOption extends LocationCityOption {}

const EVENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200';
const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';

function EmptyBlock({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return (
    <View className="rounded-3xl bg-white px-5 py-6 dark:bg-gray-900">
      <Text className="text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </Text>
      <Text className="mt-2 text-gray-500 dark:text-gray-400">{message}</Text>
    </View>
  );
}

const isUnauthorized = (error: unknown) =>
  (error as { response?: { status?: number } }).response?.status === 401;

function estimateCategoryCardHeight(index: number) {
  const imageHeights = [182, 240, 208, 262, 194, 228];
  return imageHeights[index % imageHeights.length] + 124;
}

export default function CategoryDiscoverScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { locale, t } = useI18n();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const [data, setData] = useState<CategoryResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [badgeAnimation, setBadgeAnimation] = useState<AnimationMeta | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<'events' | 'places'>('events');
  const [savedPlaceIds, setSavedPlaceIds] = useState<Set<string>>(new Set());
  const [savingPlaceIds, setSavingPlaceIds] = useState<Set<string>>(new Set());
  const [cities, setCities] = useState<CityOption[]>([]);
  const [filtersVisible, setFiltersVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView | null>(null);
  const {
    filterByLocation,
    selectedLocation,
    setSelectedLocation,
  } = useLocationScope({
    defaultCountry: t('homeLocationCountry'),
    currentLabel: t('homeLocationCurrentLabel'),
    allCitiesLabel: t('homeLocationAllCities'),
    allCountriesLabel: t('homeLocationAllCountries'),
  });

  useEffect(() => {
    let isMounted = true;

    const fetchCategory = async () => {
      if (!params.id) {
        if (isMounted) {
          setLoading(false);
        }
        return;
      }

      const cached = getCategoryCache<CategoryResult>(params.id);
      const isRefresh = !!cached;

      if (cached && isMounted) {
        setData(cached);
        setLoading(false);
        setRefreshing(true);
        setBadgeAnimation(getCategoryAnimation(cached.category));
      } else if (isMounted) {
        setLoading(true);
      }

      try {
        const response = await api.get<CategoryResult>(
          `/categories/${params.id}/discover`,
        );

        if (isMounted) {
          setData(response.data);
          setCategoryCache(params.id, response.data);
          setBadgeAnimation(getCategoryAnimation(response.data.category));
        }
      } catch {
        if (isMounted && !isRefresh) {
          setData(null);
          setBadgeAnimation(null);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };

    void fetchCategory();

    return () => {
      isMounted = false;
    };
  }, [params.id]);

  useEffect(() => {
    const loadCities = async () => {
      try {
        const response = await api.get<CityOption[]>('/cities');
        setCities(response.data);
      } catch {
        setCities([]);
      }
    };

    void loadCities();
  }, []);

  useEffect(() => {
    const loadSavedPlaces = async () => {
      const token = await storage.getItem('userToken');

      if (!token) {
        setSavedPlaceIds(new Set());
        return;
      }

      try {
        const response = await api.get<{ id: string }[]>('/places/saved/mine');
        setSavedPlaceIds(new Set(response.data.map((place) => place.id)));
      } catch (error) {
        if (isUnauthorized(error)) {
          await clearAuthState();
          router.replace('/');
          return;
        }

        setSavedPlaceIds(new Set());
      }
    };

    void loadSavedPlaces();
  }, [router]);

  const handleTogglePlaceSave = useMemo(
    () =>
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
          if (isUnauthorized(error)) {
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

  const locationFilteredEvents = useMemo(() => {
    if (!data) {
      return [];
    }

    return filterByLocation(data.events, (event) => ({
      city: event.Place?.City?.name,
      country: event.Place?.City?.country,
      address: event.address,
    }));
  }, [data, filterByLocation]);

  const locationFilteredPlaces = useMemo(() => {
    if (!data) {
      return [];
    }

    return filterByLocation(data.places, (place) => ({
      city: place.City?.name,
      country: place.City?.country,
      address: place.address,
    }));
  }, [data, filterByLocation]);

  const visibleEvents = locationFilteredEvents;
  const visiblePlaces = locationFilteredPlaces;

  const handleSelectCity = useCallback(
    (city: CityOption) => {
      const nextLocation: StoredLocation = {
        mode: 'city',
        cityId: city.id,
        cityName: city.name,
        region: city.region ?? null,
        country: city.country || t('homeLocationCountry'),
        latitude: city.latitude ?? undefined,
        longitude: city.longitude ?? undefined,
      };

      setSelectedLocation(nextLocation);
      void setStoredLocation(nextLocation);
      setFiltersVisible(false);
      requestAnimationFrame(() => {
        scrollViewRef.current?.scrollTo({ y: 0, animated: true });
      });
    },
    [setSelectedLocation, t],
  );

  const handleSelectAllCities = useCallback(() => {
    const nextLocation: StoredLocation = {
      mode: 'all',
      country: selectedLocation?.country || t('homeLocationCountry'),
    };

    setSelectedLocation(nextLocation);
    void setStoredLocation(nextLocation);
    setFiltersVisible(false);
    requestAnimationFrame(() => {
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    });
  }, [selectedLocation?.country, setSelectedLocation, t]);

  if (!data && !loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8 dark:bg-black">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          {t('categoryNotFound')}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-[#4c669f] px-5 py-3"
        >
          <Text className="font-semibold text-white">{t('publicProfileBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const eventAutoplay = useVisibleItemAutoplay(
    data?.events ?? [],
    (item) => `event-${item.id}`,
  );
  const placeAutoplay = useVisibleItemAutoplay(
    data?.places ?? [],
    (item) => `place-${item.id}`,
  );
  const eventGridOffsetYRef = useRef(0);
  const placeGridOffsetYRef = useRef(0);
  const categoryAutoplay = activeTab === 'events' ? eventAutoplay : placeAutoplay;
  const hasVisibleAutoplayTargets = categoryAutoplay.visibleIdSet.size > 0;

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <ScrollView
        ref={scrollViewRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        onLayout={categoryAutoplay.onLayout}
        onScroll={categoryAutoplay.onScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              const categoryId = params.id;

              if (!categoryId) {
                return;
              }

              void (async () => {
                setRefreshing(true);
                try {
                  const response = await api.get<CategoryResult>(
                    `/categories/${categoryId}/discover`,
                  );
                  setData(response.data);
                  setCategoryCache(categoryId, response.data);
                  setBadgeAnimation(getCategoryAnimation(response.data.category));
                } finally {
                  setRefreshing(false);
                }
              })();
            }}
            tintColor="#4c669f"
          />
        }
      >
        {loading && !data ? (
          <View className="px-5 pb-24 pt-16">
            <SkeletonBlock className="h-11 w-11 rounded-full" />
            <SkeletonBlock className="mt-6 h-4 w-24 rounded-lg" />
            <SkeletonBlock className="mt-3 h-8 w-48 rounded-lg" />
            <SkeletonBlock className="mt-4 h-4 w-64 rounded-lg" />

            <View className="mt-10">
              <View className="mb-4 flex-row items-center justify-between">
                <SkeletonBlock className="h-6 w-32 rounded-lg" />
                <SkeletonBlock className="h-4 w-10 rounded-lg" />
              </View>
              <FlatList
                data={[0, 1]}
                keyExtractor={(item) => `event-skeleton-${item}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
                renderItem={() => (
                  <View className="mr-4 w-64 overflow-hidden rounded-[28px] border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
                    <SkeletonBlock className="h-36 w-full" />
                    <View className="p-4">
                      <SkeletonBlock className="h-4 w-24 rounded-lg" />
                      <SkeletonBlock className="mt-2 h-5 w-40 rounded-lg" />
                      <SkeletonBlock className="mt-2 h-4 w-28 rounded-lg" />
                    </View>
                  </View>
                )}
              />
            </View>

            <View className="mt-10">
              <View className="mb-4 flex-row items-center justify-between">
                <SkeletonBlock className="h-6 w-24 rounded-lg" />
                <SkeletonBlock className="h-4 w-10 rounded-lg" />
              </View>
              <FlatList
                data={[0, 1]}
                keyExtractor={(item) => `place-skeleton-${item}`}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 8 }}
                renderItem={() => (
                  <View className="mr-4 w-64 overflow-hidden rounded-[28px] border border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900">
                    <SkeletonBlock className="h-36 w-full" />
                    <View className="p-4">
                      <SkeletonBlock className="h-4 w-24 rounded-lg" />
                      <SkeletonBlock className="mt-2 h-5 w-40 rounded-lg" />
                      <SkeletonBlock className="mt-2 h-4 w-28 rounded-lg" />
                    </View>
                  </View>
                )}
              />
            </View>
          </View>
        ) : null}
        {data ? (
          <>
            <View
              className="px-5 pb-8 pt-16"
              style={{ backgroundColor: `${data.category.color}18` }}
            >
              <View className="mb-6 flex-row items-center justify-between">
                <TouchableOpacity
                  onPress={() => router.back()}
                  className="h-11 w-11 items-center justify-center rounded-full bg-white/90 dark:bg-gray-900/80"
                >
                  <Ionicons name="arrow-back" size={22} color={isDark ? '#fff' : '#111827'} />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setFiltersVisible(true)}
                  className="h-11 w-11 items-center justify-center rounded-full bg-white/90 dark:bg-gray-900/80"
                >
                  <Ionicons name="funnel-outline" size={22} color={isDark ? '#fff' : '#111827'} />
                </TouchableOpacity>
              </View>

          <View className="flex-row items-center">
            <View className="mr-2 flex-shrink">
              <Text className="text-xs font-semibold uppercase tracking-[0.25em] text-gray-500 dark:text-gray-300">
                {t('categoryHeaderLabel')}
              </Text>
              <Text className="mt-2 text-3xl font-bold text-gray-900 dark:text-white">
                {data.category.name}
              </Text>
            </View>
            {badgeAnimation ? (
              <View
                className="overflow-hidden rounded-full bg-white/30 dark:bg-gray-900/40"
                style={{
                  height: badgeAnimation.container + 8,
                  width: badgeAnimation.container + 8,
                }}
              >
                <LottieView
                  source={badgeAnimation.source}
                  autoPlay
                  loop
                  style={{
                    height: badgeAnimation.size + 8,
                    width: badgeAnimation.size + 8,
                  }}
                />
              </View>
            ) : null}
            </View>

            <Text className="mt-3 text-base text-gray-600 dark:text-gray-300">
              {t('categorySummary', {
                places: data.places.length,
                events: data.events.length,
              })}
            </Text>

            <View className="mt-4 flex-row rounded-full border border-white/70 bg-white/70 p-1 dark:border-gray-800 dark:bg-gray-900/70">
              {[
                {
                  key: 'events' as const,
                  label: t('categoryEventsTitle'),
                  count: visibleEvents.length,
                  activeColor: '#ff4757',
                },
                {
                  key: 'places' as const,
                  label: t('categoryPlacesTitle'),
                  count: visiblePlaces.length,
                  activeColor: '#2ecc71',
                },
              ].map((option) => {
                const active = activeTab === option.key;

                return (
                  <TouchableOpacity
                    key={option.key}
                    onPress={() => setActiveTab(option.key)}
                    className="flex-1 items-center rounded-full px-3 py-2"
                    style={
                      active
                        ? {
                            backgroundColor: option.activeColor,
                            shadowColor: option.activeColor,
                            shadowOpacity: 0.12,
                            shadowRadius: 8,
                            shadowOffset: { width: 0, height: 3 },
                            elevation: 2,
                          }
                        : undefined
                    }
                  >
                    <Text
                      className={`text-xs font-semibold ${
                        active ? 'text-white' : 'text-gray-600 dark:text-gray-300'
                      }`}
                    >
                      {option.label} ({option.count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

          </View>

          <View className="px-5 pb-24 pt-6">
            {activeTab === 'events' ? (
              visibleEvents.length > 0 ? (
                <View
                  onLayout={(event) => {
                    eventGridOffsetYRef.current = event.nativeEvent.layout.y;
                  }}
                >
                  <MasonryGrid
                    items={visibleEvents}
                    getKey={(item) => `event-${item.id}`}
                    estimateItemHeight={(_, index) => estimateCategoryCardHeight(index)}
                    onItemLayout={(item, layout) => {
                      eventAutoplay.registerLayout(`event-${item.id}`, {
                        y: eventGridOffsetYRef.current + layout.y,
                        height: layout.height,
                      });
                    }}
                    renderItem={(item, index) => {
                      const imageHeights = [182, 240, 208, 262, 194, 228];

                      return (
                        <EventInspirationCard
                          event={{
                            id: item.id,
                            title: item.title,
                            coverUrl: item.coverUrl,
                          }}
                          imageHeight={imageHeights[index % imageHeights.length]}
                          cityLabel={item.Place?.City?.name || ''}
                          placeLabel={item.Place?.name || item.address || ''}
                          dateLabel={formatEventDate(item.startTime, locale)}
                          priceLabel={formatEventCardPriceLabel(item, locale, {
                            freeLabel: t('homePriceFree'),
                            soldOutLabel: t('homePriceSoldOut'),
                          })}
                          borderColor={data.category.color}
                          onPress={() =>
                            router.push({
                              pathname: '/event/[id]',
                              params: { id: item.id },
                            })
                          }
                          shouldPlay={
                            hasVisibleAutoplayTargets
                              ? categoryAutoplay.visibleIdSet.has(`event-${item.id}`)
                              : categoryAutoplay.activeId === `event-${item.id}`
                          }
                          adaptiveHeight={false}
                        />
                      );
                    }}
                  />
                </View>
              ) : (
                <EmptyBlock
                  title={t('categoryEmptyEventsTitle')}
                  message={t('categoryEmptyEventsDescription')}
                />
              )
            ) : visiblePlaces.length > 0 ? (
              <View
                onLayout={(event) => {
                  placeGridOffsetYRef.current = event.nativeEvent.layout.y;
                }}
              >
                <MasonryGrid
                  items={visiblePlaces}
                  getKey={(item) => `place-${item.id}`}
                  estimateItemHeight={(_, index) => estimateCategoryCardHeight(index)}
                  onItemLayout={(item, layout) => {
                    placeAutoplay.registerLayout(`place-${item.id}`, {
                      y: placeGridOffsetYRef.current + layout.y,
                      height: layout.height,
                    });
                  }}
                  renderItem={(item, index) => {
                    const imageHeights = [182, 240, 208, 262, 194, 228];

                    return (
                      <PlaceInspirationCard
                        place={item}
                        imageHeight={imageHeights[index % imageHeights.length]}
                        fallbackNewLabel={t('discoverPlaceMetaDiscover')}
                        borderColor={data.category.color}
                        onPress={() =>
                          router.push({
                            pathname: '/place/[id]',
                            params: { id: item.id },
                          })
                        }
                        isSaved={savedPlaceIds.has(item.id)}
                        onToggleSave={() => void handleTogglePlaceSave(item.id)}
                        saving={savingPlaceIds.has(item.id)}
                        shouldPlay={
                          hasVisibleAutoplayTargets
                            ? categoryAutoplay.visibleIdSet.has(`place-${item.id}`)
                            : categoryAutoplay.activeId === `place-${item.id}`
                        }
                        adaptiveHeight={false}
                      />
                    );
                  }}
                />
              </View>
            ) : (
              <EmptyBlock
                title={t('categoryEmptyPlacesTitle')}
                message={t('categoryEmptyPlacesDescription')}
              />
            )}
            </View>
          </>
        ) : null}
      </ScrollView>

      <LocationFilterSheet
        visible={filtersVisible}
        onClose={() => setFiltersVisible(false)}
        loading={loading}
        cities={cities}
        selectedLocation={selectedLocation}
        onSelectAllCities={handleSelectAllCities}
        onSelectCity={handleSelectCity}
      />
    </View>
  );
}
