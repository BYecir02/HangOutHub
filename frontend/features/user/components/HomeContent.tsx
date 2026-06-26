import React from 'react';
import { ScrollView, View } from 'react-native';
import { useRouter, type Href } from 'expo-router';

import Header from '@/shared/ui/Header';
import HeroBackground from '@/shared/ui/HeroBackground';
import LogoSpinner from '@/shared/ui/LogoSpinner';
import { useI18n } from '@/shared/hooks/use-i18n';
import { useVisibleItemAutoplay } from '@/shared/hooks/useVisibleItemAutoplay';

import HomeCategoriesSection from './HomeCategoriesSection';
import HomeFeaturedSection from './HomeFeaturedSection';
import HomeRecommendedSection from './HomeRecommendedSection';
import type {
  HomeFeaturedItem,
  HomeRecommendationItem,
} from './home.types';
import type { Category } from '@/shared/types';

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
          onSearchPress={() => router.push('/search')}
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
        // Pull-to-refresh "maison" : pas de RefreshControl natif (donc pas de
        // rond systeme). Sur iOS le ScrollView rebondit, donc on detecte le
        // tirage vers le bas au relachement et on declenche le refresh.
        // Le retour visuel est notre logo anime (overlay plus bas).
        alwaysBounceVertical
        onScrollEndDrag={(event) => {
          if (!refreshing && event.nativeEvent.contentOffset.y <= -80) {
            void onRefresh();
          }
        }}
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

      {/* Spinner brande : le logo de l'app qui tourne, affiche subtilement
          en haut pendant le rafraichissement (remplace le spinner natif). */}
      {refreshing ? (
        <View
          pointerEvents="none"
          className="absolute inset-x-0 z-10 items-center"
          style={{ top: 104 }}
        >
          <View className="rounded-full bg-white/85 p-2.5 dark:bg-gray-900/85">
            <LogoSpinner size={26} />
          </View>
        </View>
      ) : null}
    </View>
  );
}
