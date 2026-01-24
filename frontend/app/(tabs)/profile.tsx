import React, { useState } from 'react'; // Ajout de useState
import { View, Text, Image, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const [activeTab, setActiveTab] = useState('sorties'); // État pour l'onglet actif

  return (
    <ScrollView className="flex-1 bg-white" showsVerticalScrollIndicator={false}>
      {/* 1. Couverture & Profil */}
      <View className="h-48 bg-gray-200">
        <Image 
          source={{ uri: 'https://images.unsplash.com/photo-1557683316-973673baf926' }} 
          className="w-full h-full"
        />
        <View className="absolute -bottom-12 left-5">
          <View className="p-1 bg-white rounded-full shadow-sm">
            <Image 
              source={{ uri: 'https://i.pravatar.cc/150' }} 
              className="w-24 h-24 rounded-full"
            />
          </View>
        </View>
      </View>

      {/* 2. Infos Utilisateur */}
      <View className="mt-14 px-5">
        <View className="flex-row justify-between items-center">
          <View>
            <Text className="text-2xl font-bold text-gray-900">Jean Dupont</Text>
            <Text className="text-gray-500 font-medium">@jdupont229</Text>
          </View>
          <TouchableOpacity className="bg-gray-100 p-2 rounded-full active:bg-gray-200">
            <Ionicons name="settings-outline" size={24} color="black" />
          </TouchableOpacity>
        </View>
        
        <Text className="mt-3 text-gray-700 leading-5">
          Passionné par la culture Béninoise. Toujours partant pour un resto ou un concert live ! 🇧🇯
        </Text>
      </View>

      {/* 3. Statistiques */}
      <View className="flex-row justify-around mt-6 py-4 border-y border-gray-100">
        <View className="items-center">
          <Text className="font-bold text-lg text-gray-900">124</Text>
          <Text className="text-gray-400 text-xs">Abonnés</Text>
        </View>
        <View className="items-center border-x border-gray-100 px-10">
          <Text className="font-bold text-lg text-gray-900">89</Text>
          <Text className="text-gray-400 text-xs">Abonnements</Text>
        </View>
        <View className="items-center">
          <Text className="font-bold text-lg text-gray-900">12</Text>
          <Text className="text-gray-400 text-xs">Sorties</Text>
        </View>
      </View>

      {/* 4. Actions rapides */}
      <View className="flex-row px-5 mt-6 justify-between">
        <TouchableOpacity className="bg-blue-50 p-4 rounded-2xl items-center w-[48%] border border-blue-100 active:bg-blue-100">
          <Ionicons name="ticket-outline" size={26} color="#4c669f" />
          <Text className="text-blue-800 font-bold mt-1">Mes Tickets</Text>
        </TouchableOpacity>
        <TouchableOpacity className="bg-red-50 p-4 rounded-2xl items-center w-[48%] border border-red-100 active:bg-red-100">
          <Ionicons name="heart-outline" size={26} color="#ff4757" />
          <Text className="text-red-800 font-bold mt-1">Favoris</Text>
        </TouchableOpacity>
      </View>

      {/* 5. ONGLETS DE CONTENU (TABS) */}
      <View className="mt-8">
        <View className="flex-row border-b border-gray-100 px-5">
          <TouchableOpacity 
            onPress={() => setActiveTab('sorties')}
            className={`pb-3 mr-8 ${activeTab === 'sorties' ? 'border-b-2 border-[#4c669f]' : ''}`}
          >
            <Text className={`font-bold ${activeTab === 'sorties' ? 'text-[#4c669f]' : 'text-gray-400'}`}>Mes Sorties</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setActiveTab('photos')}
            className={`pb-3 mr-8 ${activeTab === 'photos' ? 'border-b-2 border-[#4c669f]' : ''}`}
          >
            <Text className={`font-bold ${activeTab === 'photos' ? 'text-[#4c669f]' : 'text-gray-400'}`}>Photos</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => setActiveTab('avis')}
            className={`pb-3 ${activeTab === 'avis' ? 'border-b-2 border-[#4c669f]' : ''}`}
          >
            <Text className={`font-bold ${activeTab === 'avis' ? 'text-[#4c669f]' : 'text-gray-400'}`}>Avis</Text>
          </TouchableOpacity>
        </View>

        {/* CONTENU DYNAMIQUE DES ONGLETS */}
        <View className="p-5 min-h-[200px]">
          {activeTab === 'sorties' && (
            <View className="items-center justify-center py-10">
              <Ionicons name="calendar-outline" size={48} color="#eee" />
              <Text className="text-gray-400 mt-2">Aucune sortie prévue pour le moment</Text>
            </View>
          )}

          {activeTab === 'photos' && (
            <View className="flex-row flex-wrap justify-between">
              {/* Placeholder pour les photos */}
              {[1, 2, 3].map((i) => (
                <View key={i} className="w-[31%] aspect-square bg-gray-100 rounded-lg mb-2" />
              ))}
            </View>
          )}

          {activeTab === 'avis' && (
            <View>
              <Text className="text-gray-400 italic text-center py-10">Vous n'avez pas encore laissé d'avis.</Text>
            </View>
          )}
        </View>
      </View>
    </ScrollView>
  );
}