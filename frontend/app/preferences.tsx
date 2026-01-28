import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';

// --- DONNÉES INTELLIGENTES (MOCK) ---
// On simule une structure : Catégorie -> Top 10 Tags
const DATA = [
  {
    id: 'cat_night',
    name: 'Nightlife & Fête 🌙',
    tags: [
      { id: 1, name: 'Afrobeats' },
      { id: 2, name: 'Chill' },
      { id: 3, name: 'VIP' },
      { id: 4, name: 'Rooftop' },
      { id: 5, name: 'Karaoké' },
      { id: 6, name: 'Hookah' },
    ]
  },
  {
    id: 'cat_food',
    name: 'Manger & Boire 🍔',
    tags: [
      { id: 7, name: 'Maquis' },
      { id: 8, name: 'Gastronomique' },
      { id: 9, name: 'Fast-food' },
      { id: 10, name: 'Brunch' },
      { id: 11, name: 'Pizza' },
      { id: 12, name: 'Fruits de mer' },
    ]
  },
  {
    id: 'cat_sport',
    name: 'Sport & Bien-être ⚽',
    tags: [
      { id: 13, name: 'Football' },
      { id: 14, name: 'Fitness' },
      { id: 15, name: 'Yoga' },
      { id: 16, name: 'Running' },
      { id: 17, name: 'Plage' },
    ]
  }
];

export default function PreferencesScreen() {
  const router = useRouter();
  
  // On stocke juste les ID des tags sélectionnés (c'est ça qu'on enverra au backend)
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [saving, setSaving] = useState(false);

  // --- LOGIQUE ---

  const toggleTag = (tagId: number) => {
    if (selectedTags.includes(tagId)) {
      setSelectedTags(prev => prev.filter(id => id !== tagId));
    } else {
      setSelectedTags(prev => [...prev, tagId]);
    }
  };

  const handleSave = () => {
    if (selectedTags.length < 3) {
      Alert.alert("Hop hop !", "Sélectionne au moins 3 tags pour qu'on puisse te proposer du bon contenu 😉");
      return;
    }
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      Alert.alert("C'est noté ! ✅", "Ton flux d'actualité va être mis à jour.", [
        { text: "Super", onPress: () => router.back() }
      ]);
    }, 1500);
  };

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      
      {/* HEADER */}
      <View className="bg-white dark:bg-black shadow-sm z-10">
        <View className="flex-row justify-between items-center px-5 pt-16 pb-4 border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-black z-10">
            <TouchableOpacity onPress={() => router.back()}>
            <Text className="text-gray-500 text-lg">Annuler</Text>
            </TouchableOpacity>
            <Text className="text-lg font-bold text-gray-800 dark:text-white">Tes goûts</Text>
            <TouchableOpacity onPress={handleSave} disabled={saving}>
            {saving ? (
                <ActivityIndicator size="small" color="#4c669f" />
            ) : (
                <Text className={`font-bold text-lg ${selectedTags.length >= 3 ? 'text-[#4c669f]' : 'text-gray-300'}`}>
                Enregistrer
                </Text>
            )}
            </TouchableOpacity>
        </View>

      </View>

      <ScrollView className="flex-1 px-5 pt-6" showsVerticalScrollIndicator={false}>
        
        {/* BOUCLE SUR LES CATÉGORIES */}
        {DATA.map((category) => (
          <View key={category.id} className="mb-6 bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            {/* Titre Catégorie */}
            <View className="flex-row items-center mb-4">
              <View className="h-6 w-1 bg-[#4c669f] rounded-full mr-3" />
              <Text className="text-lg font-bold text-gray-800 dark:text-white">
                {category.name}
              </Text>
            </View>

            {/* Nuage de Tags (Chips) */}
            <View className="flex-row flex-wrap">
              {category.tags
                .map((tag) => {
                const isSelected = selectedTags.includes(tag.id);
                return (
                  <TouchableOpacity
                    key={tag.id}
                    onPress={() => toggleTag(tag.id)}
                    activeOpacity={0.7}
                    className={`mr-2 mb-2 px-4 py-2.5 rounded-full border ${
                      isSelected 
                        ? 'bg-[#4c669f] border-[#4c669f]' 
                        : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                    }`}
                  >
                    <Text className={`font-medium text-sm ${isSelected ? 'text-white' : 'text-gray-600 dark:text-gray-300'}`}>
                      {isSelected ? '✓ ' : ''}{tag.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        {/* Espace vide en bas pour ne pas être caché par le bouton */}
        <View className="h-10" />
      </ScrollView>
    </View>
  );
}