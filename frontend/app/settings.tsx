import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();

  const handleLogout = async () => {
    Alert.alert(
      "Déconnexion",
      "Es-tu sûr de vouloir te déconnecter ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Se déconnecter",
          style: "destructive",
          onPress: async () => {
            try {
              // 1. Supprimer le token
              await SecureStore.deleteItemAsync('userToken');
              // 2. Rediriger vers la page de connexion (index)
              router.replace('/');
            } catch (error) {
              console.error("Erreur lors de la déconnexion:", error);
              Alert.alert("Erreur", "Impossible de se déconnecter.");
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="p-5">
        
        {/* Section Compte */}
        <Text className="text-gray-500 font-bold mb-2 uppercase text-xs tracking-wider">Compte</Text>
        <View className="bg-white rounded-xl overflow-hidden mb-6">
          <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100">
            <Ionicons name="notifications-outline" size={22} color="#333" />
            <Text className="flex-1 ml-3 text-gray-700 text-base">Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
          
          <TouchableOpacity className="flex-row items-center p-4">
            <Ionicons name="lock-closed-outline" size={22} color="#333" />
            <Text className="flex-1 ml-3 text-gray-700 text-base">Confidentialité & Sécurité</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Section Application */}
        <Text className="text-gray-500 font-bold mb-2 uppercase text-xs tracking-wider">Application</Text>
        <View className="bg-white rounded-xl overflow-hidden mb-6">
          <TouchableOpacity className="flex-row items-center p-4">
            <Ionicons name="help-circle-outline" size={22} color="#333" />
            <Text className="flex-1 ml-3 text-gray-700 text-base">Aide & Support</Text>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* Bouton Déconnexion */}
        <TouchableOpacity onPress={handleLogout} className="flex-row items-center justify-center bg-red-50 p-4 rounded-xl border border-red-100 mt-4">
          <Ionicons name="log-out-outline" size={22} color="#ff4757" />
          <Text className="ml-2 text-red-600 font-bold text-base">Se déconnecter</Text>
        </TouchableOpacity>
        
        <Text className="text-center text-gray-400 mt-8 text-xs">Hangout Hub v1.0.0</Text>
      </View>
    </ScrollView>
  );
}