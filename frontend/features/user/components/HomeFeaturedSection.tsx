import React, { useEffect, useState } from 'react';
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import EventInspirationCard from '@/features/events/components/EventInspirationCard';
import { SkeletonBlock } from '@/shared/ui/Skeleton';

import HomeSectionPlaceholder from './HomeSectionPlaceholder';
import type { HomeFeaturedItem } from './home.types';

interface HomeFeaturedSectionProps {
  title: string;
  seeAllLabel: string;
  emptyMessage: string;
  items: HomeFeaturedItem[];
  loading: boolean;
  onSeeAll: () => void;
  onPressEvent: (eventId: string) => void;
}

export default function HomeFeaturedSection({
  title,
  seeAllLabel,
  emptyMessage,
  items,
  loading,
  onSeeAll,
  onPressEvent,
}: HomeFeaturedSectionProps) {
  const { width } = useWindowDimensions();
  const [featuredIndex, setFeaturedIndex] = useState(0);
  const featuredCardWidth = Math.round(width * 0.84);
  const featuredCardStep = featuredCardWidth + 12;

  useEffect(() => {
    if (items.length === 0) {
      setFeaturedIndex(0);
      return;
    }
    setFeaturedIndex((current) => Math.min(current, items.length - 1));
  }, [items.length]);

  const centerPadding = Math.round((width - featuredCardWidth) / 2);

  return (
    <View className="mt-2">
      <View className="mb-4 flex-row items-end justify-between px-5">
        <Text className="text-lg font-bold text-gray-800 dark:text-white">
          {title}
        </Text>
        <TouchableOpacity onPress={onSeeAll}>
          <Text className="text-xs font-medium text-[#4c669f]">{seeAllLabel}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: centerPadding }}>
          <SkeletonBlock style={{ height: 190, borderRadius: 14 }} />
          <SkeletonBlock style={{ height: 15, marginTop: 12, borderRadius: 6, width: '65%' }} />
          <SkeletonBlock style={{ height: 12, marginTop: 8, borderRadius: 6, width: '45%' }} />
          <SkeletonBlock style={{ height: 12, marginTop: 6, borderRadius: 6, width: '55%' }} />
        </View>
      ) : items.length > 0 ? (
        <View>
          <FlatList
            data={items}
            horizontal
            decelerationRate="fast"
            snapToInterval={featuredCardStep}
            snapToAlignment="start"
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.event.id}
            onMomentumScrollEnd={({ nativeEvent }) => {
              if (!featuredCardStep) return;
              const nextIndex = Math.round(nativeEvent.contentOffset.x / featuredCardStep);
              setFeaturedIndex(Math.max(0, Math.min(nextIndex, items.length - 1)));
            }}
            renderItem={({ item, index }) => (
              <View style={{
                width: featuredCardWidth,
                marginRight: items.length === 1 ? 0 : 12,
              }}>
                <EventInspirationCard
                  event={item.event}
                  imageHeight={190}
                  adaptiveHeight
                  cityLabel={item.cityLabel}
                  placeLabel={item.placeLabel}
                  dateLabel={item.dateLabel}
                  priceLabel={item.priceLabel}
                  shouldPlay={index === featuredIndex}
                  onPress={() => onPressEvent(item.event.id)}
                  style={{ width: featuredCardWidth }}
                />
              </View>
            )}
            contentContainerStyle={{
              paddingHorizontal: items.length === 1 ? centerPadding : 20,
            }}
          />

          {items.length > 1 && (
            <View className="mt-3 flex-row justify-center gap-2">
              {items.map((item, index) => {
                const isActive = index === featuredIndex;
                return (
                  <View
                    key={item.event.id}
                    className={`rounded-full ${
                      isActive
                        ? 'h-2.5 w-6 bg-[#4c669f]'
                        : 'h-2.5 w-2.5 bg-gray-300 dark:bg-gray-700'
                    }`}
                  />
                );
              })}
            </View>
          )}
        </View>
      ) : (
        <HomeSectionPlaceholder message={emptyMessage} />
      )}
    </View>
  );
}
