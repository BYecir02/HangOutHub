import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, useColorScheme } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import SearchBar from '../components/ui/SearchBar';

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="flex-1 bg-white dark:bg-black pt-16">
      {/* Header simple avec retour */}
      <View className="flex-row items-center px-5 pb-4">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color={isDark ? "white" : "black"} />
        </TouchableOpacity>
        <Text className="text-xl font-bold text-gray-900 dark:text-white">Recherche</Text>
      </View>

      {/* Barre de recherche */}
      <SearchBar 
        value={query} 
        onChangeText={setQuery} 
        autoFocus={true}
        placeholder="Événements, lieux, amis..."
      />

      <ScrollView className="flex-1 px-5 mt-6" showsVerticalScrollIndicator={false}>
        {/* Contenu vide ou résultats */}
        {query.length === 0 ? (
          <View>
            <Text className="text-gray-500 dark:text-gray-400 font-bold mb-3 uppercase text-xs tracking-wider">Recherches récentes</Text>
            {['Concert Dadju', 'Plage Fidjrossè', 'Karaoké'].map((item, index) => (
              <TouchableOpacity key={index} className="flex-row items-center py-4 border-b border-gray-100 dark:border-gray-800">
                <Ionicons name="time-outline" size={20} color="#9ca3af" />
                <Text className="ml-3 text-gray-700 dark:text-gray-300 text-base">{item}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View className="items-center mt-10">
             <Text className="text-gray-500 dark:text-gray-400">Recherche de "{query}"...</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}