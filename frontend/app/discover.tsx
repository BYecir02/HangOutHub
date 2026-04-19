import React from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import DiscoverEmptyState from '@/components/discover/DiscoverEmptyState';
import DiscoverFiltersModal from '@/components/discover/DiscoverFiltersModal';
import DiscoverInspirationMasonry from '@/components/discover/DiscoverInspirationMasonry';
import CatalogScreenLayout from '@/components/ui/CatalogScreenLayout';
import { EntityRowCard } from '@/components/ui/EntityCard';
import LocationScopeBar from '@/components/ui/LocationScopeBar';
import ScreenState from '@/components/ui/ScreenState';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { useDiscoverScreen } from '@/hooks/useDiscoverScreen';
import { uiTokens } from '@/theme/tokens';

export default function DiscoverScreen() {
  const {
    locale,
    t,
    loading,
    refreshing,
    errorMessage,
    query,
    setQuery,
    activeFilter,
    setActiveFilter,
    viewMode,
    setViewMode,
    filtersVisible,
    handleOpenFilters,
    handleCloseFilters,
    savedPlaceIds,
    savingPlaceIds,
    discoverItems,
    filteredItems,
    discoverAutoplay,
    locationValueLabel,
    filterOptions,
    viewOptions,
    handleRefresh,
    handleTogglePlaceSave,
    handlePressItem,
    handleBack,
    handleOpenLocation,
    handleResetFilters,
  } = useDiscoverScreen();

  return (
    <CatalogScreenLayout
      label={t('discoverLabel')}
      title={t('discoverTitle')}
      subtitle={t('discoverSubtitle')}
      onBack={handleBack}
      locationScopeBar={
        <LocationScopeBar
          locationLabel={locationValueLabel}
          actionLabel={t('homeLocationChangeCta')}
          onPressAction={handleOpenLocation}
          rightSlot={
            <TouchableOpacity
              onPress={handleOpenFilters}
              className="flex-row items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 dark:border-gray-700 dark:bg-gray-800"
            >
              <Ionicons name="options-outline" size={14} color="#f39c12" />
              <Text className="ml-1.5 text-xs font-semibold text-gray-700 dark:text-gray-200">
                {t('discoverFiltersQuickAction')}
              </Text>
            </TouchableOpacity>
          }
        />
      }
    >
      <DiscoverFiltersModal
        visible={filtersVisible}
        onClose={handleCloseFilters}
        query={query}
        onChangeQuery={setQuery}
        activeFilter={activeFilter}
        onChangeFilter={setActiveFilter}
        viewMode={viewMode}
        onChangeViewMode={setViewMode}
        filterOptions={filterOptions}
        viewOptions={viewOptions}
        searchPlaceholder={t('discoverSearchPlaceholder')}
        resetLabel={t('discoverFiltersReset')}
        closeLabel={t('discoverFiltersClose')}
        title={t('discoverFiltersTitle')}
        description={t('discoverFiltersDescription')}
        searchSectionLabel={t('discoverFiltersSearchSection')}
        filterSectionLabel={t('discoverFiltersCategorySection')}
        viewSectionLabel={t('discoverFiltersViewSection')}
      />

      {!loading && errorMessage && discoverItems.length === 0 ? (
        <ScreenState
          mode="error"
          title={t('commonErrorTitle')}
          description={errorMessage}
          actionLabel={t('commonRetry')}
          onAction={handleRefresh}
          containerClassName="px-5 py-10"
        />
      ) : loading && discoverItems.length === 0 ? (
        <FlatList
          data={[0, 1, 2]}
          keyExtractor={(item) => `skeleton-${item}`}
          contentContainerStyle={{
            paddingHorizontal: uiTokens.spacing.screenX,
            paddingBottom: 120,
          }}
          ItemSeparatorComponent={() => <View style={{ height: 14 }} />}
          ListHeaderComponent={
            <Text className="pb-4 text-sm text-gray-500 dark:text-gray-400">
              {t('discoverLoading')}
            </Text>
          }
          renderItem={() => (
            <View className="flex-row overflow-hidden rounded-[28px] border border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900">
              <SkeletonBlock className="h-28 w-28 rounded-2xl" />
              <View className="ml-4 flex-1 justify-between py-1">
                <View>
                  <SkeletonBlock className="h-6 w-24 rounded-full" />
                  <SkeletonBlock className="mt-3 h-5 w-3/4 rounded-lg" />
                  <SkeletonBlock className="mt-2 h-4 w-2/3 rounded-lg" />
                </View>
                <View className="mt-3 flex-row items-center justify-between">
                  <SkeletonBlock className="h-4 w-20 rounded-lg" />
                  <SkeletonBlock className="h-6 w-6 rounded-full" />
                </View>
              </View>
            </View>
          )}
        />
      ) : viewMode === 'inspiration' ? (
        <ScrollView
          onLayout={discoverAutoplay.onLayout}
          onScroll={discoverAutoplay.onScroll}
          scrollEventThrottle={16}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#f39c12"
            />
          }
          contentContainerStyle={{
            paddingHorizontal: uiTokens.spacing.screenX,
            paddingBottom: 120,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="pb-4 text-sm text-gray-500 dark:text-gray-400">
            {t('discoverSuggestionsCount', { count: filteredItems.length })}
          </Text>

          {filteredItems.length === 0 ? (
            <DiscoverEmptyState
              title={t('discoverNoResultsTitle')}
              description={t('discoverNoResultsDescription')}
              resetLabel={t('discoverResetFilters')}
              onReset={handleResetFilters}
            />
          ) : (
            <DiscoverInspirationMasonry
              items={filteredItems}
              activeItemId={discoverAutoplay.activeId}
              registerLayout={discoverAutoplay.registerLayout}
              onPressItem={handlePressItem}
              savedPlaceIds={savedPlaceIds}
              savingPlaceIds={savingPlaceIds}
              onTogglePlaceSave={handleTogglePlaceSave}
              locale={locale}
              freeLabel={t('homePriceFree')}
              soldOutLabel={t('discoverSoldOut')}
            />
          )}
        </ScrollView>
      ) : (
        <FlatList
          data={filteredItems}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{
            paddingHorizontal: uiTokens.spacing.screenX,
            paddingBottom: 120,
          }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor="#f39c12"
            />
          }
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Text className="pb-4 text-sm text-gray-500 dark:text-gray-400">
              {t('discoverSuggestionsCount', { count: filteredItems.length })}
            </Text>
          }
          ListEmptyComponent={
            <DiscoverEmptyState
              title={t('discoverNoResultsTitle')}
              description={t('discoverNoResultsDescription')}
              resetLabel={t('discoverResetFilters')}
              onReset={handleResetFilters}
            />
          }
          renderItem={({ item }) => (
            <EntityRowCard
              title={item.title}
              subtitle={item.subtitle}
              meta={item.meta}
              image={item.image}
              badge={item.badge}
              actionColor={item.actionColor}
              onPress={() => handlePressItem(item)}
            />
          )}
        />
      )}
    </CatalogScreenLayout>
  );
}
