import React, { memo, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, TouchableOpacity, View } from 'react-native';

import Avatar from '@/shared/ui/primitives/Avatar';
import MediaFrame from '@/shared/ui/MediaFrame';
import { useI18n } from '@/shared/hooks/use-i18n';
import api, { getImageUrl } from '@/services/api';
import { isVideoUrl } from '@/services/shared/media';
import type { PostDetails } from '@/services/social/posts';

const DEFAULT_AVATAR = 'https://i.pravatar.cc/150';

function formatPublicationDate(value: string | undefined, locale: string) {
  if (!value) {
    return '';
  }

  const createdAtDate = new Date(value);
  if (Number.isNaN(createdAtDate.getTime())) {
    return '';
  }

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
    return createdAtDate.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (diffDays === 1) {
    return createdAtDate.toLocaleDateString(locale, {
      day: '2-digit',
      month: 'short',
    });
  }

  return createdAtDate.toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

type PlacePublicationCardProps = {
  post: PostDetails;
  imageHeight: number;
  shouldPlay: boolean;
  onPress: () => void;
};

function PlacePublicationCard({
  post,
  imageHeight,
  shouldPlay,
  onPress,
}: PlacePublicationCardProps) {
  const { locale, t } = useI18n();
  const mediaUrls = post.images || [];
  const mediaUrl = mediaUrls.length > 0 ? getImageUrl(mediaUrls[0]) || '' : '';
  const isVideo = mediaUrl ? isVideoUrl(mediaUrl) : false;
  const isStructurePublication =
    post.publicationScope === 'structure' &&
    Boolean(post.Place?.name?.trim());
  const authorLabel =
    post.User?.displayName || post.User?.username || t('postItemUserFallback');
  const authorAvatarUri = getImageUrl(post.User?.avatarUrl) || DEFAULT_AVATAR;
  const likesCount = post._count?.likes || 0;
  const createdAtLabel = formatPublicationDate(post.createdAt, locale);
  const content = (post.content || '').trim();
  const summary =
    content.length > 160 ? `${content.slice(0, 157)}...` : content;
  const [isLiked, setIsLiked] = useState(Boolean(post.isLiked));
  const [localLikesCount, setLocalLikesCount] = useState(likesCount);
  const [isTogglingLike, setIsTogglingLike] = useState(false);

  useEffect(() => {
    setIsLiked(Boolean(post.isLiked));
    setLocalLikesCount(post._count?.likes || 0);
    setIsTogglingLike(false);
  }, [post._count?.likes, post.id, post.isLiked]);

  const handleLike = async () => {
    if (isTogglingLike) {
      return;
    }

    const previousLiked = isLiked;
    const previousCount = localLikesCount;

    setIsTogglingLike(true);
    setIsLiked(!previousLiked);
    setLocalLikesCount((count) =>
      previousLiked ? Math.max(0, count - 1) : count + 1,
    );

    try {
      await api.post(`/posts/${post.id}/like`);
    } catch {
      setIsLiked(previousLiked);
      setLocalLikesCount(previousCount);
    } finally {
      setIsTogglingLike(false);
    }
  };

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 overflow-hidden rounded-[30px] border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <View className="relative">
        {mediaUrl ? (
          <MediaFrame
            source={mediaUrl}
            mediaType={isVideo ? 'video' : 'image'}
            className="w-full bg-gray-200 dark:bg-gray-800"
            style={{ height: imageHeight }}
            adaptiveHeight={false}
            shouldPlay={shouldPlay && isVideo}
            muted
            loop
            showControls={false}
            contentFit="cover"
          />
        ) : (
          <View
            className="w-full justify-between bg-gray-100 px-4 py-4 dark:bg-gray-800"
            style={{ height: imageHeight }}
          >
            <View className="flex-row items-start justify-between">
              <View className="rounded-full bg-white/80 px-3 py-1.5 dark:bg-black/20">
                <Text className="text-[10px] font-semibold uppercase tracking-[0.14em] text-gray-700 dark:text-gray-200">
                  {t('postItemPlanFallback')}
                </Text>
              </View>
              <Ionicons name="image-outline" size={18} color="#9ca3af" />
            </View>

            <View className="items-start">
              <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                {authorLabel}
              </Text>
              {summary ? (
                <Text
                  className="mt-2 text-sm leading-6 text-gray-600 dark:text-gray-300"
                  numberOfLines={5}
                >
                  {summary}
                </Text>
              ) : null}
            </View>
          </View>
        )}

        <View className="absolute right-3 top-3">
          <TouchableOpacity
            onPress={(event) => {
              event.stopPropagation();
              void handleLike();
            }}
            disabled={isTogglingLike}
            className={`h-9 w-9 items-center justify-center rounded-2xl border shadow-lg ${
              isLiked
                ? 'border-[#ff4757]/25 bg-rose-50/95 dark:bg-rose-900/20'
                : 'border-white/80 bg-white/95 dark:border-gray-700 dark:bg-gray-800'
            }`}
            accessibilityRole="button"
            accessibilityLabel={isLiked ? 'Retirer le like' : 'Aimer la publication'}
          >
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={18}
              color={isLiked ? '#ff4757' : '#4c669f'}
            />
          </TouchableOpacity>
        </View>

        {isStructurePublication ? (
          <View className="absolute left-3 top-3 rounded-full bg-black/55 px-3 py-1.5">
            <Text className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white">
              {t('postPublicationScopeStructureBadge')}
            </Text>
          </View>
        ) : null}

        {mediaUrls.length > 1 ? (
          <View className="absolute bottom-3 left-3 rounded-full bg-black/55 px-2.5 py-1">
            <Text className="text-[10px] font-semibold text-white">
              +{mediaUrls.length - 1}
            </Text>
          </View>
        ) : null}

        <View className="absolute bottom-3 right-3 flex-row items-center rounded-full bg-black/55 px-2.5 py-1.5">
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={10}
            color={isLiked ? '#ff4757' : '#fff'}
          />
          <Text className="ml-1 text-[10px] font-semibold text-white">
            {localLikesCount}
          </Text>
        </View>

        {isVideo ? (
          <View className="absolute inset-0 items-center justify-center">
            <View className="rounded-full bg-black/45 p-3">
              <Ionicons name="play" size={18} color="#fff" />
            </View>
          </View>
        ) : null}
      </View>

      <View className="p-4">
        <View className="flex-row items-start justify-between gap-3">
          <View className="flex-1 flex-row items-center">
            <Avatar
              uri={authorAvatarUri}
              label={authorLabel}
              size={34}
              borderWidth={1}
              borderColor="rgba(255, 255, 255, 0.75)"
            />
            <View className="ml-3 flex-1">
              <Text
                className="text-sm font-semibold text-gray-900 dark:text-white"
                numberOfLines={1}
              >
                {authorLabel}
              </Text>
              {createdAtLabel ? (
                <Text className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {createdAtLabel}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {mediaUrl && summary ? (
          <Text
            className="mt-3 text-sm leading-6 text-gray-600 dark:text-gray-300"
            numberOfLines={4}
          >
            {summary}
          </Text>
        ) : null}

        {!mediaUrl && isStructurePublication ? (
          <View className="mt-3 self-start rounded-full bg-[#1f7aec]/10 px-2.5 py-1">
            <Text className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#1f7aec]">
              {t('postPublicationScopeStructureBadge')}
            </Text>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default memo(PlacePublicationCard);
