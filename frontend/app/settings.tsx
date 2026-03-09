import React from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import api, { storage } from '@/services/api';
import { Ionicons } from '@expo/vector-icons';

export default function SettingsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const iconColor = isDark ? '#fff' : '#333';
  const chevronColor = isDark ? '#555' : '#ccc';

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
              // 1. Logout backend (invalider la session)
              await api.post('/auth/logout').catch(() => {});
              // 2. Supprimer le token et les infos locales
              await storage.removeItem('userToken');
              await storage.removeItem('userInfo');
              // 3. Rediriger vers la page de connexion (index)
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

  const handleDeleteAccount = () => {
    Alert.alert(
      "Supprimer mon compte",
      "Cette action est irréversible. Toutes vos données seront effacées.",
      [
        { text: "Annuler", style: "cancel" },
        { 
          text: "Supprimer définitivement", 
          style: "destructive", 
          onPress: async () => {
            try {
              await api.delete('/users/me');
              await storage.removeItem('userToken');
              await storage.removeItem('userInfo');
              router.replace('/');
              Alert.alert("Compte supprimé", "Votre compte a été supprimé avec succès.");
            } catch (error) {
              console.error(error);
              Alert.alert("Erreur", "Impossible de supprimer le compte.");
            }
          }
        }
      ]
    );
  };

  return (
    <ScrollView className="flex-1 bg-gray-50 dark:bg-black">
      <View className="p-5">
        
        {/* Section Compte */}
        <Text className="text-gray-500 dark:text-gray-400 font-bold mb-2 uppercase text-xs tracking-wider">Compte</Text>
        <View className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden mb-6">
          <TouchableOpacity className="flex-row items-center p-4 border-b border-gray-100 dark:border-gray-800">
            <Ionicons name="notifications-outline" size={22} color={iconColor} />
            <Text className="flex-1 ml-3 text-gray-700 dark:text-white text-base">Notifications</Text>
            <Ionicons name="chevron-forward" size={20} color={chevronColor} />
          </TouchableOpacity>
          
          <TouchableOpacity className="flex-row items-center p-4">
            <Ionicons name="lock-closed-outline" size={22} color={iconColor} />
            <Text className="flex-1 ml-3 text-gray-700 dark:text-white text-base">Confidentialité & Sécurité</Text>
            <Ionicons name="chevron-forward" size={20} color={chevronColor} />
          </TouchableOpacity>
        </View>

        {/* Section Application */}
        <Text className="text-gray-500 dark:text-gray-400 font-bold mb-2 uppercase text-xs tracking-wider">Application</Text>
        <View className="bg-white dark:bg-gray-900 rounded-xl overflow-hidden mb-6">
          <TouchableOpacity className="flex-row items-center p-4">
            <Ionicons name="help-circle-outline" size={22} color={iconColor} />
            <Text className="flex-1 ml-3 text-gray-700 dark:text-white text-base">Aide & Support</Text>
            <Ionicons name="chevron-forward" size={20} color={chevronColor} />
          </TouchableOpacity>
        </View>

        {/* Bouton Déconnexion */}
        <TouchableOpacity onPress={handleLogout} className="flex-row items-center justify-center bg-gray-200 dark:bg-gray-800 p-4 rounded-xl border border-gray-300 dark:border-gray-700 mt-4">
          <Ionicons name="log-out-outline" size={22} color={isDark ? "#fff" : "#333"} />
          <Text className="ml-2 text-gray-800 dark:text-white font-bold text-base">Se déconnecter</Text>
        </TouchableOpacity>

        {/* Zone Danger */}
        <View className="mt-8">
             <Text className="text-red-500 font-bold mb-2 uppercase text-xs tracking-wider">Zone Danger</Text>
             <TouchableOpacity onPress={handleDeleteAccount} className="flex-row items-center justify-center bg-red-50 dark:bg-red-900/20 p-4 rounded-xl border border-red-100 dark:border-red-900/50">
                <Ionicons name="trash-outline" size={22} color="#ff4757" />
                <Text className="ml-2 text-red-600 font-bold text-base">Supprimer mon compte</Text>
             </TouchableOpacity>
        </View>
        
        <Text className="text-center text-gray-400 mt-8 text-xs">Hangout Hub v1.0.0</Text>
      </View>
    </ScrollView>
  );
}