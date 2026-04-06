import React, { memo, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';
import BottomSheetModal from '@/components/ui/BottomSheetModal';
import ReportReasonSheet from '@/components/ui/ReportReasonSheet';
import PostMediaGallery from './PostMediaGallery';
import PostMediaViewer from './PostMediaViewer';

import api, { getApiErrorMessage, getImageUrl } from '../../services/api';
import { createReport } from '../../services/reports';

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
  presentation?: 'thread' | 'instagram';
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
  const [optionsSheetVisible, setOptionsSheetVisible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reportSheetVisible, setReportSheetVisible] = useState(false);
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
  const isInstagramPresentation = presentation === 'instagram';

  useEffect(() => {
    setIsLiked(Boolean(item.isLiked));
    setLikesCount(item._count?.likes || 0);
    setCommentsCount(item._count?.comments || 0);
  }, [item._count?.comments, item._count?.likes, item.isLiked]);

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
    setOptionsSheetVisible(false);
    setReportSheetVisible(true);
  };

  const handleOpenOptionsMenu = () => {
    if (isDeleting) {
      return;
    }

    setOptionsSheetVisible(true);
  };

  const handleDeletePress = () => {
    setOptionsSheetVisible(false);
    void handleConfirmDelete();
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

  const mediaUrls = item.images || [];

  const handleOpenMediaViewer = (index: number) => {
    if (mediaUrls.length === 0) {
      return;
    }

    setMediaViewerIndex(index);
    setMediaViewerVisible(true);
  };

  return (
    <View
      className={`overflow-hidden bg-white shadow-sm ring-1 ring-gray-100/70 dark:bg-gray-900 dark:ring-gray-800/70 ${
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

            {(onDelete || onEdit) && (
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
            <Text className={`${isInstagramPresentation ? 'text-lg' : 'text-xl'} font-bold text-gray-900 dark:text-white`}>
              {titleText}
            </Text>

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

            {bodyExcerpt ? (
              <Text className="mt-2 text-base leading-6 text-gray-600 dark:text-gray-300">
                {bodyExcerpt}
              </Text>
            ) : null}
          </View>

          <View className="mt-4 flex-row items-center justify-between pb-4">
            <View className="flex-row">
              <TouchableOpacity
                className="flex-row items-center mr-5"
                onPress={handleLike}
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

            {isPlanPost && (item.placeId || item.eventId || item.Event) ? (
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

      <BottomSheetModal
        visible={optionsSheetVisible}
        onClose={() => setOptionsSheetVisible(false)}
        title={t('postItemOptionsTitle')}
        subtitle={t('postItemOptionsSubtitle')}
        contentMode="auto"
        maxHeight={360}
      >
        <View className="gap-3">
          {onEdit ? (
            <TouchableOpacity
              onPress={() => {
                setOptionsSheetVisible(false);
                onEdit(item);
              }}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
            >
              <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {t('postItemEdit')}
              </Text>
            </TouchableOpacity>
          ) : null}

          {onDelete ? (
            <TouchableOpacity
              testID="post-delete-button"
              onPress={handleDeletePress}
              disabled={isDeleting}
              className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 dark:border-rose-900/40 dark:bg-rose-900/20"
            >
              {isDeleting ? (
                <View className="flex-row items-center gap-2">
                  <ActivityIndicator color="#e11d48" size="small" />
                  <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">
                    Suppression...
                  </Text>
                </View>
              ) : (
                <Text className="text-sm font-semibold text-rose-600 dark:text-rose-300">
                  {t('postItemDelete')}
                </Text>
              )}
            </TouchableOpacity>
          ) : null}

          {!item.isOwner ? (
            <TouchableOpacity
              onPress={handleOpenReport}
              className="rounded-2xl border border-gray-200 bg-white px-4 py-3 dark:border-gray-700 dark:bg-gray-800"
            >
              <Text className="text-sm font-semibold text-gray-800 dark:text-gray-100">
                {t('reportAction')}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            onPress={() => setOptionsSheetVisible(false)}
            className="items-center rounded-2xl border border-gray-300 bg-white px-4 py-3 dark:border-gray-600 dark:bg-gray-900"
          >
            <Text className="text-sm font-semibold text-gray-700 dark:text-gray-200">
              {t('postItemCancel')}
            </Text>
          </TouchableOpacity>
        </View>
      </BottomSheetModal>

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
