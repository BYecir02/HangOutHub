import React from 'react';

import EventInspirationCard from '@/features/events/components/EventInspirationCard';
import MasonryGrid from '@/shared/ui/MasonryGrid';
import PlaceInspirationCard from '@/features/places/components/PlaceInspirationCard';
import { formatEventCardPriceLabel, formatEventDate } from '@/services/shared/formatters';
import type { DiscoverItem } from '@/features/discover/components/discover.types';

function estimateDiscoverCardHeight(index: number) {
  const imageHeights = [182, 240, 208, 262, 194, 228];
  return imageHeights[index % imageHeights.length] + 124;
}

type DiscoverInspirationMasonryProps = {
  items: DiscoverItem[];
  activeItemId: string | null;
  registerLayout: (id: string, layout: { y: number; height: number }) => void;
  onPressItem: (item: DiscoverItem) => void;
  savedPlaceIds: Set<string>;
  savingPlaceIds: Set<string>;
  onTogglePlaceSave: (placeId: string) => void;
  locale: string;
  freeLabel: string;
  soldOutLabel: string;
};

export default function DiscoverInspirationMasonry({
  items,
  activeItemId,
  registerLayout,
  onPressItem,
  savedPlaceIds,
  savingPlaceIds,
  onTogglePlaceSave,
  locale,
  freeLabel,
  soldOutLabel,
}: DiscoverInspirationMasonryProps) {
  return (
    <MasonryGrid
      items={items}
      getKey={(item) => item.id}
      estimateItemHeight={(_, index) => estimateDiscoverCardHeight(index)}
      onItemLayout={(item, layout) => {
        registerLayout(item.id, layout);
      }}
      renderItem={(item, index) => {
        const imageHeights = [182, 240, 208, 262, 194, 228];

        if (item.type === 'event') {
          return (
            <EventInspirationCard
              event={item.event}
              imageHeight={imageHeights[index % imageHeights.length]}
              cityLabel={item.event.City?.name || item.event.Place?.City?.name || ''}
              placeLabel={item.event.Place?.name || item.event.address || ''}
              dateLabel={formatEventDate(item.event.startTime, locale, {
                includeWeekday: true,
              })}
              priceLabel={formatEventCardPriceLabel(item.event, locale, {
                freeLabel,
                soldOutLabel,
              })}
              borderColor={item.actionColor}
              onPress={() => onPressItem(item)}
              shouldPlay={activeItemId === item.id}
              adaptiveHeight={false}
            />
          );
        }

        if (item.type === 'place') {
          return (
            <PlaceInspirationCard
              place={item.place}
              imageHeight={imageHeights[index % imageHeights.length]}
              fallbackNewLabel={item.meta}
              borderColor={item.actionColor}
              onPress={() => onPressItem(item)}
              isSaved={savedPlaceIds.has(item.place.id)}
              onToggleSave={() => void onTogglePlaceSave(item.place.id)}
              saving={savingPlaceIds.has(item.place.id)}
              shouldPlay={activeItemId === item.id}
              adaptiveHeight={false}
            />
          );
        }

        return null;
      }}
    />
  );
}
