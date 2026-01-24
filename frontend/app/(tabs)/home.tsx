import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as SecureStore from 'expo-secure-store';
import api from '../../services/api'; 
import CategoryCard from '../../components/ui/CategoryCard';
import SearchBar from '../../components/ui/SearchBar';
import Header from '../../components/ui/Header';
import { Category } from '@/types';

export default function HomeScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Charger les catégories depuis le backend
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await api.get('/categories');
        setCategories(response.data);
      } catch (error) {
        console.error("Erreur chargement catégories:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchCategories();
  }, []);

  return (
    <ScrollView className="flex-1 bg-gray-50" showsVerticalScrollIndicator={false}>
      
      {/* --- HEADER --- */}
      <Header 
        onNotificationPress={() => console.log("Notifications cliquées")}
      />

      {/* --- BARRE DE RECHERCHE --- */}
      <SearchBar 
        onFilterPress={() => console.log("Filtres cliqués")} 
      />

      {/* --- SECTION CATÉGORIES --- */}
      <View className="mt-6">
        <Text className="text-lg font-bold text-gray-800 ml-5 mb-4">
          Catégories
        </Text>
        
        {loading ? (
          <ActivityIndicator size="large" color="#4c669f" className="mt-4" />
        ) : (
          <FlatList
            data={categories}
            renderItem={({ item }) => (
              <CategoryCard
                category={item}
                onPress={() => console.log('Click sur', item.name)}
              />
            )}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        )}
      </View>

      {/* --- SECTION À LA UNE 🔥 --- */}
      <View className="mt-8 px-5 pb-10">
        <View className="flex-row justify-between items-end mb-4">
          <Text className="text-lg font-bold text-gray-800">
            À la une 🔥
          </Text>
          <TouchableOpacity>
            <Text className="text-blue-600 font-medium text-xs">Voir tout</Text>
          </TouchableOpacity>
        </View>
        
        <View className="bg-white h-48 rounded-3xl justify-center items-center border-2 border-dashed border-gray-200">
          <Ionicons name="calendar-outline" size={40} color="#ccc" />
          <Text className="text-gray-400 text-center mt-2 px-10">
            Les événements et carrousels arrivent bientôt...
          </Text>
        </View>
      </View>

    </ScrollView>
  );
}