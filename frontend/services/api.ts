import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// ⚠️ REMPLACE PAR TON ADRESSE IP QUE TU AS TROUVÉE AVEC IPCONFIG
// Garde bien le port :3000 et le /api/v1
const API_URL = 'http://192.168.1.26:3000/api/v1'; 

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

export default api;