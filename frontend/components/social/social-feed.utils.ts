export type MergeMode = 'prepend' | 'append';

export type FeedLikePost = {
  id: string;
  images?: string[] | null;
  createdAt?: string | null;
  [key: string]: unknown;
};

export type PrefetchUrlOptions = {
  resolveImageUrl?: (uri: string) => string;
  isVideoUrl?: (uri: string) => boolean;
  beforeCount?: number;
  afterCount?: number;
};

const defaultIsVideoUrl = (uri: string) => /\.(mp4|mov|m4v|webm|avi|mkv)(\?.*)?$/i.test(uri);

const getCreatedAtTime = (value: unknown) => {
  if (typeof value !== 'string' || !value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isFinite(time) ? time : 0;
};

export function getFeedPostCreatedAtTime<T extends FeedLikePost>(post: T) {
  return getCreatedAtTime(post.createdAt);
}

export function getLatestFeedPostCreatedAtTime<T extends FeedLikePost>(posts: T[]) {
  return posts.reduce((latest, post) => Math.max(latest, getFeedPostCreatedAtTime(post)), 0);
}

export function splitFeedPostsBySeenAt<T extends FeedLikePost>(
  posts: T[],
  seenAt: number | null,
) {
  const threshold = seenAt ?? 0;
  const seenPosts: T[] = [];
  const unseenPosts: T[] = [];

  posts.forEach((post) => {
    if (getFeedPostCreatedAtTime(post) > threshold) {
      unseenPosts.push(post);
      return;
    }

    seenPosts.push(post);
  });

  return { seenPosts, unseenPosts };
}

const compareFeedPosts = <T extends FeedLikePost>(left: T, right: T) => {
  const leftTime = getCreatedAtTime(left.createdAt);
  const rightTime = getCreatedAtTime(right.createdAt);

  if (leftTime !== rightTime) {
    return rightTime - leftTime;
  }

  return right.id.localeCompare(left.id);
};

export function mergeFeedPosts<T extends FeedLikePost>(
  incoming: T[],
  current: T[],
  mode: MergeMode = 'prepend',
) {
  const currentById = new Map(current.map((post) => [post.id, post] as const));

  const mergePost = (post: T): T => ({
    ...currentById.get(post.id),
    ...post,
    images: post.images ?? currentById.get(post.id)?.images ?? [],
  });

  if (mode === 'append') {
    const next = current.map(mergePost);
    const seen = new Set(current.map((post) => post.id));

    incoming.forEach((post) => {
      if (!seen.has(post.id)) {
        next.push(mergePost(post));
        seen.add(post.id);
      }
    });

    return next.sort(compareFeedPosts);
  }

  const next = incoming.map(mergePost);
  const seen = new Set(incoming.map((post) => post.id));

  current.forEach((post) => {
    if (!seen.has(post.id)) {
      next.push(mergePost(post));
      seen.add(post.id);
    }
  });

  return next.sort(compareFeedPosts);
}

export function collectPrefetchUrls<T extends FeedLikePost>(
  posts: T[],
  activeId: string | null,
  options: PrefetchUrlOptions = {},
) {
  if (posts.length === 0) {
    return [] as string[];
  }

  const resolveImageUrl = options.resolveImageUrl ?? ((uri: string) => uri);
  const isVideo = options.isVideoUrl ?? defaultIsVideoUrl;
  const activeIndex = activeId ? posts.findIndex((post) => post.id === activeId) : 0;
  const beforeCount = options.beforeCount ?? 1;
  const afterCount = options.afterCount ?? 1;
  const start = Math.max(0, activeIndex - beforeCount);
  const end = Math.min(posts.length - 1, activeIndex + afterCount);

  const urls: string[] = [];

  for (let index = start; index <= end; index += 1) {
    const post = posts[index];
    const mediaUrl = (post.images || [])
      .map((uri) => resolveImageUrl(uri))
      .find((uri) => Boolean(uri) && !isVideo(uri));

    if (mediaUrl) {
      urls.push(mediaUrl);
    }
  }

  return Array.from(new Set(urls));
}