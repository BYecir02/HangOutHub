import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import EventInspirationCard from '@/features/events/components/EventInspirationCard';

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
        <ActivityIndicator size="large" color="#4c669f" className="mt-4" />
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
              const pageWidth = featuredCardStep;

              if (!pageWidth) {
                return;
              }

              const nextIndex = Math.round(nativeEvent.contentOffset.x / pageWidth);
              setFeaturedIndex(
                Math.max(0, Math.min(nextIndex, items.length - 1)),
              );
            }}
            renderItem={({ item, index }) => (
              <View style={{ width: featuredCardWidth, marginRight: 12 }}>
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
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />

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
        </View>
      ) : (
        <HomeSectionPlaceholder message={emptyMessage} />
      )}
    </View>
  );
}
