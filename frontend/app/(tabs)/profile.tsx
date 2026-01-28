import React, { useState, useCallback } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, Modal, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useFocusEffect } from 'expo-router';
import Tabs from '../../components/ui/Tabs';
import api from '../../services/api';

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('sorties');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  useFocusEffect(
    useCallback(() => {
    const fetchUserProfile = async () => {
      try {
        const response = await api.get('/users/me');
        setUser(response.data);
      } catch (error) {
        console.error("Erreur lors de la récupération du profil:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserProfile();
    }, [])
  );

  const tabItems = [
    { id: 'sorties', label: 'Mes Sorties' },
    { id: 'photos', label: 'Photos' },
    { id: 'avis', label: 'Avis' },
  ];

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black" showsVerticalScrollIndicator={false}>
      
      {/* 1. Couverture & Profil */}
      <View className="h-48 bg-gray-200 dark:bg-gray-800">
        <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewImage(user?.coverUrl || 'https://images.unsplash.com/photo-1557683316-973673baf926')}>
          <Image 
            source={{ uri: user?.coverUrl || 'https://images.unsplash.com/photo-1557683316-973673baf926' }} 
            className="w-full h-full"
          />
        </TouchableOpacity>
        
        {/* Photo de profil avec badge caméra */}
        <View className="absolute -bottom-12 left-5">
          <View className="p-1 bg-white dark:bg-black rounded-full shadow-sm relative">
            <TouchableOpacity activeOpacity={0.9} onPress={() => setPreviewImage(user?.avatarUrl || 'https://i.pravatar.cc/150')}>
              <Image 
                source={{ uri: user?.avatarUrl || 'https://i.pravatar.cc/150' }} 
                className="w-24 h-24 rounded-full"
              />
            </TouchableOpacity>
            {/* Petit bouton pour changer la photo */}
            <TouchableOpacity className="absolute bottom-0 right-0 bg-blue-500 p-1.5 rounded-full border-2 border-white dark:border-black">
              <Ionicons name="camera" size={14} color="white" />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* 2. Infos Utilisateur */}
      <View className="mt-14 px-5">
        <View className="flex-row justify-between items-start">
          <View>
            <Text className="text-2xl font-bold text-gray-900 dark:text-white">{user?.displayName || user?.username || 'Utilisateur'}</Text>
            <Text className="text-gray-500 dark:text-gray-400 font-medium">@{user?.username || 'user'}</Text>
          </View>
          {/* Icône Paramètres (Settings) en haut à droite */}
          <TouchableOpacity 
            className="bg-gray-50 dark:bg-gray-800 p-2 rounded-full border border-gray-100 dark:border-gray-700"
            onPress={() => router.push('/settings')}
          >
            <Ionicons name="settings-outline" size={24} color={isDark ? "#fff" : "#333"} />
          </TouchableOpacity>
        </View>
        
        <Text className="mt-3 text-gray-700 dark:text-gray-300 leading-5">
          {user?.bio || "Aucune biographie pour le moment."}
        </Text>

        {/* --- BOUTONS ACTIONS --- */}
        <View className="flex-row mt-4 gap-3">
          <TouchableOpacity 
            className="flex-1 bg-gray-100 dark:bg-gray-800 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 items-center active:bg-gray-200 dark:active:bg-gray-700"
            onPress={() => router.push('/edit-profile')}
          >
            <Text className="text-gray-800 dark:text-white font-bold text-sm">Modifier le profil</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-1 bg-gray-100 dark:bg-gray-800 py-2.5 rounded-lg border border-gray-200 dark:border-gray-700 items-center active:bg-gray-200 dark:active:bg-gray-700"
            onPress={() => router.push('/preferences')}
          >
            <Text className="text-gray-800 dark:text-white font-bold text-sm">Modifier ses préférences</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* 3. Statistiques */}
      <View className="flex-row justify-around mt-6 py-4 border-y border-gray-100 dark:border-gray-800">
        <TouchableOpacity className="items-center">
          <Text className="font-bold text-lg text-gray-900 dark:text-white">124</Text>
          <Text className="text-gray-400 dark:text-gray-500 text-xs">Abonnés</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center border-x border-gray-100 dark:border-gray-800 px-10">
          <Text className="font-bold text-lg text-gray-900 dark:text-white">89</Text>
          <Text className="text-gray-400 dark:text-gray-500 text-xs">Abonnements</Text>
        </TouchableOpacity>
        <TouchableOpacity className="items-center">
          <Text className="font-bold text-lg text-gray-900 dark:text-white">12</Text>
          <Text className="text-gray-400 dark:text-gray-500 text-xs">Sorties</Text>
        </TouchableOpacity>
      </View>

      {/* 4. Actions rapides */}
      <View className="flex-row px-5 mt-6 justify-between">
        <TouchableOpacity className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl items-center w-[48%] border border-blue-100 dark:border-blue-900/50 active:bg-blue-100">
          <Ionicons name="ticket-outline" size={26} color="#4c669f" />
          <Text className="text-blue-800 font-bold mt-1">Mes Tickets</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl items-center w-[48%] border border-red-100 dark:border-red-900/50 active:bg-red-100">
          <Ionicons name="heart-outline" size={26} color="#ff4757" />
          <Text className="text-red-800 font-bold mt-1">Favoris</Text>
        </TouchableOpacity>
      </View>

      {/* 5. ONGLETS DE CONTENU (TABS) */}
      <View className="mt-8 pb-10">
        <Tabs 
          items={tabItems} 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />

        {/* CONTENU DYNAMIQUE DES ONGLETS */}
        <View className="p-5 min-h-[200px]">
          {activeTab === 'sorties' && (
            <View className="items-center justify-center py-10">
              <Ionicons name="calendar-outline" size={48} color={isDark ? "#333" : "#eee"} />
              <Text className="text-gray-400 dark:text-gray-600 mt-2">Aucune sortie prévue</Text>
            </View>
          )}

          {activeTab === 'photos' && (
            <View className="flex-row flex-wrap justify-between">
              {[1, 2, 3].map((i) => (
                <View key={i} className="w-[31%] aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg mb-2" />
              ))}
            </View>
          )}

          {activeTab === 'avis' && (
            <View>
              <Text className="text-gray-400 italic text-center py-10">Aucun avis laissé.</Text>
            </View>
          )}
        </View>
      </View>

      {/* MODAL DE PRÉVISUALISATION D'IMAGE */}
      <Modal visible={!!previewImage} transparent={true} onRequestClose={() => setPreviewImage(null)} animationType="fade">
        <View className="flex-1 bg-black justify-center items-center">
          <TouchableOpacity 
            className="absolute top-12 right-5 z-10 p-2 bg-gray-800/50 rounded-full"
            onPress={() => setPreviewImage(null)}
          >
            <Ionicons name="close" size={28} color="white" />
          </TouchableOpacity>
          
          {previewImage && (
            <Image 
              source={{ uri: previewImage }} 
              style={{ width: '100%', height: '100%' }}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </ScrollView>
  );
}