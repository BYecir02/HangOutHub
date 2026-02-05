import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// On utilise la variable d'environnement EXPO_PUBLIC_API_URL
// Si elle n'est pas définie, on utilise l'IP locale par défaut (utile pour le dev rapide)
export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';
const API_URL = `${BASE_URL}/api/v1`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Intercepteur pour ajouter le token JWT à chaque requête
api.interceptors.request.use(
  async (config) => {
    const token = await SecureStore.getItemAsync('userToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Helper pour corriger les URLs des images (remplace localhost par l'IP)
export const getImageUrl = (url: string | null | undefined) => {
  if (!url) return null;
  
  // Si l'URL contient '/uploads/', c'est une image de notre serveur
  // On force l'utilisation de l'URL de base actuelle pour éviter les problèmes d'IP
  if (url.includes('/uploads/')) {
    const path = url.substring(url.indexOf('/uploads/'));
    return `${BASE_URL}${path}`;
  }
  
  // Sinon (ex: https://images.unsplash.com...), on retourne tel quel
  return url;
};

export default api;