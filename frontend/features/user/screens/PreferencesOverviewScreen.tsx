import React, { useCallback, useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';

import ScreenHeader from '@/shared/ui/ScreenHeader';
import LogoSpinner from '@/shared/ui/LogoSpinner';
import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { useI18n } from '@/shared/hooks/use-i18n';
import api from '@/services/api';
import { getRecommendationOnboardingPreferences } from '@/services/shared/recommendation-onboarding';

type CityLite = { id: number; name: string; country: string | null };

type ProfileResponse = {
  id: string;
  residenceCityId?: number | null;
  UserCityInterest?: Array<{ cityId?: number | null } | null>;
};

type PreferencesResponse = {
  categories: Array<{ tags: Array<{ id: number; name: string }> }>;
  selectedTagIds: number[];
};

const BUDGET_LABEL_KEY = {
  low: 'preferencesBudgetLow',
  medium: 'preferencesBudgetMedium',
  high: 'preferencesBudgetHigh',
} as const;

type OverviewData = {
  residenceLabel: string;
  cityInterestLabel: string;
  interestsLabel: string;
  budgetLabel: string;
};

export default function PreferencesOverviewScreen() {
  const router = useRouter();
  const { t } = useI18n();
  const isDark = useColorScheme() === 'dark';

  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  const loadOverview = useCallback(async () => {
    setLoading(true);

    try {
      const [citiesRes, profileRes, prefsRes] = await Promise.allSettled([
        api.get<CityLite[]>('/cities'),
        api.get<ProfileResponse>('/users/me'),
        api.get<PreferencesResponse>('/users/me/preferences'),
      ]);

      const cities =
        citiesRes.status === 'fulfilled' ? citiesRes.value.data : [];
      const cityById = new Map(cities.map((city) => [city.id, city]));

      // Ville de residence
      let residenceLabel = t('preferencesOverviewEmpty');
      let userId: string | null = null;
      const cityInterestIds: number[] = [];

      if (profileRes.status === 'fulfilled') {
        userId = profileRes.value.data.id;
        const residence = profileRes.value.data.residenceCityId
          ? cityById.get(profileRes.value.data.residenceCityId)
          : null;
        if (residence) {
          residenceLabel = residence.country
            ? `${residence.name}, ${residence.country}`
            : residence.name;
        }
        (profileRes.value.data.UserCityInterest || []).forEach((item) => {
          if (typeof item?.cityId === 'number') {
            cityInterestIds.push(item.cityId);
          }
        });
      }

      // Villes d'interet
      const cityInterestNames = cityInterestIds
        .map((id) => cityById.get(id)?.name)
        .filter((name): name is string => Boolean(name));
      const cityInterestLabel =
        cityInterestNames.length > 0
          ? cityInterestNames.join(' • ')
          : t('preferencesOverviewEmpty');

      // Centres d'interet (tags)
      let interestsLabel = t('preferencesOverviewEmpty');
      if (prefsRes.status === 'fulfilled') {
        const tagNameById = new Map<number, string>();
        (prefsRes.value.data.categories || []).forEach((category) => {
          (category.tags || []).forEach((tag) => tagNameById.set(tag.id, tag.name));
        });
        const names = (prefsRes.value.data.selectedTagIds || [])
          .map((id) => tagNameById.get(id))
          .filter((name): name is string => Boolean(name));
        if (names.length > 0) {
          interestsLabel = names.join(' • ');
        }
      }

      // Budget + rayon (preferences locales)
      const local = await getRecommendationOnboardingPreferences(userId);
      const budgetText = t(BUDGET_LABEL_KEY[local.budget]);
      const radiusText =
        local.radiusKm === 'unlimited'
          ? t('preferencesRadiusUnlimited')
          : `${local.radiusKm} km`;
      const budgetLabel = `${budgetText} • ${radiusText}`;

      setData({
        residenceLabel,
        cityInterestLabel,
        interestsLabel,
        budgetLabel,
      });
    } catch (error) {
      console.error('Erreur chargement recap preferences:', error);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [t]);

  useFocusEffect(
    useCallback(() => {
      void loadOverview();
    }, [loadOverview]),
  );

  const goEdit = (step: number) => {
    router.push({
      pathname: '/preferences',
      params: { mode: 'edit', step: String(step) },
    });
  };

  const rows: Array<{
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    step: number;
  }> = [
    {
      icon: 'location-outline',
      label: t('preferencesOverviewResidence'),
      value: data?.residenceLabel ?? '',
      step: 2,
    },
    {
      icon: 'map-outline',
      label: t('preferencesOverviewCities'),
      value: data?.cityInterestLabel ?? '',
      step: 3,
    },
    {
      icon: 'sparkles-outline',
      label: t('preferencesOverviewInterests'),
      value: data?.interestsLabel ?? '',
      step: 4,
    },
    {
      icon: 'options-outline',
      label: t('preferencesOverviewBudget'),
      value: data?.budgetLabel ?? '',
      step: 5,
    },
  ];

  return (
    <ScrollView className="flex-1 bg-gray-50 pt-16 dark:bg-black">
      <View className="px-5 pb-10">
        <ScreenHeader
          title={t('preferencesOverviewTitle')}
          subtitle={t('preferencesOverviewSubtitle')}
          onBack={() => router.back()}
          containerClassName="mb-6"
        />

        {loading ? (
          <View className="items-center py-16">
            <LogoSpinner size={40} />
          </View>
        ) : (
          <View className="overflow-hidden rounded-3xl bg-white dark:bg-gray-900">
            {rows.map((row, index) => (
              <TouchableOpacity
                key={row.label}
                onPress={() => goEdit(row.step)}
                accessibilityRole="button"
                accessibilityLabel={`${row.label}: ${row.value || t('preferencesOverviewEmpty')}`}
                accessibilityHint={t('preferencesOverviewEdit')}
                className={`flex-row items-center px-4 py-4 ${
                  index < rows.length - 1
                    ? 'border-b border-gray-100 dark:border-gray-800'
                    : ''
                }`}
              >
                <View className="mr-3 h-9 w-9 items-center justify-center rounded-full bg-[#4c669f]/10">
                  <Ionicons
                    name={row.icon}
                    size={18}
                    color={isDark ? '#9bb0e0' : '#4c669f'}
                  />
                </View>
                <View className="min-w-0 flex-1">
                  <Text className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">
                    {row.label}
                  </Text>
                  <Text
                    className="mt-1 text-base text-gray-800 dark:text-white"
                    numberOfLines={1}
                  >
                    {row.value || t('preferencesOverviewEmpty')}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={isDark ? '#555' : '#ccc'}
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
