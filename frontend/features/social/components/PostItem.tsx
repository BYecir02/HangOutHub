import React, { memo, useEffect, useState } from 'react';
import {
  ActionSheetIOS,
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useColorScheme } from '@/shared/hooks/use-color-scheme';
import { useI18n } from '@/shared/hooks/use-i18n';
import ReportReasonSheet from '@/shared/ui/ReportReasonSheet';
import PostMediaGallery from './PostMediaGallery';
import PostMediaViewer from './PostMediaViewer';

import api, { getApiErrorMessage, getImageUrl } from '../../../services/api';
import { createReport } from '@/services/social/reports';

export interface PostAuthor {
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface PostItemData {
  id: string;
  userId?: string;
  content?: string | null;
  images?: string[];
  publicationScope?: 'personal' | 'structure';
  postType?: 'post' | 'plan';
  placeId?: string | null;
  eventId?: string | null;
  placeName?: string | null;
  cityName?: string | null;
  ambiance?: string | null;
  Event?: {
    id: string;
    title: string;
    startTime: string;
    placeId?: string | null;
    coverUrl?: string | null;
    Place?: {
      id?: string;
      name?: string | null;
      City?: {
        name?: string | null;
      } | null;
    } | null;
  } | null;
  Place?: {
    id?: string;
    name?: string | null;
    coverUrl?: string | null;
    City?: {
      name?: string | null;
    } | null;
  } | null;
  outingId?: string | null;
  isLiked?: boolean;
  isOwner?: boolean;
  visibility?: 'public' | 'friends' | 'private' | 'custom';
  createdAt?: string;
  User?: PostAuthor;
  _count?: {
    likes?: number;
    comments?: number;
  };
  shareCount?: number | null;
}

interface PostItemProps {
  item: PostItemData;
  onDelete?: (id: string) => void | Promise<void>;
  onEdit?: (post: PostItemData) => void;
  onComment?: (post: PostItemData) => void;
  onShare?: (post: PostItemData) => void;
  showDateColumn?: boolean;
  authorDisplayMode?: 'place' | 'user' | 'auto';
  shouldPlayMedia?: boolean;
  presentation?: 'thread' | 'instagram' | 'sortie';
  readOnly?: boolean;
}

function PostItem({
  item,
  onDelete,
  onEdit,
  onComment,
  onShare,
  showDateColumn = true,
  authorDisplayMode = 'place',
  shouldPlayMedia = false,
  presentation = 'thread',
  readOnly = false,
}: PostItemProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { locale, t } = useI18n();
  const avatarUri =
    getImageUrl(item.User?.avatarUrl) || 'https://i.pravatar.cc/150';
  const placeAvatarUri =
    getImageUrl(item.Place?.coverUrl) || avatarUri;
  const [isLiked, setIsLiked] = useState(Boolean(item.isLiked));
  const [likesCount, setLikesCount] = useState(item._count?.likes || 0);
  const [commentsCount, setCommentsCount] = useState(item._count?.comments || 0);
  const [mediaViewerVisible, setMediaViewerVisible] = useState(false);
  const [mediaViewerIndex, setMediaViewerIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
  const [isContentExpanded, setIsContentExpanded] = useState(false);
  const shareCount = item.shareCount || 0;
  const isConnections = item.visibility === 'friends';
  const isPlanPost = item.postType === 'plan' || isConnections;
  const isOfficialPost = item.publicationScope === 'structure';
  const visibilityLabel =
    item.visibility === 'friends'
      ? t('postVisibilityFriendsLabel')
      : item.visibility === 'private'
      ? t('postVisibilityPrivateLabel')
      : item.visibility === 'custom'
      ? t('postVisibilityCustomLabel')
      : t('postVisibilityPublicLabel');
  const visibilityTone =
    item.visibility === 'friends'
      ? {
          column: 'bg-[#ff4757]/10 dark:bg-[#ff4757]/20',
          label: 'text-[#ff4757]',
          accent: '#ff4757',
        }
      : item.visibility === 'custom'
      ? {
          column: 'bg-[#f39c12]/10 dark:bg-[#f39c12]/20',
          label: 'text-[#f39c12]',
          accent: '#f39c12',
        }
      : item.visibility === 'private'
      ? {
          column: 'bg-gray-200/70 dark:bg-gray-800',
          label: 'text-gray-600 dark:text-gray-300',
          accent: '#9ca3af',
        }
      : {
          column: 'bg-[#4c669f]/10 dark:bg-[#4c669f]/20',
          label: 'text-[#4c669f]',
          accent: '#4c669f',
        };

  const createdAtDate = item.createdAt ? new Date(item.createdAt) : new Date();
  const dayLabel = createdAtDate.toLocaleDateString(locale, { day: '2-digit' });
  const monthLabel = createdAtDate
    .toLocaleDateString(locale, { month: 'short' })
    .toUpperCase();
  const timeLabel = createdAtDate.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
  const relativeDateLabel = (() => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const createdDay = new Date(
      createdAtDate.getFullYear(),
      createdAtDate.getMonth(),
      createdAtDate.getDate(),
    );
    const diffDays = Math.round(
      (today.getTime() - createdDay.getTime()) / (1000 * 60 * 60 * 24),
    );
    if (diffDays === 0) {
      return t('postDateToday');
    }
    if (diffDays === 1) {
      return t('postDateYesterday');
    }
    return createdAtDate.toLocaleDateString(locale, {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
    });
  })();

  const isInstagramPresentation = presentation === 'instagram';
  const rawContent = (item.content || '').trim();
  const firstLine = rawContent.split('\n')[0] || '';
  const titleText = firstLine
    ? firstLine.length > 72
      ? `${firstLine.slice(0, 69)}...`
      : firstLine
    : t('postItemPlanFallback');
  const bodyText = rawContent
    ? rawContent.slice(firstLine.length).trim()
    : '';
  const bodyExcerpt =
    bodyText.length > 160 ? `${bodyText.slice(0, 157)}...` : bodyText;
  const hasExpandableContent =
    isInstagramPresentation &&
    (rawContent.includes('\n') || rawContent.length > 140);
  const locationLabel = (() => {
    const primary = [item.placeName, item.cityName]
      .map((value) => (value || '').trim())
      .filter(Boolean)
      .join(' · ');
    if (primary) {
      return primary;
    }
    if (item.Event?.Place?.name) {
      return [item.Event.Place.name, item.Event.Place.City?.name]
        .filter(Boolean)
        .join(' · ');
    }
    return '';
  })();
  const categoryLabel = (item.ambiance || '').trim();
  const eventLabel = item.Event?.title?.trim() || '';
  const displayAsPlace =
    authorDisplayMode === 'user'
      ? false
      : item.publicationScope === 'structure' &&
        Boolean(item.Place?.name?.trim());
  const authorLabel = displayAsPlace
    ? item.Place?.name?.trim() || item.User?.displayName || item.User?.username || t('postItemUserFallback')
    : item.User?.displayName || item.User?.username || t('postItemUserFallback');
  const authorAvatarUri = displayAsPlace ? placeAvatarUri : avatarUri;

  useEffect(() => {
    setIsLiked(Boolean(item.isLiked));
    setLikesCount(item._count?.likes || 0);
    setCommentsCount(item._count?.comments || 0);
  }, [item._count?.comments, item._count?.likes, item.isLiked]);

  useEffect(() => {
    setIsContentExpanded(false);
  }, [item.id]);

  const handleLike = async () => {
    const previousState = isLiked;
    setIsLiked(!isLiked);
    setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));

