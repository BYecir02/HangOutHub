import React, { useMemo, useState } from 'react';
import {
  Alert,
  Image,
  FlatList,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileStats from '../../components/profile/ProfileStats';
import PostItem from '../../components/social/PostItem';
import type { PostItemData } from '../../components/social/PostItem';
import PlaceInspirationCard from '../../components/ui/PlaceInspirationCard';
import { SkeletonBlock } from '../../components/ui/Skeleton';
import Tabs from '../../components/ui/Tabs';
import { getImageUrl } from '../../services/api';
import {
  canAccessOrganizerPanel,
  getOrganizerEntryPath,
  isOrganizerPending,
  isOrganizerRejected,
  isOrganizerSuspended,
  normalizeTeamWorkspaceRole,
} from '../../services/organizer-access';
import { useVisibleItemAutoplay } from '../../hooks/useVisibleItemAutoplay';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useI18n } from '@/hooks/use-i18n';

const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';
const EVENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200';

function formatEventDate(value: string, locale: string) {
  return new Date(value).toLocaleString(locale, {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function EmptyPanel({
  icon,
  color,
  title,
  description,
  actionLabel,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  title: string;
  description: string;
  actionLabel?: string;
  onPress?: () => void;
}) {
  return (
    <View className="items-center rounded-[28px] bg-gray-50 px-6 py-12 dark:bg-gray-900">
      <View
        className="h-14 w-14 items-center justify-center rounded-full"
        style={{ backgroundColor: `${color}20` }}
      >
        <Ionicons name={icon} size={24} color={color} />
      </View>
      <Text className="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
        {title}
      </Text>
      <Text className="mt-2 text-center text-gray-500 dark:text-gray-400">
        {description}
      </Text>
      {actionLabel && onPress ? (
        <TouchableOpacity
          onPress={onPress}
          className="mt-5 rounded-full px-5 py-3"
          style={{ backgroundColor: color }}
        >
          <Text className="font-semibold text-white">{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const {
    user,
    posts,
    outings,
    savedPlaces,
    organizerEvents,
    ownedPlaces,
    connectionsCount,
    loading,
    deletePost,
  } = useUserProfile();

  const isProfessionalAccount =
    user?.role === 'ORGANIZER' || user?.role === 'PLACE_OWNER';
  const isPendingOrganizer = isOrganizerPending(user);
  const isRejectedOrganizer = isOrganizerRejected(user);
  const isSuspendedOrganizer = isOrganizerSuspended(user);
  const isOrganizer =
    isProfessionalAccount &&
    !isPendingOrganizer &&
    !isRejectedOrganizer &&
    !isSuspendedOrganizer;
  const normalizedTeamRole = normalizeTeamWorkspaceRole(user?.teamRole);
  const canAccessProPanel = canAccessOrganizerPanel(user);
  const canActivateProPanel = !canAccessProPanel && user?.role === 'USER';
  const [activeTab, setActiveTab] = useState('');
  const [outingFilter, setOutingFilter] = useState<'all' | 'upcoming' | 'ongoing' | 'past'>(
    'all',
  );
  const proAccessStatusCard = useMemo(() => {
    if (!isProfessionalAccount || canAccessProPanel) {
      return null;
    }

    if (isPendingOrganizer) {
      return {
        icon: 'time-outline' as const,
        accentColor: '#f59e0b',
        title: t('organizerGuardPendingTitle'),
        message: t('organizerGuardPendingMessage'),
      };
    }

    if (isRejectedOrganizer) {
      return {
        icon: 'close-circle-outline' as const,
        accentColor: '#ef4444',
        title: t('organizerGuardRejectedTitle'),
        message: t('organizerGuardRejectedMessage'),
      };
    }

    if (isSuspendedOrganizer) {
      return {
        icon: 'pause-circle-outline' as const,
        accentColor: '#f97316',
        title: t('organizerGuardSuspendedTitle'),
        message: t('organizerGuardSuspendedMessage'),
      };
    }

    return null;
  }, [
    canAccessProPanel,
    isPendingOrganizer,
    isProfessionalAccount,
    isRejectedOrganizer,
    isSuspendedOrganizer,
    t,
  ]);
  const proPanelLabel = useMemo(() => {
    if (normalizedTeamRole === 'MANAGER') {
      return t('profileTeamManagerPanel');
    }
    if (normalizedTeamRole === 'STAFF') {
      return t('profileTeamStaffPanel');
    }
    if (normalizedTeamRole === 'SCANNER') {
      return t('profileTeamScannerPanel');
    }

    return user?.role === 'PLACE_OWNER'
      ? t('profilePlaceOwnerPanel')
      : t('profileOrganizerPanel');
  }, [normalizedTeamRole, t, user?.role]);

  const organizerPublicProfileLabel = useMemo(() => {
    if (user?.role === 'PLACE_OWNER') {
      return t('profileOrganizerPublicLabelPlaceOwner');
    }

    return t('profileOrganizerPublicLabelOrganizer');
  }, [t, user?.role]);

  React.useEffect(() => {
    if (!user || activeTab) {
      return;
    }

    setActiveTab(isOrganizer ? 'overview' : 'outings');
  }, [activeTab, isOrganizer, user]);

  const displayUser = useMemo(() => {
    if (isOrganizer && user?.OrganizerProfile) {
      return {
        ...user,
        displayName: user.OrganizerProfile.companyName,
        username:
          user.displayName || user.username
            ? `${user.displayName || user.username} · ${
                user.OrganizerProfile.jobTitle || t('profileOrganizerRoleFallback')
              }`
            : user.username,
      };
    }

    return user;
  }, [isOrganizer, t, user]);

  const sortedOutings = useMemo(
    () =>
      [...outings].sort(
        (left, right) =>
          new Date(left.scheduledDate).getTime() -
          new Date(right.scheduledDate).getTime(),
      ),
    [outings],
  );
  const filteredOutings = useMemo(() => {
    const now = Date.now();
    const ongoingWindowMs = 3 * 60 * 60 * 1000;

    return sortedOutings.filter((outing) => {
      const scheduledAt = new Date(outing.scheduledDate).getTime();
      if (Number.isNaN(scheduledAt)) {
        return outingFilter === 'all';
      }

      if (outingFilter === 'upcoming') {
        return scheduledAt > now;
      }

      if (outingFilter === 'ongoing') {
        return scheduledAt <= now && now <= scheduledAt + ongoingWindowMs;
      }

      if (outingFilter === 'past') {
        return now > scheduledAt + ongoingWindowMs;
      }

      return true;
    });
  }, [outingFilter, sortedOutings]);

  const featuredOuting = filteredOutings[0] ?? null;
  const profilePostsAutoplay = useVisibleItemAutoplay(posts, (post) => post.id);
  const savedPlaceColumns = useMemo(() => {
    const nextColumns: Array<Array<{ place: (typeof savedPlaces)[number]; imageHeight: number }>> =
      [[], []];
    const columnHeights = [0, 0];
    const imageHeights = [184, 242, 208, 264, 196, 232];

    savedPlaces.forEach((place, index) => {
      const imageHeight = imageHeights[index % imageHeights.length];
      const targetColumn = columnHeights[0] <= columnHeights[1] ? 0 : 1;
      nextColumns[targetColumn].push({ place, imageHeight });
      columnHeights[targetColumn] += imageHeight + 120;
    });

    return nextColumns;
  }, [savedPlaces]);
  const tabItems = isOrganizer
    ? [
        { id: 'overview', label: t('profileTabOverview') },
        { id: 'places', label: t('profileTabPlaces') },
        { id: 'events', label: t('profileTabEvents') },
      ]
    : [
        { id: 'outings', label: t('profileTabOutings') },
        { id: 'saved', label: t('profileTabSaved') },
        { id: 'posts', label: t('profileTabPosts') },
      ];

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost(postId);
      Alert.alert(t('profileDeletePostSuccessTitle'), t('profileDeletePostSuccessMessage'));
    } catch {
      Alert.alert(t('commonErrorTitle'), t('profileDeletePostErrorMessage'));
    }
  };

  const handleEditPost = (post: {
    id: string;
    content?: string | null;
    visibility?: 'public' | 'friends' | 'private' | 'custom';
    publicationScope?: 'personal' | 'structure';
  }) => {
    router.push({
      pathname: '/post',
      params: {
        postId: post.id,
        content: post.content,
        visibility: post.visibility,
        publicationScope: post.publicationScope || 'personal',
      },
    });
  };

  const handleCommentPost = (post: { id: string }) => {
    router.push({ pathname: '/comments', params: { postId: post.id } });
  };

  const outingFilterOptions = useMemo(
    () => [
      { key: 'all', label: t('profileOutingsFilterAll') },
      { key: 'upcoming', label: t('profileOutingsFilterUpcoming') },
      { key: 'ongoing', label: t('profileOutingsFilterOngoing') },
      { key: 'past', label: t('profileOutingsFilterPast') },
    ],
    [t],
  );

  if (loading && !user) {
    return (
      <ScrollView className="flex-1 bg-white dark:bg-black" showsVerticalScrollIndicator={false}>
        <View className="h-44 bg-gray-200 dark:bg-gray-800" />
        <View className="-mt-10 px-5">
          <SkeletonBlock className="h-20 w-20 rounded-full border-4 border-white dark:border-black" />
          <SkeletonBlock className="mt-4 h-6 w-40 rounded-lg" />
          <SkeletonBlock className="mt-2 h-4 w-56 rounded-lg" />
        </View>

        <View className="mt-6 flex-row justify-between px-5">
          {[0, 1, 2, 3].map((item) => (
            <View key={`stat-${item}`} className="items-center">
              <SkeletonBlock className="h-6 w-12 rounded-lg" />
              <SkeletonBlock className="mt-2 h-3 w-16 rounded-lg" />
            </View>
          ))}
        </View>

        <View className="mt-8 px-5">
          <SkeletonBlock className="h-10 w-full rounded-full" />
          <View className="mt-6">
            <SkeletonBlock className="h-28 w-full rounded-[28px]" />
            <SkeletonBlock className="mt-4 h-28 w-full rounded-[28px]" />
          </View>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-black"
      showsVerticalScrollIndicator={false}
      onScroll={activeTab === 'posts' ? profilePostsAutoplay.onScroll : undefined}
      scrollEventThrottle={16}
      onLayout={activeTab === 'posts' ? profilePostsAutoplay.onLayout : undefined}
    >
      <ProfileHeader
        user={displayUser}
        isOrganizer={isOrganizer}
        canAccessProPanel={canAccessProPanel}
        canActivateProPanel={canActivateProPanel}
        proPanelLabel={proPanelLabel}
        onOpenProPanel={() => router.push(getOrganizerEntryPath(user))}
        onActivateProPanel={() => router.push('/activate-pro')}
        onImagePress={setPreviewImage}
      />
      {proAccessStatusCard ? (
        <View className="mt-4 px-5">
          <View
            className="rounded-3xl border p-4"
            style={{
              borderColor: `${proAccessStatusCard.accentColor}66`,
              backgroundColor: `${proAccessStatusCard.accentColor}14`,
            }}
          >
            <View className="flex-row items-start">
              <View
                className="mr-3 h-9 w-9 items-center justify-center rounded-full"
                style={{
                  backgroundColor: `${proAccessStatusCard.accentColor}24`,
                }}
              >
                <Ionicons
                  name={proAccessStatusCard.icon}
                  size={18}
                  color={proAccessStatusCard.accentColor}
                />
              </View>
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                  {proAccessStatusCard.title}
                </Text>
                <Text className="mt-1 text-sm text-gray-600 dark:text-gray-300">
                  {proAccessStatusCard.message}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ) : null}

      <ProfileStats
        postsCount={posts.length}
        outingsCount={outings.length}
        connectionsCount={connectionsCount}
        savedCount={savedPlaces.length}
        isOrganizer={isOrganizer}
        placesCount={ownedPlaces.length}
        eventsCount={organizerEvents.length}
        onConnectionsPress={() => router.push('/connections')}
      />

      <View className="mt-8 pb-10">
        <Tabs items={tabItems} activeTab={activeTab} onTabChange={setActiveTab} />
        <View className="min-h-[220px] pt-5">
          {!isOrganizer && activeTab === 'outings' ? (
            <View className="px-5">
              <View className="mb-4 flex-row rounded-full bg-gray-100 p-1 dark:bg-gray-900">
                {outingFilterOptions.map((option) => {
                  const active = outingFilter === option.key;

                  return (
                    <TouchableOpacity
                      key={option.key}
                      onPress={() => setOutingFilter(option.key as typeof outingFilter)}
                      className={`flex-1 items-center rounded-full px-3 py-2 ${
                        active ? 'bg-[#4c669f]' : 'bg-transparent'
                      }`}
                    >
                      <Text
                        className={`text-xs font-semibold ${
                          active ? 'text-white' : 'text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {option.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {filteredOutings.length > 0 ? (
                <>
                  <View className="gap-3">
                    {filteredOutings.map((outing) => (
                      <TouchableOpacity
                        key={outing.id}
                        onPress={() =>
                          router.push({
                            pathname: '/outing/[id]',
                            params: { id: outing.id },
                          })
                        }
                        className="flex-row items-center rounded-3xl bg-gray-50 p-4 dark:bg-gray-900"
                      >
                        <View className="flex-1 pr-4">
                          <Text className="text-lg font-bold text-gray-900 dark:text-white">
                            {outing.title}
                          </Text>
                          <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {formatEventDate(outing.scheduledDate, locale)}
                          </Text>
                          <Text className="mt-1 text-sm text-gray-400 dark:text-gray-500">
                            {outing.Place?.name ||
                              outing.Place?.City?.name ||
                              outing.Place?.address ||
                              t('profileFeaturedOutingLocationFallback')}
                          </Text>
                        </View>
                        <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
                      </TouchableOpacity>
                    ))}
                  </View>

                  <TouchableOpacity
                    onPress={() => router.push('/outing')}
                    className="mt-4 items-center rounded-full bg-[#4c669f] px-5 py-3"
                  >
                    <Text className="font-semibold text-white">
                      {t('profileCreateOutingCta')}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <EmptyPanel
                  icon="calendar-outline"
                  color="#4c669f"
                  title={t('profileEmptyOutingsTitle')}
                  description={t('profileEmptyOutingsDescription')}
                  actionLabel={t('profileOrganizeOutingCta')}
                  onPress={() => router.push('/outing')}
                />
              )}
            </View>
          ) : null}

          {!isOrganizer && activeTab === 'saved' ? (
            <View className="px-5">
              {savedPlaces.length > 0 ? (
                <>
                  <View className="flex-row items-start gap-3">
                    {savedPlaceColumns.map((column, columnIndex) => (
                      <View key={`saved-column-${columnIndex}`} className="min-w-0 flex-1">
                        {column.map(({ place, imageHeight }) => (
                          <PlaceInspirationCard
                            key={place.id}
                            place={{ ...place, coverUrl: place.coverUrl ?? null }}
                            imageHeight={imageHeight}
                            fallbackNewLabel={t('discoverPlaceMetaDiscover')}
                            onPress={() =>
                              router.push({
                                pathname: '/place/[id]',
                                params: { id: place.id },
                              })
                            }
                            showSaveButton={false}
                            shouldPlay={false}
                          />
                        ))}
                      </View>
                    ))}
                  </View>
                </>
              ) : (
                <EmptyPanel
                  icon="heart-outline"
                  color="#2ecc71"
                  title={t('profileEmptySavedTitle')}
                  description={t('profileEmptySavedDescription')}
                  actionLabel={t('profileExplorePlacesCta')}
                  onPress={() => router.push('/(tabs)/home')}
                />
              )}
            </View>
          ) : null}

          {!isOrganizer && activeTab === 'posts' ? (
            posts.length > 0 ? (
              <FlatList<PostItemData>
                data={posts}
                keyExtractor={(item) => item.id}
                scrollEnabled={false}
                removeClippedSubviews={false}
                initialNumToRender={4}
                maxToRenderPerBatch={4}
                windowSize={5}
                updateCellsBatchingPeriod={50}
                renderItem={({ item }) => (
                  <View
                    onLayout={(event) =>
                      profilePostsAutoplay.registerLayout(item.id, {
                        y: event.nativeEvent.layout.y,
                        height: event.nativeEvent.layout.height,
                      })
                    }
                  >
                    <PostItem
                      item={item}
                      showDateColumn={false}
                      presentation="instagram"
                      onDelete={handleDeletePost}
                      onEdit={handleEditPost}
                      onComment={handleCommentPost}
                      shouldPlayMedia={profilePostsAutoplay.activeId === item.id}
                    />
                  </View>
                )}
              />
            ) : (
              <EmptyPanel
                icon="create-outline"
                color="#f39c12"
                title={t('profileEmptyPostsTitle')}
                description={t('profileEmptyPostsDescription')}
              />
            )
          ) : null}

          {isOrganizer && activeTab === 'overview' ? (
            <View className="px-5">
              <View className="rounded-3xl bg-gray-50 p-5 dark:bg-gray-900">
                <Text className="text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {organizerPublicProfileLabel}
                </Text>
                <Text className="mt-2 text-xs uppercase tracking-widest text-gray-400 dark:text-gray-500">
                  {t('profileStructureLabel')}
                </Text>
                <Text className="mt-2 text-xl font-bold text-gray-900 dark:text-white">
                  {user?.OrganizerProfile?.companyName || t('profileOrganizationFallback')}
                </Text>
                <Text className="mt-2 text-base text-gray-600 dark:text-gray-300">
                  {user?.bio || t('profileOrganizerBioFallback')}
                </Text>
              </View>
            </View>
          ) : null}

          {isOrganizer && activeTab === 'places'
            ? (
              <View className="px-5">
                {ownedPlaces.length > 0 ? (
                  ownedPlaces.map((place) => (
                    <TouchableOpacity
                      key={place.id}
                      onPress={() =>
                        router.push({
                          pathname: '/place/[id]',
                          params: { id: place.id },
                        })
                      }
                      className="mb-4 flex-row rounded-3xl bg-gray-50 p-3 dark:bg-gray-900"
                    >
                      <Image
                        source={{ uri: getImageUrl(place.coverUrl) || PLACE_PLACEHOLDER }}
                        className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-gray-800"
                        resizeMode="cover"
                      />
                      <View className="ml-4 flex-1 justify-center">
                        <Text className="text-base font-semibold text-gray-900 dark:text-white">
                          {place.name}
                        </Text>
                        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {place.City?.name || place.address || t('homeAddressToConfirm')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <EmptyPanel
                    icon="business-outline"
                    color="#2ecc71"
                    title={t('profileOrganizerEmptyPlacesTitle')}
                    description={t('profileOrganizerEmptyPlacesDescription')}
                    actionLabel={
                      user?.role === 'PLACE_OWNER'
                        ? t('profileOrganizerEmptyPlacesActionCreate')
                        : t('profileOrganizerEmptyPlacesActionManageEvents')
                    }
                    onPress={() =>
                      router.push(
                        user?.role === 'PLACE_OWNER'
                          ? '/organizer/create-place'
                          : '/organizer/events',
                      )
                    }
                  />
                )}
              </View>
            )
            : null}

          {isOrganizer && activeTab === 'events'
            ? (
              <View className="px-5">
                {organizerEvents.length > 0 ? (
                  organizerEvents.map((event) => (
                    <TouchableOpacity
                      key={event.id}
                      onPress={() =>
                        router.push({
                          pathname: '/event/[id]',
                          params: { id: event.id },
                        })
                      }
                      className="mb-4 flex-row rounded-3xl bg-gray-50 p-3 dark:bg-gray-900"
                    >
                      <Image
                        source={{ uri: getImageUrl(event.coverUrl) || EVENT_PLACEHOLDER }}
                        className="h-20 w-20 rounded-2xl bg-gray-200 dark:bg-gray-800"
                        resizeMode="cover"
                      />
                      <View className="ml-4 flex-1 justify-center">
                        <Text className="text-base font-semibold text-gray-900 dark:text-white">
                          {event.title}
                        </Text>
                        <Text className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                          {formatEventDate(event.startTime, locale)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))
                ) : (
                  <EmptyPanel
                    icon="ticket-outline"
                    color="#ff4757"
                    title={t('profileOrganizerEmptyEventsTitle')}
                    description={t('profileOrganizerEmptyEventsDescription')}
                    actionLabel={t('profileOrganizerEmptyEventsActionCreate')}
                    onPress={() => router.push('/event')}
                  />
                )}
              </View>
            )
            : null}
        </View>
      </View>

      <Modal
        visible={!!previewImage}
        transparent
        onRequestClose={() => setPreviewImage(null)}
        animationType="fade"
      >
        <View className="flex-1 items-center justify-center bg-black">
          <TouchableOpacity
            className="absolute right-5 top-12 z-10 rounded-full bg-gray-800/50 p-2"
            onPress={() => setPreviewImage(null)}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          {previewImage ? (
            <Image
              source={{ uri: previewImage }}
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          ) : null}
        </View>
      </Modal>
    </ScrollView>
  );
}
