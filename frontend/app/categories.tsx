import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';

import CatalogScreenLayout from '@/components/ui/CatalogScreenLayout';
import CategoryCard from '@/components/ui/CategoryCard';
import ScreenState from '@/components/ui/ScreenState';
import { useI18n } from '@/hooks/use-i18n';
import api, { getApiErrorMessage } from '@/services/api';
import { getCache, setCache } from '@/services/dataCache';
import { SkeletonBlock } from '@/components/ui/Skeleton';
import { Category } from '@/types';

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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void fetchCategories(true);
              }}
              tintColor="#4c669f"
            />
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
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
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void fetchCategories(true);
              }}
              tintColor="#4c669f"
            />
          }
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
          showsVerticalScrollIndicator={false}
        >
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
    </CatalogScreenLayout>
  );
}