    try {
      await api.post(`/posts/${item.id}/like`);
    } catch {
      setIsLiked(previousState);
      setLikesCount((prev) => (isLiked ? prev + 1 : prev - 1));
    }
  };

  const handleSubmitReportReason = async (reason: string) => {
    try {
      await createReport(item.id, 'POST', reason);
      setReportSheetVisible(false);
    } catch (error) {
      console.error(getApiErrorMessage(error, t('reportFailed')));
    }
  };

  const handleOpenReport = () => {
    setReportSheetVisible(true);
  };

  const handleOpenOptionsMenu = () => {
    if (isDeleting) return;

    const actions: Array<{ label: string; handler: () => void; destructive?: boolean }> = [];
    if (onEdit) {
      actions.push({ label: t('postItemEdit'), handler: () => onEdit(item) });
    }
    if (onDelete) {
      actions.push({ label: t('postItemDelete'), handler: () => void handleConfirmDelete(), destructive: true });
    }
    if (!item.isOwner) {
      actions.push({ label: t('reportAction'), handler: handleOpenReport });
    }

    if (Platform.OS === 'ios') {
      const options = [...actions.map((a) => a.label), t('postItemCancel')];
      const destructiveIndex = actions.findIndex((a) => a.destructive);
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options,
          cancelButtonIndex: options.length - 1,
          destructiveButtonIndex: destructiveIndex >= 0 ? destructiveIndex : undefined,
        },
        (idx) => { if (idx < actions.length) actions[idx]?.handler(); },
      );
    } else {
      Alert.alert(
        t('postItemOptionsTitle'),
        undefined,
        [
          ...actions.map((a) => ({
            text: a.label,
            onPress: a.handler,
            style: (a.destructive ? 'destructive' : 'default') as 'destructive' | 'default',
          })),
          { text: t('postItemCancel'), style: 'cancel' as const },
        ],
      );
    }
  };

  const handleConfirmDelete = async () => {
    if (!onDelete || isDeleting) {
      return;
    }

    setIsDeleting(true);

    try {
      await Promise.resolve(onDelete(item.id));
    } catch (error) {
      console.error(getApiErrorMessage(error, t('socialFeedDeleteError')));
      Alert.alert(t('commonErrorTitle'), t('socialFeedDeleteError'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCreateOuting = () => {
    const sourceTitle = firstLine.trim();
    if (item.Event) {
      router.push({
        pathname: '/outing',
        params: {
          title: item.Event.title,
          eventId: item.Event.id,
          placeId: item.Event.Place?.id || item.Event.placeId || undefined,
          scheduledDate: item.Event.startTime,
          sourceLabel: item.Event.title,
        },
      });
      return;
    }

    if (item.placeId) {
      router.push({
        pathname: '/outing',
        params: {
          title: sourceTitle || undefined,
          placeId: item.placeId,
          sourceLabel: sourceTitle || undefined,
        },
      });
      return;
    }

    router.push({
      pathname: '/outing',
      params: {
        title: sourceTitle || undefined,
        sourceLabel: sourceTitle || undefined,
      },
    });
  };

  const [joiningOuting, setJoiningOuting] = useState(false);
  const [joinedOuting, setJoinedOuting] = useState(false);

  const handleJoinOuting = async () => {
    if (!item.outingId || joiningOuting || joinedOuting) return;
    setJoiningOuting(true);
    try {
      await api.patch(`/outings/${item.outingId}/respond`, { status: 'accepted' });
      setJoinedOuting(true);
    } catch {
      // silently fail — backend endpoint may not be ready yet
    } finally {
      setJoiningOuting(false);
    }
  };

  const mediaUrls = item.images || [];

  const handleOpenMediaViewer = (index: number) => {
    if (mediaUrls.length === 0) {
      return;
    }

    setMediaViewerIndex(index);
    setMediaViewerVisible(true);
  };

  // ── Sortie Card presentation ─────────────────────────────────────────────────
  if (presentation === 'sortie') {
    const isLinkedToEvent = !!item.Event?.id;
    const isLinkedToPlace = !!(item.placeId || item.Place?.id);
    const hasEntity = isLinkedToEvent || isLinkedToPlace;

    // Entity name only from real linked entities — never from content
    const entityName = isLinkedToEvent
      ? item.Event!.title.trim()
      : isLinkedToPlace
      ? (item.Place?.name?.trim() || item.placeName?.trim() || '')
      : '';

    // Location: for events show place+city, for places show only city (avoid repeating entityName)
    const sortieLocation = isLinkedToEvent
      ? locationLabel
      : (item.cityName?.trim() || item.Event?.Place?.City?.name?.trim() || '');

    const handleNavigateToEntity = () => {
      if (isLinkedToEvent && item.Event?.id) {
        router.push({ pathname: '/event/[id]', params: { id: item.Event.id } });
      } else if (item.placeId || item.Place?.id) {
        router.push({ pathname: '/place/[id]', params: { id: (item.placeId || item.Place?.id)! } });
      }
    };

    const entityColor = isLinkedToEvent ? '#ff4757' : '#2ecc71';
    const entityIcon = isLinkedToEvent ? 'calendar-outline' : 'location-outline';
    const entityTypeLabel = isLinkedToEvent ? 'Événement' : 'Lieu';

    return (
      <View className="mx-4 mb-3 overflow-hidden rounded-3xl bg-white shadow-sm ring-1 ring-gray-100/80 dark:bg-gray-950 dark:ring-white/8">

        {/* Header: Entité en héros — seulement si entité réelle */}
        <View className="px-4 pt-4 pb-3">
          <View className="flex-row items-start justify-between">
            <TouchableOpacity
              onPress={hasEntity ? handleNavigateToEntity : undefined}
              activeOpacity={hasEntity ? 0.75 : 1}
              className="flex-1 pr-2"
            >
              {hasEntity ? (
                <View className="mb-1.5 flex-row items-center gap-1">
                  <Ionicons name={entityIcon} size={12} color={entityColor} />
                  <Text style={{ color: entityColor }} className="text-[10px] font-bold uppercase tracking-[0.22em]">
                    {entityTypeLabel}
                  </Text>
                </View>
              ) : null}
              {hasEntity ? (
                <Text className="text-[18px] font-bold leading-[22px] text-gray-900 dark:text-white" numberOfLines={2}>
                  {entityName}
                </Text>
              ) : null}
              {sortieLocation ? (
                <Text className="mt-1 text-[13px] text-gray-400 dark:text-gray-500">
                  {sortieLocation}
                </Text>
              ) : null}
            </TouchableOpacity>
            {!readOnly && (onDelete || onEdit) ? (
              <TouchableOpacity onPress={handleOpenOptionsMenu} className="p-1 -mt-0.5 -mr-1">
                <Ionicons name="ellipsis-horizontal" size={18} color={isDark ? '#555' : '#bbb'} />
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Strip photos compact */}
        {mediaUrls.length > 0 ? (
          <View className="flex-row gap-1 px-4">
            {mediaUrls.slice(0, 3).map((url, i) => (
              <TouchableOpacity
                key={i}
                onPress={() => handleOpenMediaViewer(i)}
                activeOpacity={0.85}
                className="flex-1 overflow-hidden rounded-2xl"
                style={{ height: mediaUrls.length === 1 ? 200 : 120 }}
              >
                <Image
                  source={{ uri: getImageUrl(url) || url }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="cover"
                />
                {i === 2 && mediaUrls.length > 3 ? (
                  <View className="absolute inset-0 items-center justify-center bg-black/50">
                    <Text className="text-xl font-bold text-white">+{mediaUrls.length - 3}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        {/* Texte du post */}
        {rawContent ? (
          <View className={`px-4 ${hasEntity || mediaUrls.length > 0 ? 'pt-3' : 'pt-0'}`}>
            <Text
              className="text-[14px] leading-[20px] text-gray-600 dark:text-gray-300"
              numberOfLines={isContentExpanded ? undefined : (hasEntity ? 3 : 5)}
            >
              {rawContent}
            </Text>
            {rawContent.length > (hasEntity ? 120 : 180) ? (
              <TouchableOpacity
                onPress={() => setIsContentExpanded((v) => !v)}
                className="mt-1"
              >
                <Text className="text-[12px] font-semibold text-[#4c669f] dark:text-[#b9c8f2]">
                  {isContentExpanded ? t('postItemShowLess') : t('postItemShowMore')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}

        {/* Footer: auteur + date + engagement */}
        <View className="flex-row items-center justify-between px-4 pb-4 pt-3">
          <TouchableOpacity
            className="flex-row items-center gap-2"
            onPress={() => item.userId ? router.push({ pathname: '/user/[id]', params: { id: item.userId } }) : undefined}
            activeOpacity={0.7}
          >
            <Image source={{ uri: avatarUri }} className="h-7 w-7 rounded-full" resizeMode="cover" />
            <View>
              <Text className="text-[12px] font-semibold text-gray-800 dark:text-gray-100" numberOfLines={1}>
                {authorLabel}
              </Text>
              <Text className="text-[11px] text-gray-400 dark:text-gray-500">
                {relativeDateLabel}
              </Text>
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center gap-3">
            <TouchableOpacity className="flex-row items-center gap-1" onPress={readOnly ? undefined : handleLike}>
              <Ionicons
                name={isLiked ? 'heart' : 'heart-outline'}
                size={18}
                color={isLiked ? '#ff4757' : isDark ? '#666' : '#bbb'}
              />
              {likesCount > 0 ? (
                <Text className={`text-[12px] font-semibold ${isLiked ? 'text-[#ff4757]' : 'text-gray-400 dark:text-gray-500'}`}>
                  {likesCount}
                </Text>
              ) : null}
            </TouchableOpacity>

            <TouchableOpacity className="flex-row items-center gap-1" onPress={() => onComment?.(item)}>
              <Ionicons name="chatbubble-ellipses-outline" size={17} color={isDark ? '#666' : '#bbb'} />
              {commentsCount > 0 ? (
                <Text className="text-[12px] font-semibold text-gray-400 dark:text-gray-500">{commentsCount}</Text>
              ) : null}
            </TouchableOpacity>

            {!readOnly && isPlanPost && item.outingId && !item.isOwner ? (
              <TouchableOpacity
                onPress={() => void handleJoinOuting()}
                disabled={joiningOuting || joinedOuting}
                className={`rounded-full px-3 py-1.5 ${joinedOuting ? 'bg-[#2ecc71]' : 'bg-[#ff4757]'}`}
              >
                {joiningOuting ? (
                  <ActivityIndicator size={10} color="#fff" />
                ) : (
                  <Text className="text-[11px] font-bold text-white">
                    {joinedOuting ? "J'y vais ✓" : 'Rejoindre'}
                  </Text>
                )}
              </TouchableOpacity>
            ) : !readOnly && hasEntity ? (
              <TouchableOpacity
                onPress={hasEntity ? handleNavigateToEntity : handleCreateOuting}
                className="rounded-full px-3 py-1.5"
                style={{ backgroundColor: entityColor + '18' }}
              >
                <Text style={{ color: entityColor }} className="text-[11px] font-bold">
                  Voir
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        <PostMediaViewer
          visible={mediaViewerVisible}
          mediaUrls={mediaUrls}
          initialIndex={mediaViewerIndex}
          onClose={() => setMediaViewerVisible(false)}
        />
        <ReportReasonSheet
          visible={reportSheetVisible}
          onClose={() => setReportSheetVisible(false)}
          onSubmitReason={handleSubmitReportReason}
        />
      </View>
    );
  }

  return (
    <View
      className={`overflow-hidden bg-white shadow-sm ring-1 ring-gray-100/70 dark:bg-black dark:ring-white/10 ${
        isInstagramPresentation ? '' : 'mx-4'
      } ${
        isInstagramPresentation ? 'rounded-none' : 'rounded-3xl'
      }`}
    >
      <View className={showDateColumn ? 'flex-row' : ''}>
        {showDateColumn ? (
          <View
            className={`w-20 items-center justify-center px-2 py-6 ${visibilityTone.column}`}
          >
            {item.visibility !== 'public' ? (
              <Text
                className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${visibilityTone.label}`}
              >
                {visibilityLabel}
              </Text>
            ) : null}
            <Text className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
              {dayLabel}
            </Text>
            <Text className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-300">
              {monthLabel}
            </Text>
            <View className="mt-2 rounded-full bg-white/70 px-2 py-1 dark:bg-gray-900/40">
              <Text className="text-[10px] font-semibold text-gray-600 dark:text-gray-200">
                {timeLabel}
              </Text>
            </View>
          </View>
        ) : null}

        <View className="flex-1 px-4 pt-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <Image
                source={{ uri: authorAvatarUri }}
                className="h-9 w-9 rounded-full mr-3"
              />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                  {authorLabel}
                </Text>
                {!showDateColumn ? (
                  <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {relativeDateLabel} · {timeLabel}
                  </Text>
                ) : null}
              </View>
            </View>

            {!readOnly && (onDelete || onEdit) && (
              <TouchableOpacity
                testID="post-options-button"
                onPress={handleOpenOptionsMenu}
                className="p-2 -mr-2"
              >
                <Ionicons
                  name="ellipsis-horizontal"
                  size={20}
                  color={isDark ? '#fff' : '#333'}
                />
              </TouchableOpacity>
            )}
          </View>

          {item.images && item.images.length > 0 ? (
            <PostMediaGallery
              mediaUrls={item.images}
              shouldPlayMedia={shouldPlayMedia}
              compactLayout={isInstagramPresentation}
              onPressMedia={handleOpenMediaViewer}
            />
          ) : null}

          <View className={isInstagramPresentation ? 'mt-3' : 'mt-4'}>
            {isInstagramPresentation ? (
              <>
                {rawContent ? (
                  <Text
                    className="text-[15px] leading-6 text-gray-700 dark:text-gray-200"
                    numberOfLines={isContentExpanded ? undefined : 4}
                    ellipsizeMode="tail"
                  >
                    {rawContent}
                  </Text>
                ) : (
                  <Text className="text-[15px] leading-6 text-gray-700 dark:text-gray-200">
                    {titleText}
                  </Text>
                )}

                {hasExpandableContent ? (
                  <TouchableOpacity
                    onPress={() => setIsContentExpanded((current) => !current)}
                    className="mt-2 self-start"
                  >
                    <Text className="text-sm font-semibold text-[#4c669f] dark:text-[#b9c8f2]">
                      {isContentExpanded ? t('postItemShowLess') : t('postItemShowMore')}
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </>
            ) : (
              <>
                <Text className="text-xl font-bold text-gray-900 dark:text-white">
                  {titleText}
                </Text>

                {bodyExcerpt ? (
                  <Text className="mt-2 text-base leading-6 text-gray-600 dark:text-gray-300">
                    {bodyExcerpt}
                  </Text>
                ) : null}
              </>
            )}

            {isOfficialPost ? (
              <View className="mt-2 self-start rounded-full bg-[#1f7aec]/10 px-2.5 py-1">
                <Text className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1f7aec]">
                  {t('postPublicationScopeStructureBadge')}
                </Text>
              </View>
            ) : null}

            {eventLabel ? (
              <View className="mt-2 self-start rounded-full bg-[#ff4757]/10 px-2.5 py-1">
                <Text className="text-[10px] font-semibold text-[#ff4757]">
                  {eventLabel}
                </Text>
              </View>
            ) : null}

            {locationLabel ? (
              <View className="mt-2 flex-row items-center">
                <Ionicons
                  name="location-outline"
                  size={14}
                  color={visibilityTone.accent}
                />
                <Text className="ml-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {locationLabel}
                </Text>
              </View>
            ) : null}

            {categoryLabel ? (
              <View className={`mt-2 self-start rounded-full px-2.5 py-1 ${visibilityTone.column}`}>
                <Text className={`text-[10px] font-semibold ${visibilityTone.label}`}>
                  {categoryLabel}
                </Text>
              </View>
            ) : null}
          </View>

          <View className="mt-4 flex-row items-center justify-between pb-4">
            <View className="flex-row">
              <TouchableOpacity
                className="flex-row items-center mr-5"
                onPress={readOnly ? undefined : handleLike}
              >
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isLiked ? '#ff4757' : isDark ? '#aaa' : '#666'}
                />
                <Text
                  className={`ml-1.5 text-sm font-semibold ${
                    isLiked ? 'text-[#ff4757]' : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {likesCount}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center"
                onPress={() => onComment?.(item)}
              >
                <Ionicons
                  name="chatbubble-ellipses-outline"
                  size={20}
                  color={isDark ? '#aaa' : '#666'}
                />
                <Text className="ml-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {commentsCount}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center ml-5"
                onPress={() => onShare?.(item)}
              >
                <Ionicons
                  name="share-social-outline"
                  size={20}
                  color={isDark ? '#aaa' : '#666'}
                />
                <Text className="ml-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {shareCount}
                </Text>
              </TouchableOpacity>
            </View>

            {!readOnly && isPlanPost && item.outingId && !item.isOwner ? (
              <TouchableOpacity
                onPress={() => void handleJoinOuting()}
                disabled={joiningOuting || joinedOuting}
                className={`rounded-full px-3 py-2 ${joinedOuting ? 'bg-[#2ecc71]' : 'bg-[#ff4757]'}`}
              >
                {joiningOuting ? (
                  <ActivityIndicator size={12} color="#fff" />
                ) : (
                  <Text className="text-xs font-semibold text-white">
                    {joinedOuting ? "J'y vais ✓" : "Rejoindre"}
                  </Text>
                )}
              </TouchableOpacity>
            ) : !readOnly && isPlanPost && (item.placeId || item.eventId || item.Event) ? (
              <TouchableOpacity
                onPress={handleCreateOuting}
                className="rounded-full bg-[#4c669f] px-3 py-2"
              >
                <Text className="text-xs font-semibold text-white">
                  {t('profileOrganizeOutingCta')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </View>

      <ReportReasonSheet
        visible={reportSheetVisible}
        onClose={() => setReportSheetVisible(false)}
        onSubmitReason={handleSubmitReportReason}
      />

      <PostMediaViewer
        visible={mediaViewerVisible}
        mediaUrls={mediaUrls}
        initialIndex={mediaViewerIndex}
        onClose={() => setMediaViewerVisible(false)}
      />
    </View>
  );
}

export default memo(PostItem);
