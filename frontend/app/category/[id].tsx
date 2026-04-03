import React, { useEffect, useMemo, useState } from 'react';
import {
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

import MediaFrame from '@/components/ui/MediaFrame';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import api, { getImageUrl } from '@/services/api';
import { getCategoryCache, setCategoryCache } from '@/services/dataCache';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import {
  AnimationMeta,
  getCategoryAnimation,
} from '@/utils/category-animations';
import { useVisibleItemAutoplay } from '@/hooks/useVisibleItemAutoplay';

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

const EVENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200';
const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';

function formatEventDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

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

type CategoryInspirationItem = {
  id: string;
  title: string;
  subtitle: string;
  meta: string;
  image: string;
  targetId: string;
  metaIcon: keyof typeof Ionicons.glyphMap;
};

function estimateCategoryCardHeight(index: number) {
  const imageHeights = [182, 238, 204, 258, 194, 228];
  return imageHeights[index % imageHeights.length] + 124;
}

function CategoryInspirationCard({
  item,
  imageHeight,
  accentColor,
  shouldPlay = false,
  onPress,
}: {
  item: CategoryInspirationItem;
  imageHeight: number;
  accentColor: string;
  shouldPlay?: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      className="mb-4 overflow-hidden rounded-[30px] border bg-white dark:bg-gray-900"
      activeOpacity={0.92}
      style={{
        borderColor: accentColor,
        borderWidth: 2,
      }}
    >
      <View className="relative">
        <MediaFrame
          source={item.image}
          className="w-full bg-gray-200 dark:bg-gray-800"
          style={{ height: imageHeight }}
          shouldPlay={shouldPlay}
        />

        <View className="absolute bottom-3 right-3 rounded-full bg-black/55 px-3 py-1.5">
          <View className="flex-row items-center">
            <Ionicons name={item.metaIcon} size={10} color="#ffffff" />
            <Text className="ml-1 text-[10px] font-semibold text-white">
              {item.meta}
            </Text>
          </View>
        </View>
      </View>

      <View className="p-4">
        <Text className="text-base font-bold text-gray-900 dark:text-white" numberOfLines={2}>
          {item.title}
        </Text>

        {item.subtitle ? (
          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400" numberOfLines={2}>
            {item.subtitle}
          </Text>
        ) : null}
      </View>
    </TouchableOpacity>
  );
}

function CategoryInspirationMasonry({
  items,
  accentColor,
  activeItemId,
  registerLayout,
  onPressItem,
}: {
  items: CategoryInspirationItem[];
  accentColor: string;
  activeItemId: string | null;
  registerLayout: (id: string, layout: { y: number; height: number }) => void;
  onPressItem: (item: CategoryInspirationItem) => void;
}) {
  const columns = useMemo(() => {
    const nextColumns: Array<Array<{ item: CategoryInspirationItem; imageHeight: number }>> = [
      [],
      [],
    ];
    const columnHeights = [0, 0];

    items.forEach((item, index) => {
      const imageHeight = [182, 238, 204, 258, 194, 228][index % 6];
      const targetColumn = columnHeights[0] <= columnHeights[1] ? 0 : 1;
      nextColumns[targetColumn].push({ item, imageHeight });
      columnHeights[targetColumn] += estimateCategoryCardHeight(index);
    });

    return nextColumns;
  }, [items]);

  return (
    <View className="flex-row items-start gap-3">
      {columns.map((column, columnIndex) => (
        <View key={`category-column-${columnIndex}`} className="min-w-0 flex-1">
          {column.map(({ item, imageHeight }) => (
            <View
              key={item.id}
              onLayout={(event) => {
                registerLayout(item.id, event.nativeEvent.layout);
              }}
            >
              <CategoryInspirationCard
                item={item}
                imageHeight={imageHeight}
                accentColor={accentColor}
                shouldPlay={activeItemId === item.id}
                onPress={() => onPressItem(item)}
              />
            </View>
          ))}
        </View>
      ))}
    </View>
  );
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

  const eventItems = useMemo<CategoryInspirationItem[]>(
    () =>
      (data?.events || []).map((item) => ({
        id: `event-${item.id}`,
        title: item.title,
        subtitle: item.Place?.name || item.Place?.City?.name || item.address || '',
        meta: formatEventDate(item.startTime, locale),
        image: getImageUrl(item.coverUrl) || EVENT_PLACEHOLDER,
        targetId: item.id,
        metaIcon: 'time-outline',
      })),
    [data?.events, locale],
  );

  const placeItems = useMemo<CategoryInspirationItem[]>(
    () =>
      (data?.places || []).map((item) => ({
        id: `place-${item.id}`,
        title: item.name,
        subtitle: item.City?.name || item.address || '',
        meta:
          typeof item.avgRating === 'number' && item.avgRating > 0
            ? item.avgRating.toFixed(1)
            : t('discoverPlaceMetaDiscover'),
        image: getImageUrl(item.coverUrl) || PLACE_PLACEHOLDER,
        targetId: item.id,
        metaIcon:
          typeof item.avgRating === 'number' && item.avgRating > 0
            ? 'star'
            : 'sparkles',
      })),
    [data?.places, t],
  );

  const activeItems = activeTab === 'events' ? eventItems : placeItems;
  const categoryAutoplay = useVisibleItemAutoplay(activeItems, (item) => item.id);

  return (
    <ScrollView
      className="flex-1 bg-gray-50 dark:bg-black"
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
            <TouchableOpacity
              onPress={() => router.back()}
              className="mb-6 h-11 w-11 items-center justify-center rounded-full bg-white/90 dark:bg-gray-900/80"
            >
              <Ionicons name="arrow-back" size={22} color={isDark ? '#fff' : '#111827'} />
            </TouchableOpacity>

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
                  count: data.events.length,
                  activeColor: '#ff4757',
                },
                {
                  key: 'places' as const,
                  label: t('categoryPlacesTitle'),
                  count: data.places.length,
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

            {data.category.Tag.length > 0 ? (
              <FlatList
                data={data.category.Tag}
                keyExtractor={(item) => item.id.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingTop: 20 }}
                renderItem={({ item }) => (
                  <View className="mr-2 rounded-full bg-white px-3 py-2 dark:bg-gray-900">
                    <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
                      {item.name}
                    </Text>
                  </View>
                )}
              />
            ) : null}
          </View>

          <View className="px-5 pb-24 pt-6">
            {activeTab === 'events' ? (
              eventItems.length > 0 ? (
                <CategoryInspirationMasonry
                  items={eventItems}
                  accentColor={data.category.color}
                  activeItemId={categoryAutoplay.activeId}
                  registerLayout={categoryAutoplay.registerLayout}
                  onPressItem={(item) =>
                    router.push({
                      pathname: '/event/[id]',
                      params: { id: item.targetId },
                    })
                  }
                />
              ) : (
                <EmptyBlock
                  title={t('categoryEmptyEventsTitle')}
                  message={t('categoryEmptyEventsDescription')}
                />
              )
            ) : placeItems.length > 0 ? (
              <CategoryInspirationMasonry
                items={placeItems}
                accentColor={data.category.color}
                activeItemId={categoryAutoplay.activeId}
                registerLayout={categoryAutoplay.registerLayout}
                onPressItem={(item) =>
                  router.push({
                    pathname: '/place/[id]',
                    params: { id: item.targetId },
                  })
                }
              />
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
  );
}
