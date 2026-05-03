import React from 'react';
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

import EventDetailContent from '@/features/events/components/EventDetailContent';
import EventDetailHero from '@/features/events/components/EventDetailHero';
import EventPublicationsPanel from '@/features/events/components/EventPublicationsPanel';
import ReportReasonSheet from '@/shared/ui/ReportReasonSheet';
import { useEventDetail } from '@/features/events/hooks/useEventDetail';

export default function EventDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string; tab?: string }>();
  const {
    t,
    locale,
    event,
    loading,
    cancelling,
    reportSheetVisible,
    setReportSheetVisible,
    heroMuted,
    setHeroMuted,
    joining,
    selectedTicketTypeId,
    setSelectedTicketTypeId,
    promoCode,
    promoError,
    showCancellationDetails,
    setShowCancellationDetails,
    showRefundDetails,
    setShowRefundDetails,
    activeTab,
    setActiveTab,
    heroImage,
    heroIsVideo,
    publicationsOpen,
    eventPublications,
    eventPublicationsLoading,
    eventPublicationsLoaded,
    eventPublicationsError,
    eventPublicationsAuthRequired,
    publicationsGridOffsetY,
    setPublicationsGridOffsetY,
    publicationsCount,
    publicationsScrollRef,
    eventPublicationsVisibility,
    publicationsPanelAStyle,
    publicationsPanelBStyle,
    screenHeight,
    ticketTypes,
    displayPrice,
    availableTicketTypes,
    selectedTicketType,
    hasActiveBooking,
    isSoldOut,
    heroPriceLabel,
    gallery,
    eventLocationLabel,
    eventAddressLabel,
    eventCityLabel,
    eventStartTime,
    primaryActionLabel,
    tabItems,
    handleCreateOuting,
    handleContactOrganizer,
    loadEventPublications,
    handleOpenPublications,
    handleClosePublications,
    handlePrimaryAction,
    handlePromoChange,
    handleReportEvent,
    handleSubmitReportReason,
  } = useEventDetail(params.id, params.tab);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator size="large" color="#ff4757" />
      </View>
    );
  }

  if (!event) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-8 dark:bg-black">
        <Text className="text-xl font-bold text-gray-900 dark:text-white">
          {t('eventDetailNotFound')}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-xl bg-[#ff4757] px-5 py-3"
        >
          <Text className="font-semibold text-white">{t('publicProfileBack')}</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black mt-2">
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <EventDetailHero
          heroImage={heroImage}
          heroIsVideo={heroIsVideo}
          heroMuted={heroMuted}
          onToggleHeroMuted={() => setHeroMuted((value) => !value)}
          cityLabel={eventCityLabel}
          priceLabel={heroPriceLabel}
          publicationsLoaded={eventPublicationsLoaded}
          publicationsCount={publicationsCount}
          publicationsCtaLabel={t('eventDetailPublicationsCta')}
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
              <EventDetailContent
                event={event}
                t={t}
                locale={locale}
                tabItems={tabItems}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                eventLocationLabel={eventLocationLabel}
                eventAddressLabel={eventAddressLabel}
                eventStartTime={eventStartTime}
                ticketTypes={ticketTypes}
                selectedTicketTypeId={selectedTicketTypeId}
                setSelectedTicketTypeId={setSelectedTicketTypeId}
                availableTicketTypes={availableTicketTypes}
                promoCode={promoCode}
                onChangePromoCode={handlePromoChange}
                promoError={promoError}
                joining={joining}
                hasActiveBooking={hasActiveBooking}
                isSoldOut={isSoldOut}
                selectedTicketType={selectedTicketType}
                displayPrice={displayPrice}
                showCancellationDetails={showCancellationDetails}
                setShowCancellationDetails={setShowCancellationDetails}
                showRefundDetails={showRefundDetails}
                setShowRefundDetails={setShowRefundDetails}
                gallery={gallery}
                onOpenPlace={() =>
                  router.push({
                    pathname: '/place/[id]',
                    params: { id: event.Place?.id || '' },
                  })
                }
                onContactOrganizer={() => {
                  void handleContactOrganizer();
                }}
                onReportEvent={handleReportEvent}
                onCreateOuting={handleCreateOuting}
              />

              <View className="pb-24" />
            </ScrollView>
          </Animated.View>

          <EventPublicationsPanel
            eventTitle={event.title}
            publications={eventPublications}
            scrollRef={publicationsScrollRef}
            visibility={eventPublicationsVisibility}
            containerOffsetY={publicationsGridOffsetY}
            onGridLayout={(offsetY) => {
              setPublicationsGridOffsetY(offsetY);
            }}
            loading={eventPublicationsLoading}
            error={eventPublicationsError}
            authRequired={eventPublicationsAuthRequired}
            onRetry={() => {
              void loadEventPublications();
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
      </ScrollView>

      {/* Bottom Action Bar */}
      <View className="border-t border-gray-200 bg-white/95 px-4 pb-5 pt-4 dark:border-gray-800 dark:bg-gray-950/95">
        <TouchableOpacity
          onPress={handlePrimaryAction}
          disabled={joining || cancelling}
          className={`items-center rounded-[28px] px-5 py-4 shadow-[0_12px_30px_rgba(15,23,42,0.08)] ${
            joining || cancelling || (!hasActiveBooking && isSoldOut)
              ? 'bg-[#ff9aa3]'
              : 'bg-[#ff4757]'
          }`}
        >
          {joining ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-sm font-semibold text-white">{primaryActionLabel}</Text>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => router.back()}
        className="absolute left-5 top-14 z-30 rounded-full bg-black/45 p-3 shadow-lg"
        accessibilityRole="button"
        accessibilityLabel="Retour"
      >
        <Ionicons name="arrow-back" size={22} color="#fff" />
      </TouchableOpacity>

      <ReportReasonSheet
        visible={reportSheetVisible}
        onClose={() => setReportSheetVisible(false)}
        onSubmitReason={handleSubmitReportReason}
      />
    </View>
  );
}
 



