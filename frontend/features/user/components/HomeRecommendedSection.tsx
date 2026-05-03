import React from 'react';
import {
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import EventInspirationCard from '@/features/events/components/EventInspirationCard';
import MasonryGrid from '@/shared/ui/MasonryGrid';
import PlaceInspirationCard from '@/features/places/components/PlaceInspirationCard';
import { SkeletonBlock } from '@/shared/ui/Skeleton';

import HomeSectionPlaceholder from './HomeSectionPlaceholder';
import { estimateRecommendationCardHeight } from './home.utils';
import type { HomeRecommendationItem, HomeVisibleLayout } from './home.types';

interface HomeRecommendedSectionProps {
  title: string;
  seeAllLabel: string;
  emptyMessage: string;
  items: HomeRecommendationItem[];
  loading: boolean;
  activeId: string | null;
  savedPlaceIds: Set<string>;
  savingPlaceIds: Set<string>;
  onSeeAll: () => void;
  onPressEvent: (eventId: string) => void;
  onPressPlace: (placeId: string) => void;
  onTogglePlaceSave: (placeId: string) => void;
  registerLayout: (itemId: string, layout: HomeVisibleLayout) => void;
}

const SKELETON_HEIGHTS = [182, 240, 208, 262, 194, 228];

export default function HomeRecommendedSection({
  title,
  seeAllLabel,
  emptyMessage,
  items,
  loading,
  activeId,
  savedPlaceIds,
  savingPlaceIds,
  onSeeAll,
  onPressEvent,
  onPressPlace,
  onTogglePlaceSave,
  registerLayout,
}: HomeRecommendedSectionProps) {
  return (
    <View className="mt-3 px-5 pb-24">
      <View className="mb-4 flex-row items-end justify-between">
        <Text className="mt-2 text-lg font-bold text-gray-800 dark:text-white">
          {title}
        </Text>
        <TouchableOpacity onPress={onSeeAll}>
          <Text className="text-xs font-medium text-[#4c669f]">{seeAllLabel}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ flexDirection: 'row', gap: 12 }}>
          <View style={{ flex: 1, gap: 12 }}>
            {SKELETON_HEIGHTS.filter((_, i) => i % 2 === 0).map((h, i) => (
              <SkeletonBlock key={i} style={{ height: h, borderRadius: 14 }} />
            ))}
          </View>
          <View style={{ flex: 1, gap: 12 }}>
            {SKELETON_HEIGHTS.filter((_, i) => i % 2 === 1).map((h, i) => (
              <SkeletonBlock key={i} style={{ height: h, borderRadius: 14 }} />
            ))}
          </View>
        </View>
      ) : items.length > 0 ? (
        <MasonryGrid
          items={items}
          getKey={(item) => item.id}
          estimateItemHeight={(_, index) => estimateRecommendationCardHeight(index)}
          onItemLayout={(item, layout) => {
            registerLayout(item.id, layout);
          }}
          renderItem={(item, index) => {
            const imageHeights = [182, 240, 208, 262, 194, 228];

            if (item.type === 'event') {
              return (
                <EventInspirationCard
                  event={item.event}
                  cityLabel={item.cityLabel}
                  placeLabel={item.placeLabel}
                  dateLabel={item.dateLabel}
                  priceLabel={item.priceLabel}
                  borderColor={item.accentColor}
                  imageHeight={imageHeights[index % imageHeights.length]}
                  adaptiveHeight={false}
                  shouldPlay={activeId === item.id}
                  onPress={() => onPressEvent(item.event.id)}
                />
              );
            }

            return (
              <PlaceInspirationCard
                place={item.place}
                imageHeight={imageHeights[index % imageHeights.length]}
                fallbackNewLabel={item.fallbackNewLabel}
                borderColor={item.accentColor}
                adaptiveHeight={false}
                shouldPlay={activeId === item.id}
                isSaved={savedPlaceIds.has(item.place.id)}
                onToggleSave={() => onTogglePlaceSave(item.place.id)}
                saving={savingPlaceIds.has(item.place.id)}
                onPress={() => onPressPlace(item.place.id)}
              />
            );
          }}
        />
      ) : (
        <HomeSectionPlaceholder message={emptyMessage} />
      )}
    </View>
  );
}
