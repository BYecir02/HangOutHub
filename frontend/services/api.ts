import axios from 'axios';

// ⚠️ REMPLACE PAR TON ADRESSE IP QUE TU AS TROUVÉE AVEC IPCONFIG
// Garde bien le port :3000 et le /api/v1
const API_URL = 'http://192.168.1.26:3000/api/v1'; 

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export default api;