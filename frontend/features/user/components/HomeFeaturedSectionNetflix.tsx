import React, { useState } from 'react';
import {
  FlatList,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

import MediaFrame from '@/shared/ui/MediaFrame';
import { getImageUrl } from '@/services/api';
import PriceDisplay from '@/shared/ui/primitives/PriceDisplay';
import HomeSectionPlaceholder from './HomeSectionPlaceholder';
import type { HomeFeaturedItem } from './home.types';

const EVENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200';

interface HomeFeaturedSectionNetflixProps {
  title: string;
  seeAllLabel: string;
  emptyMessage: string;
  items: HomeFeaturedItem[];
  loading: boolean;
  onSeeAll: () => void;
  onPressEvent: (eventId: string) => void;
}

export default function HomeFeaturedSectionNetflix({
  title,
  seeAllLabel,
  emptyMessage,
  items,
  loading,
  onSeeAll,
  onPressEvent,
}: HomeFeaturedSectionNetflixProps) {
  const { width } = useWindowDimensions();
  const { top: safeTop } = useSafeAreaInsets();
  const [activeIndex, setActiveIndex] = useState(0);

  const IMAGE_HEIGHT = 420 + safeTop;
  // Header sits at top: safe-area inset + ~56px header bar
  const HEADER_BOTTOM = safeTop + 56;

  return (
    <View>
      {loading ? (
        <View style={{ height: IMAGE_HEIGHT }} className="items-center justify-center">
          <View className="h-full w-full bg-gray-200 dark:bg-gray-800 opacity-40" />
        </View>
      ) : items.length === 0 ? (
        <HomeSectionPlaceholder message={emptyMessage} />
      ) : (
        <View>
          <FlatList
            data={items}
            horizontal
            pagingEnabled
            decelerationRate="fast"
            snapToInterval={width}
            snapToAlignment="start"
            showsHorizontalScrollIndicator={false}
            nestedScrollEnabled
            keyExtractor={(item) => item.event.id}
            onMomentumScrollEnd={({ nativeEvent }) => {
              const index = Math.round(nativeEvent.contentOffset.x / width);
              setActiveIndex(Math.max(0, Math.min(index, items.length - 1)));
            }}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                activeOpacity={0.95}
                onPress={() => onPressEvent(item.event.id)}
                style={{ width }}
              >
                <View style={{ height: IMAGE_HEIGHT, width }}>
                  {/* Full-bleed image / video */}
                  <MediaFrame
                    source={getImageUrl(item.event.coverUrl) || EVENT_PLACEHOLDER}
                    style={{ width, height: IMAGE_HEIGHT }}
                    shouldPlay={index === activeIndex}
                    muted
                    loop
                    showControls={false}
                    adaptiveHeight={false}
                    minHeight={IMAGE_HEIGHT}
                    maxHeight={IMAGE_HEIGHT}
                  />

                  {/* Bottom gradient — pure black overlay for text legibility */}
                  <LinearGradient
                    colors={['transparent', 'rgba(0,0,0,0.55)', 'rgba(0,0,0,0.82)']}
                    locations={[0, 0.5, 1]}
                    style={{
                      position: 'absolute',
                      bottom: 0,
                      left: 0,
                      right: 0,
                      height: 200,
                      paddingHorizontal: 20,
                      paddingBottom: 16,
                      justifyContent: 'flex-end',
                    }}
                    pointerEvents="none"
                  >
                    {/* City + price row */}
                    <View className="mb-1.5 flex-row items-center justify-between">
                      {item.cityLabel ? (
                        <Text
                          className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/70"
                          numberOfLines={1}
                        >
                          {item.cityLabel}
                        </Text>
                      ) : <View />}
                      <PriceDisplay label={item.priceLabel} size="sm" tone="brand" variant="solid" />
                    </View>

                    {/* Title */}
                    <Text
                      className="text-xl font-bold text-white"
                      numberOfLines={2}
                    >
                      {item.event.title}
                    </Text>

                    {/* Place + date row */}
                    <View className="mt-1.5 flex-row items-center gap-3">
                      {item.placeLabel ? (
                        <View className="flex-1 flex-row items-center">
                          <Ionicons name="location-outline" size={12} color="rgba(255,255,255,0.6)" />
                          <Text
                            className="ml-1 flex-1 text-xs text-white/60"
                            numberOfLines={1}
                          >
                            {item.placeLabel}
                          </Text>
                        </View>
                      ) : null}
                      {item.dateLabel ? (
                        <View className="flex-row items-center">
                          <Ionicons name="time-outline" size={12} color="rgba(255,255,255,0.6)" />
                          <Text className="ml-1 text-xs text-white/60">
                            {item.dateLabel}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </LinearGradient>

                  {/* Top fade — pure black for header/status-bar readability */}
                  <LinearGradient
                    colors={['rgba(0,0,0,0.45)', 'transparent']}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: HEADER_BOTTOM + 32,
                    }}
                    pointerEvents="none"
                  />

                  {/* "À la une / Voir tout" row — just below the header */}
                  <View
                    style={{
                      position: 'absolute',
                      top: HEADER_BOTTOM + 8,
                      left: 20,
                      right: 20,
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                    pointerEvents="box-none"
                  >
                    <Text className="text-sm font-bold text-white/80">
                      {title}
                    </Text>
                    <TouchableOpacity onPress={onSeeAll} hitSlop={8}>
                      <Text className="text-xs font-medium text-[#ff4757]">
                        {seeAllLabel}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
            )}
          />

          {/* Pagination dots */}
          {items.length > 1 && (
            <View className="mt-2 flex-row justify-center gap-2">
              {items.map((item, index) => {
                const isActive = index === activeIndex;
                return (
                  <View
                    key={item.event.id}
                    className={`rounded-full ${
                      isActive
                        ? 'h-2 w-6 bg-[#ff4757]'
                        : 'h-2 w-2 bg-gray-300 dark:bg-gray-700'
                    }`}
                  />
                );
              })}
            </View>
          )}
        </View>
      )}
    </View>
  );
}
