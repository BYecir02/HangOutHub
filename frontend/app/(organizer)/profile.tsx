import { TouchableOpacity, Alert, View } from 'react-native';
import { ThemedView } from '@/components/themed-view';
import { ThemedText } from '@/components/themed-text';
import { useRouter } from 'expo-router';
import api, { storage } from '@/services/api'; // ✅ On importe 'api' pour appeler le backend
import { Ionicons } from '@expo/vector-icons';

export default function OrganizerProfile() {
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert(
      "Déconnexion",
      "Voulez-vous vraiment vous déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Déconnexion", 
          style: "destructive", 
          onPress: async () => {
            try {
              // 1. 🌍 BACKEND : On prévient le serveur (Invalide la session en BDD)
              await api.post('/auth/logout');
            } catch (error) {
              console.log("Erreur logout backend (peut-être déjà expiré)", error);
            } finally {
              // 2. 📱 FRONTEND : On nettoie le téléphone quoi qu'il arrive
              await storage.removeItem('userToken');
              await storage.removeItem('userInfo');
              
              // 3. 🚀 REDIRECTION : Retour à la case départ
              router.replace('/');
            }
          }
        }
      ]
    );
  };

  return (
    <ThemedView style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
      <View style={{ marginBottom: 40, alignItems: 'center' }}>
        <View style={{ width: 100, height: 100, borderRadius: 50, backgroundColor: '#e5e7eb', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
           <Ionicons name="storefront" size={50} color="#4b5563" />
        </View>
        <ThemedText type="title">Ma Vitrine</ThemedText>
        <ThemedText style={{ textAlign: 'center', marginTop: 8, opacity: 0.7 }}>
          Gérez votre établissement et vos paramètres.
        </ThemedText>
      </View>

      <TouchableOpacity 
        onPress={handleLogout}
        style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#ef4444', paddingVertical: 16, paddingHorizontal: 32, borderRadius: 12, shadowColor: '#ef4444', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 4, elevation: 4 }}
      >
        <Ionicons name="log-out-outline" size={24} color="white" style={{ marginRight: 12 }} />
        <ThemedText style={{ color: 'white', fontWeight: 'bold', fontSize: 16 }}>Se déconnecter</ThemedText>
      </TouchableOpacity>
    </ThemedView>
  );
}
