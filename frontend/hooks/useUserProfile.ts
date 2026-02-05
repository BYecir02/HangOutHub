// c:\Users\Lenovo\Desktop\Git\HangOutHub\HangOutHub\frontend\hooks\useUserProfile.ts
import { useState, useCallback } from 'react';
import { useFocusEffect } from 'expo-router';
import api from '../services/api';

export function useUserProfile() {
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async () => {
    try {
      // 1. Récupérer le profil
      const userRes = await api.get('/users/me');
      setUser(userRes.data);

      // 2. Récupérer les posts de l'utilisateur
      if (userRes.data?.id) {
          const postsRes = await api.get(`/posts/user/${userRes.data.id}`);
          setPosts(postsRes.data);
      }
    } catch (error) {
      console.error("Erreur lors de la récupération du profil:", error);
    } finally {
      setLoading(false);
    }
  };

  // Recharge les données à chaque fois qu'on revient sur l'écran
  useFocusEffect(
    useCallback(() => {
      fetchUserProfile();
    }, [])
  );

  return { user, posts, loading, refetch: fetchUserProfile };
}
