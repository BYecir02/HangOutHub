import React, { type RefObject } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';
import Animated from 'react-native-reanimated';

import PlacePublicationsMasonry from '@/features/places/components/PlacePublicationsMasonry';
import ScreenState from '@/shared/ui/ScreenState';
import { useI18n } from '@/shared/hooks/use-i18n';
import type { VisibleRect } from '@/shared/hooks/useVisibleItemAutoplay.logic';
import type { PostDetails } from '@/services/social/posts';

type PublicationsVisibility = {
  activeId: string | null;
  registerLayout: (id: string, layout: VisibleRect) => void;
  onLayout: (event: LayoutChangeEvent) => void;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
  beginInteraction: () => void;
  endInteraction: () => void;
  beginMomentum: () => void;
  endMomentum: () => void;
};

type EventPublicationsPanelProps = {
  eventTitle: string;
  publications: PostDetails[];
  scrollRef: RefObject<ScrollView | null>;
  visibility: PublicationsVisibility;
  containerOffsetY: number;
  onGridLayout: (offsetY: number) => void;
  loading: boolean;
  error: boolean;
  authRequired: boolean;
  onRetry: () => void;
  onClose: () => void;
  onPressPost: (post: PostDetails) => void;
  style: any;
  pointerEvents: 'auto' | 'none';
};

export default function EventPublicationsPanel({
  eventTitle,
  publications,
  scrollRef,
  visibility,
  containerOffsetY,
  onGridLayout,
  loading,
  error,
  authRequired,
  onRetry,
  onClose,
  onPressPost,
  style,
  pointerEvents,
}: EventPublicationsPanelProps) {
  const { t } = useI18n();

  return (
    <Animated.View
      className="absolute inset-0 overflow-hidden bg-gray-50 dark:bg-black"
      style={style}
      pointerEvents={pointerEvents}
    >
      <ScrollView
        ref={scrollRef}
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        onLayout={visibility.onLayout}
        onScroll={visibility.onScroll}
        onScrollBeginDrag={visibility.beginInteraction}
        onScrollEndDrag={visibility.endInteraction}
        onMomentumScrollBegin={visibility.beginMomentum}
        onMomentumScrollEnd={visibility.endMomentum}
        scrollEventThrottle={16}
      >
        <View className="px-5 pb-4 pt-6">
          <View className="flex-row items-start justify-between gap-4">
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 dark:text-white">
                {t('eventDetailPublicationsTitle')}
              </Text>
              <Text className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300">
                {t('eventDetailPublicationsSubtitle', { name: eventTitle })}
              </Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              className="rounded-full bg-gray-100 px-3 py-2 dark:bg-gray-800"
              accessibilityRole="button"
              accessibilityLabel={t('eventDetailPublicationsClose')}
            >
              <Text className="text-xs font-semibold uppercase tracking-[0.18em] text-gray-700 dark:text-gray-200">
                ✕ {t('eventDetailPublicationsClose')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="mt-1 px-5">
          {authRequired ? (
            <ScreenState
              mode="warning"
              icon="lock-closed-outline"
              title={t('placeDetailLoginRequiredTitle')}
              description={t('eventDetailPublicationsLoginMessage')}
              actionLabel={t('eventDetailPublicationsRetry')}
              onAction={onRetry}
              containerClassName="px-0 py-2"
              variant="card"
            />
          ) : loading ? (
            <ScreenState
              mode="loading"
              title={t('eventDetailPublicationsLoading')}
              containerClassName="px-0 py-2"
            />
          ) : error ? (
            <ScreenState
              mode="error"
              title={t('commonErrorTitle')}
              description={t('eventDetailPublicationsLoadFailed')}
              actionLabel={t('eventDetailPublicationsRetry')}
              onAction={onRetry}
              containerClassName="px-0 py-2"
            />
          ) : publications.length > 0 ? (
            <View
              onLayout={(event) => {
                onGridLayout(event.nativeEvent.layout.y);
              }}
            >
              <PlacePublicationsMasonry
                posts={publications}
                activePostId={visibility.activeId}
                registerLayout={visibility.registerLayout}
                containerOffsetY={containerOffsetY}
                onPressPost={onPressPost}
              />
            </View>
          ) : (
            <ScreenState
              mode="empty"
              icon="albums-outline"
              title={t('eventDetailPublicationsEmptyTitle')}
              description={t('eventDetailPublicationsEmptyDescription')}
              containerClassName="px-0 py-2"
            />
          )}
        </View>
      </ScrollView>
    </Animated.View>
  );
}
