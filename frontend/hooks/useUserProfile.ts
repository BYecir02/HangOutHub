// c:\Users\Lenovo\Desktop\Git\HangOutHub\HangOutHub\frontend\hooks\useUserProfile.ts
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import api from '../services/api';

interface User {
  id: number;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  // ... other user properties
}

interface Post {
  id: string;
  content: string;
  images: string[];
  isLiked: boolean;
  _count?: {
    likes: number;
    comments: number;
  };
  // ... other post properties
}
export function useUserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async () => {
    try{
      // 1. Récupérer le profil
      const userRes = await api.get('/users/me');
      setUser(userRes.data);

      // 2. Récupérer les posts de l'utilisateur
      if (userRes.data?.id) {
          const postsRes = await api.get(`/posts/user/${userRes.data.id}`);
          setPosts(postsRes.data);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du profil:",error);
      //optionally display an error message to the user here.
    } finally {
      setLoading(false);
    }
  };

  const deletePost = async (postId: string) => {
    try {
      await api.delete(`/posts/${postId}`);
      // Mise à jour optimiste : on retire le post de la liste locale immédiatement
      setPosts((currentPosts) => currentPosts.filter((p) => p.id !== postId));
    } catch (error) {
      console.error("Erreur suppression post:", error);
      throw error; // On renvoie l'erreur pour que le composant puisse afficher une alerte
    }
  };

  const updatePost = async (postId: string, content: string) => {
    try {
      await api.patch(`/posts/${postId}`, { content });
      // Mise à jour optimiste
      setPosts((currentPosts) => currentPosts.map(p => p.id === postId ? { ...p, content } : p));
    } catch (error) {
      console.error("Erreur modification post:", error);
      throw error;
    }
  };

  // Recharge les données à chaque fois qu'on revient sur l'écran
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [])
  );

  return { user, posts, loading, refetch: fetchUserProfile, deletePost, updatePost };
}
