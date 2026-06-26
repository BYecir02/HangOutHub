import React, { useEffect, useRef, useState } from 'react';
import {
  Animated,
  Text,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

import FeaturedEditorialCard from './FeaturedEditorialCard';
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

// Test "couverture éditoriale" : cadre d'affiche à hauteur fixe (affiche entière
// sur un flou d'elle-même) + socle d'infos -> cartes de hauteur quasi uniforme.
const TRACK_HEIGHT = 470;

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
  const scrollX = useRef(new Animated.Value(0)).current;
  const featuredCardWidth = Math.round(width * 0.84);
  const featuredCardStep = featuredCardWidth + 12;
  const centerPadding = Math.round((width - featuredCardWidth) / 2);

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
          <Text className="text-xs font-medium text-[#ff4757]">{seeAllLabel}</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={{ paddingHorizontal: centerPadding }}>
          <SkeletonBlock style={{ height: 360, borderRadius: 26 }} />
          <SkeletonBlock style={{ height: 18, marginTop: 12, borderRadius: 6, width: '70%' }} />
          <SkeletonBlock style={{ height: 13, marginTop: 8, borderRadius: 6, width: '45%' }} />
        </View>
      ) : items.length > 0 ? (
        <View>
          <Animated.FlatList
            data={items}
            horizontal
            decelerationRate="fast"
            snapToInterval={featuredCardStep}
            snapToAlignment="start"
            nestedScrollEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item) => item.event.id}
            scrollEventThrottle={16}
            onScroll={Animated.event(
              [{ nativeEvent: { contentOffset: { x: scrollX } } }],
              { useNativeDriver: true },
            )}
            onMomentumScrollEnd={({ nativeEvent }) => {
              if (!featuredCardStep) return;
              const nextIndex = Math.round(nativeEvent.contentOffset.x / featuredCardStep);
              setFeaturedIndex(Math.max(0, Math.min(nextIndex, items.length - 1)));
            }}
            renderItem={({ item, index }) => {
              const inputRange = [
                (index - 1) * featuredCardStep,
                index * featuredCardStep,
                (index + 1) * featuredCardStep,
              ];
              // Carte active : pleine taille. Voisines : un peu réduites, restent visibles.
              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [0.92, 1, 0.92],
                extrapolate: 'clamp',
              });
              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.82, 1, 0.82],
                extrapolate: 'clamp',
              });

              return (
                <Animated.View
                  style={{
                    width: featuredCardWidth,
                    height: TRACK_HEIGHT,
                    marginRight: items.length === 1 ? 0 : 12,
                    justifyContent: 'center',
                    transform: [{ scale }],
                    opacity,
                  }}
                >
                  <FeaturedEditorialCard
                    item={item}
                    width={featuredCardWidth}
                    shouldPlay={index === featuredIndex}
                    onPress={() => onPressEvent(item.event.id)}
                  />
                </Animated.View>
              );
            }}
            contentContainerStyle={{
              paddingHorizontal: centerPadding,
              alignItems: 'center',
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
                        ? 'h-2.5 w-6 bg-[#ff4757]'
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
