import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';

import api from '../services/api';
import { setStoredUserSession } from '@/services/user-session';

const debugProfileError = (context: string, error: unknown) => {
  if (!__DEV__) {
    return;
  }

  console.warn(`[useUserProfile] ${context}`, error);
};

export interface OwnedPlace {
  id: string;
  name: string;
  coverUrl?: string | null;
  address?: string | null;
  avgRating?: number | null;
  City?: {
    id: number;
    name: string;
  } | null;
}

export interface OrganizerEvent {
  id: string;
  title: string;
  startTime: string;
  endTime?: string | null;
  coverUrl?: string | null;
  entryFee?: number | string | null;
  Place?: {
    id: string;
    name?: string | null;
    address?: string | null;
  } | null;
}

export interface SavedPlace {
  id: string;
  name: string;
  coverUrl?: string | null;
  address?: string | null;
  avgRating?: number | null;
  City?: {
    id: number;
    name: string;
  } | null;
}

export interface UserProfile {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  role?: string;
  followersCount?: number | null;
  followingCount?: number | null;
  OrganizerProfile?: {
    companyName: string;
    jobTitle: string;
    accountType?: string;
    status?: string;
  } | null;
  OwnedPlaces?: OwnedPlace[];
  hasPlace?: boolean;
}

export interface UserPost {
  id: string;
  content: string;
  images: string[];
  isLiked: boolean;
  visibility?: 'public' | 'friends' | 'private' | 'custom';
  createdAt?: string;
  User?: {
    username?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  };
  _count?: {
    likes: number;
    comments: number;
  };
}

export interface UserOuting {
  id: string;
  title: string;
  scheduledDate: string;
  status?: string | null;
  Place?: {
    id: string;
    name?: string | null;
    address?: string | null;
    coverUrl?: string | null;
    City?: {
      id: number;
      name: string;
    } | null;
  } | null;
  _count?: {
    OutingParticipant?: number;
  };
}

export function useUserProfile() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [posts, setPosts] = useState<UserPost[]>([]);
  const [outings, setOutings] = useState<UserOuting[]>([]);
  const [savedPlaces, setSavedPlaces] = useState<SavedPlace[]>([]);
  const [organizerEvents, setOrganizerEvents] = useState<OrganizerEvent[]>([]);
  const [connectionsCount, setConnectionsCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);

  const fetchUserProfile = useCallback(async () => {
    const isRefresh = hasLoaded;

    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError(null);

    try {
      const userRes = await api.get<UserProfile>('/users/me');
      const currentUser = userRes.data;
      const isOrganizer =
        currentUser.role === 'ORGANIZER' || currentUser.role === 'PLACE_OWNER';

      setUser(currentUser);
      await setStoredUserSession(currentUser);

      if (currentUser.id) {
        const [postsRes, outingsRes, savedPlacesRes, friendshipsRes] =
          await Promise.all([
            api.get<UserPost[]>(`/posts/user/${currentUser.id}`),
            api.get<UserOuting[]>('/outings/mine'),
            api.get<SavedPlace[]>('/places/saved/mine'),
            api.get<{
              counts?: {
                connections?: number;
              };
            }>('/friendships/mine'),
          ]);

        setPosts(postsRes.data);
        setOutings(outingsRes.data);
        setSavedPlaces(savedPlacesRes.data);
        setConnectionsCount(friendshipsRes.data.counts?.connections || 0);
      } else {
        setPosts([]);
        setOutings([]);
        setSavedPlaces([]);
        setConnectionsCount(0);
      }

      if (isOrganizer) {
        const eventsRes = await api.get<OrganizerEvent[]>('/events/mine');
        setOrganizerEvents(eventsRes.data);
      } else {
        setOrganizerEvents([]);
      }
    } catch (error) {
      debugProfileError('fetchUserProfile failed', error);
      setError('PROFILE_LOAD_FAILED');
      if (!isRefresh) {
        setUser(null);
        setPosts([]);
        setOutings([]);
        setSavedPlaces([]);
        setOrganizerEvents([]);
        setConnectionsCount(0);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
      setHasLoaded(true);
    }
  }, [hasLoaded]);

  const deletePost = async (postId: string) => {
    try {
      await api.delete(`/posts/${postId}`);
      setPosts((currentPosts) => currentPosts.filter((p) => p.id !== postId));
    } catch (error) {
      debugProfileError('deletePost failed', error);
      throw error;
    }
  };

  const updatePost = async (postId: string, content: string) => {
    try {
      await api.patch(`/posts/${postId}`, { content });
      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId ? { ...post, content } : post,
        ),
      );
    } catch (error) {
      debugProfileError('updatePost failed', error);
      throw error;
    }
  };

  useFocusEffect(
    useCallback(() => {
      void fetchUserProfile();
    }, [fetchUserProfile]),
  );

  return {
    user,
    posts,
    outings,
    savedPlaces,
    organizerEvents,
    ownedPlaces: user?.OwnedPlaces || [],
    connectionsCount,
    loading,
    refreshing,
    error,
    refetch: fetchUserProfile,
    deletePost,
    updatePost,
  };
}
