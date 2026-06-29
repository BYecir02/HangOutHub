import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, View, Platform } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import CatalogScreenLayout from '@/shared/ui/CatalogScreenLayout';
import CategoryCard from '@/shared/ui/CategoryCard';
import ScreenState from '@/shared/ui/ScreenState';
import { useI18n } from '@/shared/hooks/use-i18n';
import api, { getApiErrorMessage } from '@/services/api';
import { getCache, setCache } from '@/services/api/dataCache';
import { SkeletonBlock } from '@/shared/ui/Skeleton';
import LogoSpinner from '@/shared/ui/LogoSpinner';
import { Category } from '@/shared/types';

export default function CategoriesScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const cachedCategories = getCache<Category[]>('categories');
  const [categories, setCategories] = useState<Category[]>(cachedCategories ?? []);
  const [loading, setLoading] = useState(!cachedCategories);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchCategories = useCallback(
    async (forceRefresh = false) => {
      const isRefresh = forceRefresh || getCache('categories') !== null;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const response = await api.get<Category[]>('/categories');
        setCategories(response.data);
        setCache('categories', response.data);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(getApiErrorMessage(error, t('commonErrorTitle')));
        if (!getCache('categories')) {
          setCategories([]);
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [t],
  );

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  useFocusEffect(
    useCallback(() => {
      void fetchCategories(true);
    }, [fetchCategories]),
  );

  return (
    <CatalogScreenLayout
      label="Voir toutes les catégories"
      title={t('homeCategories')}
      onBack={() => router.back()}
      withHeroBackground
    >
      {!loading && errorMessage && categories.length === 0 ? (
        <ScreenState
          mode="error"
          title={t('commonErrorTitle')}
          description={errorMessage}
          actionLabel={t('commonRetry')}
          onAction={() => {
            void fetchCategories(true);
          }}
          containerClassName="px-5 py-10"
        />
      ) : loading && categories.length === 0 ? (
        <ScrollView
          alwaysBounceVertical
          contentInset={{ top: Platform.OS === 'ios' && refreshing ? 60 : 0 }}
          refreshControl={
            Platform.OS === 'android' ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void fetchCategories(true);
                }}
                progressViewOffset={-500}
              />
            ) : undefined
          }
          onScrollEndDrag={(event) => {
            if (Platform.OS !== 'android' && !refreshing && event.nativeEvent.contentOffset.y <= -80) {
              void fetchCategories(true);
            }
          }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {Platform.OS === 'ios' ? (
            <View className="absolute inset-x-0 items-center" style={{ top: -60 }}>
              <View className="rounded-full bg-white/85 p-2.5 shadow-sm dark:bg-gray-900/85">
                <LogoSpinner size={26} />
              </View>
            </View>
          ) : null}
          <View className="flex-row flex-wrap pt-2">
            {Array.from({ length: 10 }).map((_, index) => (
              <View key={`category-skeleton-${index}`} className="mb-3 mr-3">
                <SkeletonBlock className="h-10 w-28 rounded-full" />
              </View>
            ))}
          </View>
        </ScrollView>
      ) : categories.length > 0 ? (
        <ScrollView
          alwaysBounceVertical
          contentInset={{ top: Platform.OS === 'ios' && refreshing ? 60 : 0 }}
          refreshControl={
            Platform.OS === 'android' ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  void fetchCategories(true);
                }}
                progressViewOffset={-500}
              />
            ) : undefined
          }
          onScrollEndDrag={(event) => {
            if (Platform.OS !== 'android' && !refreshing && event.nativeEvent.contentOffset.y <= -80) {
              void fetchCategories(true);
            }
          }}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
          {Platform.OS === 'ios' ? (
            <View className="absolute inset-x-0 items-center" style={{ top: -60 }}>
              <View className="rounded-full bg-white/85 p-2.5 shadow-sm dark:bg-gray-900/85">
                <LogoSpinner size={26} />
              </View>
            </View>
          ) : null}
          <View className="flex-row flex-wrap pt-2">
            {categories.map((category) => (
              <View key={category.id} className="mb-3 mr-3">
                <CategoryCard
                  category={category}
                  onPress={() =>
                    router.push({
                      pathname: '/category/[id]',
                      params: { id: String(category.id) },
                    })
                  }
                />
              </View>
            ))}
          </View>
        </ScrollView>
      ) : (
        <ScreenState
          mode="empty"
          variant="plain"
          title={t('homeNoCategories')}
          description={t('homeNoCategories')}
          containerClassName="px-5 py-12"
        />
      )}

      {refreshing && Platform.OS === 'android' ? (
        <View pointerEvents="none" className="absolute inset-x-0 z-10 items-center" style={{ top: 90 }}>
          <View className="rounded-full bg-white/85 p-2.5 shadow-sm dark:bg-gray-900/85">
            <LogoSpinner size={26} />
          </View>
        </View>
      ) : null}
    </CatalogScreenLayout>
  );
}
