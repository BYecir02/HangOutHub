import React, { memo } from 'react';

import PlacePublicationCard from '@/features/places/components/PlacePublicationCard';
import MasonryGrid from '@/shared/ui/MasonryGrid';
import type { PostDetails } from '@/services/social/posts';

function estimatePublicationCardHeight(post: PostDetails, index: number) {
  const imageHeights = [184, 240, 208, 262, 194, 228];
  const contentLength = (post.content || '').trim().length;
  const mediaHeight = imageHeights[index % imageHeights.length];
  const textBonus = Math.min(64, Math.max(0, Math.floor(contentLength / 4)));
  const mediaBonus = post.images && post.images.length > 0 ? 124 : 96;

  return mediaHeight + mediaBonus + textBonus;
}

function PlacePublicationsMasonry({
  posts,
  onPressPost,
  activePostId,
  registerLayout,
  containerOffsetY = 0,
}: {
  posts: PostDetails[];
  onPressPost: (post: PostDetails) => void;
  activePostId?: string | null;
  registerLayout: (id: string, layout: { y: number; height: number }) => void;
  containerOffsetY?: number;
}) {
  const imageHeights = [184, 240, 208, 262, 194, 228];

  if (posts.length === 0) {
    return null;
  }

  return (
    <MasonryGrid
      key={`place-publications-grid-${containerOffsetY}`}
      items={posts}
      getKey={(post) => post.id}
      estimateItemHeight={(post, index) => estimatePublicationCardHeight(post, index)}
      onItemLayout={(post, layout) => {
        registerLayout(post.id, {
          y: layout.y + containerOffsetY,
          height: layout.height,
        });
      }}
      renderItem={(post, index) => (
        <PlacePublicationCard
          post={post}
          imageHeight={imageHeights[index % imageHeights.length]}
          shouldPlay={activePostId === post.id}
          onPress={() => onPressPost(post)}
        />
      )}
    />
  );
}

export default memo(PlacePublicationsMasonry);
