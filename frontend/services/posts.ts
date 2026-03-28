import api from '@/services/api';

export interface PostAuthor {
  id: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface PostDetails {
  id: string;
  userId: string;
  content?: string | null;
  images?: string[];
  postType?: 'post' | 'plan';
  placeId?: string | null;
  eventId?: string | null;
  placeName?: string | null;
  cityName?: string | null;
  ambiance?: string | null;
  visibilityUserIds?: string[] | null;
  visibility?: 'public' | 'friends' | 'private' | 'custom';
  createdAt?: string;
  shareCount?: number | null;
  User?: PostAuthor;
  Place?: {
    id?: string;
    name?: string | null;
    coverUrl?: string | null;
    City?: {
      name?: string | null;
    } | null;
  } | null;
  Event?: {
    id: string;
    title: string;
    startTime: string;
    placeId?: string | null;
    coverUrl?: string | null;
    images?: string[] | null;
    Place?: {
      id?: string;
      name?: string | null;
      coverUrl?: string | null;
      City?: {
        name?: string | null;
      } | null;
    } | null;
  } | null;
  _count?: {
    likes?: number;
    comments?: number;
  };
  isLiked?: boolean;
  isOwner?: boolean;
}

export async function getPostById(id: string) {
  const response = await api.get<PostDetails>(`/posts/${id}`);
  return response.data;
}

export async function trackPostShare(id: string) {
  const response = await api.post<{ shareCount?: number }>(`/posts/${id}/share`);
  return response.data;
}
