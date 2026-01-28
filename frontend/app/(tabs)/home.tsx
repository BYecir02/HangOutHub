import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import api from '../../services/api'; 
import CategoryCard from '../../components/ui/CategoryCard';
import EventCard from '../../components/ui/EventCard';
import SuggestionCard from '../../components/ui/SuggestionCard';
import PlaceCard from '../../components/ui/PlaceCard'; // <--- Import du nouveau composant
import Header from '../../components/ui/Header';
import { Category } from '@/types';

// --- MOCK DATA : LIEUX POPULAIRES (Plus de choix !) ---
const POPULAR_PLACES = [
  {
    id: 'p1',
    name: 'Le Code Bar',
    location: 'Haie Vive',
    imageUrl: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=400',
    rating: 4.8
  },
  {
    id: 'p2',
    name: 'Dream Beach',
    location: 'Fidjrossè',
    imageUrl: 'https://images.unsplash.com/photo-1575444758702-4a6b9222336e?w=400',
    rating: 4.5
  },
  {
    id: 'p3',
    name: 'Bab\'s Dock',
    location: 'Abomey-Calavi',
    imageUrl: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400',
    rating: 4.9
  },
  {
    id: 'p4',
    name: 'Canal Olympia',
    location: 'Wologuèdè',
    imageUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400',
    rating: 4.2
  },
  {
    id: 'p5',
    name: 'Moussa l\'Africain',
    location: 'Ganhi',
    imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400',
    rating: 4.6
  }
];

// --- MOCK DATA : À LA UNE ---
const FEATURED_EVENTS = [
  {
    id: '1',
    title: 'Concert Dadju & Tayc',
    date: 'SAM. 24 JUIN • 20:00',
    location: 'Palais des Congrès',
    imageUrl: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1000',
    price: 'Payant'
  },
  {
    id: '2',
    title: 'Afterwork Tech Bénin',
    date: 'VEN. 23 JUIN • 18:30',
    location: 'Sèmè City',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1000',
    price: 'Gratuit'
  },
];

// --- MOCK DATA : SUGGESTIONS ---
const SUGGESTIONS = [
  {
    id: '101',
    title: 'Soirée Salsa & Kizomba',
    category: 'Danse • Le Code Bar',
    date: 'Ce soir • 21:00',
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    reason: 'Parce que tu aimes la Danse'
  },
  {
    id: '102',
    title: 'Vernissage Expo "Vodun"',
    category: 'Art & Culture • Fondation Zinsou',
    date: 'Demain • 10:00',
    image: 'https://images.unsplash.com/photo-1536924940846-227afb31e2a5?q=80&w=800',
    reason: 'Populaire chez tes amis'
  }
];

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
    <ScrollView className="flex-1 bg-gray-50 dark:bg-black" showsVerticalScrollIndicator={false}>
      
      {/* --- HEADER --- */}
      <Header 
        onNotificationPress={() => console.log("Notifs")} 
        onSearchPress={() => router.push('/search')}
      />

      {/* --- 1. CATÉGORIES --- */}
      <View className="mt-6">
        <Text className="text-lg font-bold text-gray-800 dark:text-white ml-5 mb-4">Catégories</Text>
        {loading ? (
          <ActivityIndicator size="large" color="#4c669f" className="mt-4" />
        ) : (
          <FlatList
            data={categories}
            renderItem={({ item }) => (
              <CategoryCard category={item} onPress={() => console.log(item.name)} />
            )}
            keyExtractor={(item) => item.id.toString()}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20 }}
          />
        )}
      </View>

      {/* --- 2. À LA UNE 🔥 --- */}
      <View className="mt-8">
        <View className="flex-row justify-between items-end mb-4 px-5">
          <Text className="text-lg font-bold text-gray-800 dark:text-white">À la une 🔥</Text>
          <TouchableOpacity onPress={() => router.push('/explore')}>
            <Text className="text-[#4c669f] font-medium text-xs">Voir tout</Text>
          </TouchableOpacity>
        </View>
        
        <FlatList 
          data={FEATURED_EVENTS}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          renderItem={({ item }) => (
            <EventCard 
              title={item.title}
              date={item.date}
              location={item.location}
              imageUrl={item.imageUrl}
              price={item.price}
              onPress={() => console.log('Event', item.title)}
            />
          )}
        />
      </View>

      {/* --- 3. LIEUX POPULAIRES 📍 (Mise à jour) --- */}
      <View className="mt-8">
        {/* En-tête avec bouton Voir tout */}
        <View className="flex-row justify-between items-end mb-4 px-5">
          <Text className="text-lg font-bold text-gray-800 dark:text-white">Lieux populaires 📍</Text>
          <TouchableOpacity onPress={() => router.push('/place')}>
            <Text className="text-[#4c669f] font-medium text-xs">Voir tout</Text>
          </TouchableOpacity>
        </View>
        
        {/* Liste horizontale des Lieux avec le composant réutilisable */}
        <FlatList 
          className='pb-4'
          data={POPULAR_PLACES}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          renderItem={({ item }) => (
            <PlaceCard 
              name={item.name}
              location={item.location}
              imageUrl={item.imageUrl}
              rating={item.rating}
              onPress={() => console.log('Lieu', item.name)}
            />
          )}
        />
      </View>

      {/* --- 4. RECOMMANDÉ POUR TOI ✨ (Mise à jour) --- */}
      <View className="mt-8 px-5 pb-24">
        <View className="flex-row justify-between items-end mb-4">
            <View className="flex-row items-center">
                <Text className="text-lg font-bold text-gray-800 dark:text-white">Recommandé pour toi ✨</Text>
            </View>
            <TouchableOpacity onPress={() => console.log('Voir recommandations')}>
                <Text className="text-[#4c669f] font-medium text-xs">Voir tout</Text>
            </TouchableOpacity>
        </View>

        {SUGGESTIONS.map((item) => (
          <SuggestionCard 
            key={item.id}
            title={item.title}
            category={item.category}
            date={item.date}
            image={item.image}
            reason={item.reason}
            onPress={() => console.log("Suggestion clic")}
          />
        ))}
      </View>

    </ScrollView>
  );
}