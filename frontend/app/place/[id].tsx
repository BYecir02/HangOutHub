import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import Animated from 'react-native-reanimated';

import PlaceDetailContent from '@/components/place/PlaceDetailContent';
import PlaceDetailHero from '@/components/place/PlaceDetailHero';
import PlaceGalleryModal from '@/components/place/PlaceGalleryModal';
import PlacePublicationsPanel from '@/components/place/PlacePublicationsPanel';
import PlaceReviewModal from '@/components/place/PlaceReviewModal';
import ReportReasonSheet from '@/components/ui/ReportReasonSheet';
import { usePlaceDetail, type PlaceDetailTab } from '@/hooks/usePlaceDetail';

export default function PlaceDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const {
    t,
    place,
    loading,
    saveLoading,
    isSaved,
    heroMuted,
    toggleHeroMuted,
    heroImage,
    heroIsVideo,
    publicationsOpen,
    placePublications,
    placePublicationsLoading,
    placePublicationsLoaded,
    placePublicationsError,
    placePublicationsAuthRequired,
    publicationsGridOffsetY,
    setPublicationsGridOffsetY,
    reviews,
    reviewsLoading,
    reviewSubmitting,
    myReview,
    canClaimPlace,
    gallery,
    openingHoursLines,
    publicationsCount,
    publicationsScrollRef,
    placePublicationsVisibility,
    publicationsPanelAStyle,
    publicationsPanelBStyle,
    screenHeight,
    loadPlacePublications,
    handleOpenPublications,
    handleClosePublications,
    handleOpenCreateModal,
    handleOpenClaimPlace,
    handleToggleSave,
    handleContactPlace,
    handleSubmitReportReason,
    submitReview,
  } = usePlaceDetail(params.id);

  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIndex, setGalleryIndex] = useState(0);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<PlaceDetailTab>('info');

  const handleOpenReviewModal = useCallback(() => {
    if (myReview) {
      setReviewRating(myReview.rating || 0);
      setReviewComment(myReview.comment ?? '');
    } else {
      setReviewRating(0);
      setReviewComment('');
    }
    setShowReviewModal(true);
  }, [myReview]);

  const handleReportPlace = useCallback(() => {
    setReportSheetVisible(true);
  }, []);

  const handleSubmitReview = useCallback(async () => {
    const success = await submitReview(reviewRating, reviewComment);
    if (!success) {
      return;
    }

    setShowReviewModal(false);
    setReviewRating(0);
    setReviewComment('');
  }, [reviewComment, reviewRating, submitReview]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#2ecc71" />
      </View>
    );
  }

  if (!place) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8 dark:bg-black">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          {t('placeDetailNotFound')}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-[#2ecc71] px-5 py-3"
        >
          <Text className="font-semibold text-white">{t('publicProfileBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="relative flex-1 bg-gray-50 dark:bg-black mt-2">
      <ScrollView
        className="flex-1 bg-gray-50 dark:bg-black"
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="bg-gray-50 dark:bg-black mt-2">
          <PlaceDetailHero
            heroImage={heroImage}
            heroIsVideo={heroIsVideo}
            heroMuted={heroMuted}
            onToggleHeroMuted={toggleHeroMuted}
            avgRating={place.avgRating}
            publicationsLoaded={placePublicationsLoaded}
            publicationsCount={publicationsCount}
            publicationsCtaLabel={t('placeDetailPublicationsCta')}
            onOpenPublications={handleOpenPublications}
            mediaMuteLabel={t('mediaMute')}
            mediaUnmuteLabel={t('mediaUnmute')}
          />

          <View className="relative overflow-hidden" style={{ minHeight: screenHeight }}>
            <Animated.View
              className="absolute inset-0 overflow-hidden"
              style={publicationsPanelAStyle}
              pointerEvents={publicationsOpen ? 'none' : 'auto'}
            >
              <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
                <PlaceDetailContent
                  place={place}
                  activeTab={activeTab}
                  onTabChange={(next) => setActiveTab(next)}
                  isSaved={isSaved}
                  saveLoading={saveLoading}
                  onToggleSave={handleToggleSave}
                  onOpenCreateModal={handleOpenCreateModal}
                  canClaimPlace={canClaimPlace}
                  onOpenClaimPlace={handleOpenClaimPlace}
                  onReportPlace={handleReportPlace}
                  onContactPlace={handleContactPlace}
                  onOpenGallery={(index) => {
                    setGalleryIndex(index);
                    setGalleryOpen(true);
                  }}
                  onOpenReviewModal={handleOpenReviewModal}
                  reviews={reviews}
                  reviewsLoading={reviewsLoading}
                  myReview={myReview}
                  openingHoursLines={openingHoursLines}
                  gallery={gallery}
                />

                <View className="pb-24" />
              </ScrollView>
            </Animated.View>

            <PlacePublicationsPanel
              placeName={place.name}
              publications={placePublications}
              scrollRef={publicationsScrollRef}
              visibility={placePublicationsVisibility}
              containerOffsetY={publicationsGridOffsetY}
              onGridLayout={(offsetY) => {
                setPublicationsGridOffsetY(offsetY);
              }}
              loading={placePublicationsLoading}
              error={placePublicationsError}
              authRequired={placePublicationsAuthRequired}
              onRetry={() => {
                void loadPlacePublications();
              }}
              onClose={handleClosePublications}
              onPressPost={(post) => {
                handleClosePublications();
                router.push({
                  pathname: '/post-view/[id]',
                  params: { id: post.id },
                });
              }}
              style={publicationsPanelBStyle}
              pointerEvents={publicationsOpen ? 'auto' : 'none'}
            />
          </View>
        </View>
      </ScrollView>

      <TouchableOpacity
        onPress={() => router.back()}
        className="absolute left-5 top-14 z-30 rounded-full bg-black/45 p-3 shadow-lg"
        accessibilityRole="button"
        accessibilityLabel="Retour"
      >
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>

      <PlaceGalleryModal
        visible={galleryOpen}
        gallery={gallery}
        index={galleryIndex}
        onClose={() => setGalleryOpen(false)}
      />

      <PlaceReviewModal
        visible={showReviewModal}
        title={t('placeDetailReviewModalTitle')}
        subtitle={t('placeDetailReviewModalSubtitle')}
        placeholder={t('placeDetailReviewPlaceholder')}
        cancelLabel={t('genericCancel')}
        submitLabel={myReview ? t('placeDetailReviewUpdate') : t('placeDetailReviewSubmit')}
        rating={reviewRating}
        comment={reviewComment}
        submitting={reviewSubmitting}
        onClose={() => setShowReviewModal(false)}
        onChangeRating={setReviewRating}
        onChangeComment={setReviewComment}
        onSubmit={handleSubmitReview}
      />

      <ReportReasonSheet
        visible={reportSheetVisible}
        onClose={() => setReportSheetVisible(false)}
        onSubmitReason={handleSubmitReportReason}
      />
    </View>
  );
}
