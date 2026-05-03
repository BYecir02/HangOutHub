export type PostChangedPayload = {
  id: string;
  content?: string | null;
  images?: string[] | null;
  publicationScope?: 'personal' | 'structure';
  postType?: 'post' | 'plan';
  placeId?: string | null;
  eventId?: string | null;
  placeName?: string | null;
  cityName?: string | null;
  ambiance?: string | null;
  visibility?: 'public' | 'friends' | 'private' | 'custom';
  visibilityUserIds?: string[] | null;
  createdAt?: string;
  updatedAt?: string;
  shareCount?: number | null;
  isLiked?: boolean;
  isOwner?: boolean;
  _count?: {
    likes?: number;
    comments?: number;
  };
};

type Listener = (payload: PostChangedPayload) => void;

const listeners = new Set<Listener>();

export const subscribeToPostChanges = (listener: Listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const emitPostChanged = (payload: PostChangedPayload) => {
  listeners.forEach((listener) => {
    listener(payload);
  });
};
