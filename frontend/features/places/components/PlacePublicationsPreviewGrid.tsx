import React, { memo } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, Text, View } from 'react-native';

import Avatar from '@/components/ui/primitives/Avatar';
import MasonryGrid from '@/components/ui/MasonryGrid';
import MediaFrame from '@/components/ui/MediaFrame';
import { useI18n } from '@/hooks/use-i18n';
import { getImageUrl } from '@/services/api';
import { isVideoUrl } from '@/services/media';
import type { PostDetails } from '@/services/posts';

const DEFAULT_AVATAR = 'https://i.pravatar.cc/150';

function estimatePreviewCardHeight(post: PostDetails, index: number) {
  const imageHeights = [140, 164, 152, 176];
  const contentLength = (post.content || '').trim().length;
  const mediaHeight = imageHeights[index % imageHeights.length];
  const textBonus = Math.min(40, Math.max(0, Math.floor(contentLength / 6)));
  const mediaBonus = post.images && post.images.length > 0 ? 56 : 72;

  return mediaHeight + mediaBonus + textBonus;
}

function PlacePublicationPreviewCard({
  post,
  imageHeight,
  onPress,
}: {
  post: PostDetails;
  imageHeight: number;
  onPress: () => void;
}) {
  const { t } = useI18n();
  const mediaUrls = post.images || [];
  const mediaUrl = mediaUrls.length > 0 ? getImageUrl(mediaUrls[0]) || '' : '';
  const isVideo = mediaUrl ? isVideoUrl(mediaUrl) : false;
  const authorLabel =
    post.User?.displayName || post.User?.username || t('postItemUserFallback');
  const authorAvatarUri = getImageUrl(post.User?.avatarUrl) || DEFAULT_AVATAR;
  const likesCount = post._count?.likes || 0;
  const content = (post.content || '').trim();
  const contentPreview =
    content.length > 80 ? `${content.slice(0, 77)}...` : content;

  return (
    <Pressable
      onPress={onPress}
      className="mb-3 overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900"
    >
      <View className="relative">
        {mediaUrl ? (
          <MediaFrame
            source={mediaUrl}
            mediaType={isVideo ? 'video' : 'image'}
            className="w-full bg-gray-200 dark:bg-gray-800"
            style={{ height: imageHeight }}
            adaptiveHeight={false}
            shouldPlay={false}
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
              <Ionicons name="document-text-outline" size={18} color="#9ca3af" />
            </View>

            {contentPreview ? (
              <View className="pb-10">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white" numberOfLines={1}>
                  {authorLabel}
                </Text>
                <Text
                  className="mt-2 text-sm leading-5 text-gray-600 dark:text-gray-300"
                  numberOfLines={3}
                >
                  {contentPreview}
                </Text>
              </View>
            ) : null}
          </View>
        )}

        {mediaUrls.length > 1 ? (
          <View className="absolute right-2 top-2 rounded-full bg-black/55 px-2 py-1">
            <Text className="text-[10px] font-semibold text-white">
              +{mediaUrls.length - 1}
            </Text>
          </View>
        ) : null}

        {isVideo ? (
          <View className="absolute inset-0 items-center justify-center">
            <View className="rounded-full bg-black/45 p-3">
              <Ionicons name="play" size={18} color="#fff" />
            </View>
          </View>
        ) : null}

        <View className="absolute bottom-2 left-2 right-2 flex-row items-center justify-between rounded-full bg-black/55 px-2.5 py-2">
          <View className="flex-1 flex-row items-center min-w-0">
            <Avatar
              uri={authorAvatarUri}
              label={authorLabel}
              size={22}
              borderWidth={1}
              borderColor="rgba(255, 255, 255, 0.75)"
            />
            <Text className="ml-2 flex-1 text-[10px] font-semibold text-white" numberOfLines={1}>
              {authorLabel}
            </Text>
          </View>

          <View className="ml-2 flex-row items-center rounded-full bg-white/15 px-2 py-1">
            <Ionicons name="heart" size={10} color="#ff4757" />
            <Text className="ml-1 text-[10px] font-semibold text-white">
              {likesCount}
            </Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

function PlacePublicationsPreviewGrid({
  posts,
  onPressPost,
}: {
  posts: PostDetails[];
  onPressPost: (post: PostDetails) => void;
}) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <MasonryGrid
      items={posts}
      getKey={(post) => post.id}
      estimateItemHeight={(post, index) => estimatePreviewCardHeight(post, index)}
      renderItem={(post, index) => (
        <PlacePublicationPreviewCard
          post={post}
          imageHeight={[140, 164, 152, 176][index % 4]}
          onPress={() => onPressPost(post)}
        />
      )}
    />
  );
}

export default memo(PlacePublicationsPreviewGrid);
