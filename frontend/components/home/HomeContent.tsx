import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import Header from '@/components/ui/Header';
import HeroBackground from '@/components/ui/HeroBackground';
import { useI18n } from '@/hooks/use-i18n';
import { useVisibleItemAutoplay } from '@/hooks/useVisibleItemAutoplay';

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
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        onLayout={recommendedAutoplay.onLayout}
        onScroll={recommendedAutoplay.onScroll}
        scrollEventThrottle={16}
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
        <Header
          notificationCount={notificationCount}
          location={locationLabel}
          locationLabel={t('homeLocationLabel')}
          onLocationPress={() => router.push('/location')}
          onNotificationPress={() => router.push('/notifications')}
        />

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
          title={t('homeRecommended')}
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
