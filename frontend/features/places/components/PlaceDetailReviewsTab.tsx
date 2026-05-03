import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useI18n } from '@/hooks/use-i18n';

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

type PlaceDetailReviewsTabProps = {
  reviews: PlaceDetailReview[];
  reviewsLoading: boolean;
  myReview?: PlaceDetailReview;
  onOpenReviewModal: () => void;
};

function formatReviewDate(value: string | null | undefined, locale: string) {
  if (!value) {
    return '';
  }

  return new Date(value).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function PlaceDetailReviewsTab({
  reviews,
  reviewsLoading,
  myReview,
  onOpenReviewModal,
}: PlaceDetailReviewsTabProps) {
  const { locale, t } = useI18n();

  return (
    <View className="pb-2 pt-4">
      <View className="flex-row items-center justify-between">
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {t('placeDetailReviewsTitle')}
        </Text>
        <TouchableOpacity
          onPress={onOpenReviewModal}
          className="rounded-full bg-[#2ecc71] px-4 py-2"
        >
          <Text className="text-xs font-semibold text-white">
            {myReview ? t('placeDetailEditReview') : t('placeDetailAddReview')}
          </Text>
        </TouchableOpacity>
      </View>

      {reviewsLoading ? (
        <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {t('placeDetailReviewsLoading')}
        </Text>
      ) : reviews.length > 0 ? (
        <View className="mt-4 gap-3">
          {reviews.map((review) => (
            <View
              key={review.id}
              className="rounded-3xl border border-gray-100 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-800"
            >
              <View className="flex-row items-center justify-between">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                  {review.User?.displayName ||
                    review.User?.username ||
                    t('placeDetailReviewAnonymous')}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                  {formatReviewDate(review.createdAt, locale)}
                </Text>
              </View>
              <View className="mt-2 flex-row items-center">
                {Array.from({ length: 5 }).map((_, index) => (
                  <Ionicons
                    key={`${review.id}-star-${index}`}
                    name={index < (review.rating || 0) ? 'star' : 'star-outline'}
                    size={14}
                    color={index < (review.rating || 0) ? '#f59e0b' : '#9ca3af'}
                    style={{ marginRight: 2 }}
                  />
                ))}
              </View>
              {review.comment ? (
                <Text className="mt-2 text-sm text-gray-600 dark:text-gray-300">
                  {review.comment}
                </Text>
              ) : null}
            </View>
          ))}
        </View>
      ) : (
        <Text className="mt-3 text-sm text-gray-500 dark:text-gray-400">
          {t('placeDetailReviewsEmpty')}
        </Text>
      )}
    </View>
  );
}
