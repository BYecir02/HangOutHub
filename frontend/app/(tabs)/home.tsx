import React from 'react';

import HomeContent from '@/features/user/components/HomeContent';
import { useHomeScreen } from '@/features/user/hooks/useHomeScreen';

export default function HomeScreen() {
  const {
    categories,
    featuredInspiration,
    handleCategoryPress,
    handleTogglePlaceSave,
    loading,
    locationLabel,
    notificationCount,
    onRefresh,
    refreshing,
    recommendedInspiration,
    savedPlaceIds,
    savingPlaceIds,
  } = useHomeScreen();

  return (
    <HomeContent
      notificationCount={notificationCount}
      locationLabel={locationLabel}
      loading={loading}
      refreshing={refreshing}
      categories={categories}
      featuredInspiration={featuredInspiration}
      recommendedInspiration={recommendedInspiration}
      savedPlaceIds={savedPlaceIds}
      savingPlaceIds={savingPlaceIds}
      onRefresh={onRefresh}
      onPressCategory={handleCategoryPress}
      onTogglePlaceSave={handleTogglePlaceSave}
    />
  );
}
