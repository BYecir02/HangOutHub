import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import PlaceDetailEventsTab from '@/components/place/PlaceDetailEventsTab';
import PlaceDetailInfoTab from '@/components/place/PlaceDetailInfoTab';
import PlaceDetailReviewsTab from '@/components/place/PlaceDetailReviewsTab';
import PlaceSaveButton from '@/components/place/PlaceSaveButton';
import Tabs, { type TabItem } from '@/components/ui/Tabs';
import { useI18n } from '@/hooks/use-i18n';

type PlaceDetailTab = 'info' | 'events' | 'reviews';

type PlaceDetailContentPlace = {
  id: string;
  name: string;
  address?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  openingHours?: string | null;
  description?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  City?: {
    name?: string | null;
  } | null;
  Owner?: {
    id?: string;
    displayName?: string | null;
    username?: string | null;
  } | null;
  Event?: Array<{
    id: string;
    title: string;
    startTime: string;
    coverUrl: string | null;
  }> | null;
};

type PlaceDetailReview = {
  id: string;
  rating: number;
  comment?: string | null;
  createdAt?: string | null;
  User?: {
    id?: string;
    username?: string | null;
    displayName?: string | null;
  } | null;
};

type PlaceDetailContentProps = {
  place: PlaceDetailContentPlace;
  activeTab: PlaceDetailTab;
  onTabChange: (next: PlaceDetailTab) => void;
  isSaved: boolean;
  saveLoading: boolean;
  onToggleSave: () => void;
  onOpenCreateModal: () => void;
  onReportPlace: () => void;
  onContactPlace: () => void;
  onOpenGallery: (index: number) => void;
  onOpenReviewModal: () => void;
  reviews: PlaceDetailReview[];
  reviewsLoading: boolean;
  myReview?: PlaceDetailReview;
  openingHoursLines: string[];
  gallery: string[];
};

export default function PlaceDetailContent({
  place,
  activeTab,
  onTabChange,
  isSaved,
  saveLoading,
  onToggleSave,
  onOpenCreateModal,
  onReportPlace,
  onContactPlace,
  onOpenGallery,
  onOpenReviewModal,
  reviews,
  reviewsLoading,
  myReview,
  openingHoursLines,
  gallery,
}: PlaceDetailContentProps) {
  const { t } = useI18n();

  const tabItems: TabItem[] = [
    { id: 'info', label: t('placeDetailTabInfo') },
    { id: 'events', label: t('placeDetailTabEvents') },
    { id: 'reviews', label: t('placeDetailTabReviews') },
  ];

  return (
    <View className="bg-gray-50 dark:bg-black mt-2">
      <View className="-mt-6 rounded-t-[28px] bg-gray-50 px-5 pt-6 dark:bg-black">
        <View className="flex-row items-start justify-between gap-4">
          <View className="flex-1">
            <Text className="text-3xl font-bold text-gray-900 dark:text-white">
              {place.name}
            </Text>
            <Text className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              {place.City?.name || t('placeDetailCityUnknown')}
            </Text>
          </View>
          <PlaceSaveButton
            isSaved={isSaved}
            saving={saveLoading}
            onPress={onToggleSave}
            savedLabel={t('placeDetailSaveActive')}
            idleLabel={t('placeDetailSaveIdle')}
          />
        </View>

        <View className="mt-4 flex-row flex-wrap gap-2">
          <TouchableOpacity
            onPress={onOpenCreateModal}
            className="flex-1 min-w-[140px] flex-row items-center justify-center rounded-full bg-[#4c669f] px-3 py-3"
          >
            <Ionicons name="add" size={13} color="#fff" />
            <Text className="ml-1.5 text-xs font-semibold text-white">
              {t('placeDetailCreateCta')}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onReportPlace}
            className="flex-1 min-w-[120px] flex-row items-center justify-center rounded-full border border-rose-200 bg-rose-50 px-3 py-3 dark:border-rose-900/30 dark:bg-rose-900/20"
          >
            <Ionicons name="flag-outline" size={13} color="#e11d48" />
            <Text className="ml-1.5 text-xs font-semibold text-rose-600">
              {t('reportAction')}
            </Text>
          </TouchableOpacity>
        </View>

        <View className="mt-6 rounded-3xl bg-white p-4 dark:bg-gray-900">
          <Tabs
            items={tabItems}
            activeTab={activeTab}
            onTabChange={(id) => onTabChange(id as PlaceDetailTab)}
          />

          {activeTab === 'info' ? (
            <PlaceDetailInfoTab
              place={place}
              openingHoursLines={openingHoursLines}
              gallery={gallery}
              onOpenGallery={onOpenGallery}
              onContactPlace={onContactPlace}
            />
          ) : null}

          {activeTab === 'events' ? <PlaceDetailEventsTab events={place.Event} /> : null}

          {activeTab === 'reviews' ? (
            <PlaceDetailReviewsTab
              reviews={reviews}
              reviewsLoading={reviewsLoading}
              myReview={myReview}
              onOpenReviewModal={onOpenReviewModal}
            />
          ) : null}
        </View>
      </View>
    </View>
  );
}
