import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import Header from '@/shared/ui/Header';
import HeroBackground from '@/shared/ui/HeroBackground';
import { useI18n } from '@/shared/hooks/use-i18n';
import { useVisibleItemAutoplay } from '@/shared/hooks/useVisibleItemAutoplay';

import HomeCategoriesSection from './HomeCategoriesSection';
import HomeFeaturedSection from './HomeFeaturedSection';
import HomeRecommendedSection from './HomeRecommendedSection';
import type {
  HomeFeaturedItem,
  HomeRecommendationItem,
} from './home.types';
import type { Category } from '@/types';

interface HomeContentProps {
  notificationCount: number;
  locationLabel: string;
  loading: boolean;
  refreshing: boolean;
  categories: Category[];
  featuredInspiration: HomeFeaturedItem[];
  recommendedInspiration: HomeRecommendationItem[];
  savedPlaceIds: Set<string>;
  savingPlaceIds: Set<string>;
  hasPersonalization: boolean;
  onRefresh: () => void;
  onPressCategory: (categoryId: number) => void;
  onTogglePlaceSave: (placeId: string) => void;
}

export default function HomeContent({
  notificationCount,
  locationLabel,
  loading,
  refreshing,
  categories,
  featuredInspiration,
  recommendedInspiration,
  savedPlaceIds,
  savingPlaceIds,
  hasPersonalization,
  onRefresh,
  onPressCategory,
  onTogglePlaceSave,
}: HomeContentProps) {
  const router = useRouter();
  const { t } = useI18n();
  const eventsRoute = '/events' as Href;
  const discoverRoute = '/discover' as Href;
  const categoriesRoute = '/categories' as Href;
  const recommendedAutoplay = useVisibleItemAutoplay(
    recommendedInspiration,
    (item) => item.id,
  );

  return (
    <View className="flex-1 bg-transparent">
      <HeroBackground variant="home" />

      <View className="absolute inset-x-0 top-0 z-20">
        <Header
          notificationCount={notificationCount}
          location={locationLabel}
          locationLabel={t('homeLocationLabel')}
          onLocationPress={() => router.push('/location')}
          onNotificationPress={() => router.push('/notifications')}
          transparent
        />
      </View>

      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        onLayout={recommendedAutoplay.onLayout}
        onScroll={recommendedAutoplay.onScroll}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingTop: 96, paddingBottom: 24 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              void onRefresh();
            }}
            tintColor="#4c669f"
          />
        }
      >
        <HomeFeaturedSection
          title={t('homeFeatured')}
          seeAllLabel={t('homeSeeAll')}
          emptyMessage={t('homeNoEvents')}
          items={featuredInspiration}
          loading={loading}
          onSeeAll={() => router.push(eventsRoute)}
          onPressEvent={(eventId) =>
            router.push({
              pathname: '/event/[id]',
              params: { id: eventId },
            })
          }
        />

        <HomeCategoriesSection
          title={t('homeCategories')}
          seeAllLabel={t('homeSeeAll')}
          emptyMessage={t('homeNoCategories')}
          categories={categories}
          loading={loading}
          onSeeAll={() => router.push(categoriesRoute)}
          onPressCategory={onPressCategory}
        />

        <HomeRecommendedSection
          title={hasPersonalization ? t('homeRecommended') : t('homeTopPicks')}
          seeAllLabel={t('homeSeeAll')}
          emptyMessage={t('homeNoSuggestions')}
          items={recommendedInspiration}
          loading={loading}
          activeId={recommendedAutoplay.activeId}
          savedPlaceIds={savedPlaceIds}
          savingPlaceIds={savingPlaceIds}
          onSeeAll={() => router.push(discoverRoute)}
          onPressEvent={(eventId) =>
            router.push({
              pathname: '/event/[id]',
              params: { id: eventId },
            })
          }
          onPressPlace={(placeId) =>
            router.push({
              pathname: '/place/[id]',
              params: { id: placeId },
            })
          }
          onTogglePlaceSave={onTogglePlaceSave}
          registerLayout={recommendedAutoplay.registerLayout}
        />
      </ScrollView>
    </View>
  );
}
