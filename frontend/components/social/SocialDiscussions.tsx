import React, { useState } from 'react';
import { View, Text, TouchableOpacity, FlatList, Image } from 'react-native';
import SearchBar from '../ui/SearchBar';
import { Ionicons } from '@expo/vector-icons';

// --- MOCK DATA ---
const MOCK_DISCUSSIONS = [
  { id: '1', type: 'group', name: 'Groupe Sortie Plage', lastMessage: 'Alice: On se retrouve où ?', time: '10:30', unread: 2, avatar: null },
  { id: '2', type: 'private', name: 'Jean Dupont', lastMessage: 'Ça marche pour demain !', time: 'Hier', unread: 0, avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
  { id: '3', type: 'group', name: 'Concert Dadju', lastMessage: 'Marc: J\'ai les billets', time: 'Hier', unread: 0, avatar: null },
  { id: '4', type: 'private', name: 'Sophie Martin', lastMessage: 'Tu viens ce soir ?', time: 'Lun', unread: 1, avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200' },
];

const MOCK_REQUESTS = [
  { id: 'r1', name: 'Inconnu 1', message: 'Salut, ça va ?' },
  { id: 'r2', name: 'Spam Bot', message: 'Gagnez un iPhone !' },
];

export default function SocialDiscussions() {
  const [filter, setFilter] = useState<'all' | 'private' | 'group'>('all');
  const [showRequests, setShowRequests] = useState(false);

  // Filtrage des discussions
  const filteredDiscussions = MOCK_DISCUSSIONS.filter(d => {
    if (filter === 'all') return true;
    return d.type === filter;
  });

  // Rendu d'un élément de la liste
  const renderItem = ({ item }: { item: any }) => (
    <TouchableOpacity className="flex-row items-center bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm mb-3">
      {/* Avatar */}
      <View className={`w-12 h-12 rounded-full justify-center items-center mr-3 ${item.type === 'group' ? 'bg-blue-100 dark:bg-blue-900' : 'bg-gray-200 dark:bg-gray-700'}`}>
        {item.avatar ? (
          <Image source={{ uri: item.avatar }} className="w-full h-full rounded-full" />
        ) : (
          <Text className={`${item.type === 'group' ? 'text-blue-600 dark:text-blue-300' : 'text-gray-600 dark:text-gray-300'} font-bold text-lg`}>
            {item.name.charAt(0)}
          </Text>
        )}
      </View>
      
      {/* Contenu */}
      <View className="flex-1">
        <View className="flex-row justify-between items-center mb-1">
          <Text className="font-bold text-gray-800 dark:text-white text-base" numberOfLines={1}>{item.name}</Text>
          <Text className="text-xs text-gray-400 dark:text-gray-500">{item.time}</Text>
        </View>
        <View className="flex-row justify-between items-center">
            <Text className={`text-sm flex-1 mr-2 ${item.unread > 0 ? 'text-gray-900 dark:text-white font-semibold' : 'text-gray-500 dark:text-gray-400'}`} numberOfLines={1}>
                {item.lastMessage}
            </Text>
            {item.unread > 0 && (
                <View className="bg-[#4c669f] w-5 h-5 rounded-full justify-center items-center">
                    <Text className="text-white text-[10px] font-bold">{item.unread}</Text>
                </View>
            )}
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View className="flex-1">
        <View className="mt-4">
          <SearchBar placeholder="Rechercher une discussion..." />
        </View>

        {/* FILTRES */}
        <View className="flex-row px-5 my-4 gap-2">
            <FilterPill label="Tous" active={filter === 'all'} onPress={() => setFilter('all')} />
            <FilterPill label="Privés" active={filter === 'private'} onPress={() => setFilter('private')} />
            <FilterPill label="Groupes" active={filter === 'group'} onPress={() => setFilter('group')} />
        </View>

        {/* SECTION DEMANDES (Visible seulement si demandes > 0 et pas en mode vue demandes) */}
        {MOCK_REQUESTS.length > 0 && !showRequests && (
            <TouchableOpacity 
                onPress={() => setShowRequests(true)}
                className="mx-5 mb-4 flex-row items-center justify-between bg-gray-100 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700"
            >
                <View className="flex-row items-center">
                    <View className="w-8 h-8 bg-gray-200 dark:bg-gray-700 rounded-full justify-center items-center mr-3">
                        <Ionicons name="mail-unread-outline" size={16} color="#666" />
                    </View>
                    <Text className="text-gray-700 dark:text-gray-300 font-medium">Demandes de message</Text>
                </View>
                <View className="flex-row items-center">
                    <Text className="text-[#4c669f] font-bold mr-1">{MOCK_REQUESTS.length}</Text>
                    <Ionicons name="chevron-forward" size={16} color="#9ca3af" />
                </View>
            </TouchableOpacity>
        )}

        {/* LISTE DES DISCUSSIONS OU DEMANDES */}
        <View className="px-5 flex-1">
            {showRequests ? (
                <View>
                    <TouchableOpacity onPress={() => setShowRequests(false)} className="mb-4 flex-row items-center">
                        <Ionicons name="arrow-back" size={20} color="#4c669f" />
                        <Text className="text-[#4c669f] ml-1 font-medium">Retour aux discussions</Text>
                    </TouchableOpacity>
                    <Text className="text-gray-500 dark:text-gray-400 mb-4 text-sm">Ces personnes souhaitent vous envoyer un message.</Text>
                    {MOCK_REQUESTS.map((req) => (
                        <TouchableOpacity key={req.id} className="flex-row items-center bg-white dark:bg-gray-900 p-4 rounded-2xl shadow-sm mb-3 opacity-80">
                             <View className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full justify-center items-center mr-3">
                                <Text className="text-gray-500 font-bold">?</Text>
                             </View>
                             <View className="flex-1">
                                <Text className="font-bold text-gray-800 dark:text-white">{req.name}</Text>
                                <Text className="text-gray-500 dark:text-gray-400 text-sm" numberOfLines={1}>{req.message}</Text>
                             </View>
                        </TouchableOpacity>
                    ))}
                </View>
            ) : (
                <FlatList
                    data={filteredDiscussions}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 100 }} // Espace pour le FAB
                />
            )}
        </View>
    </View>
  );
}

// Composant Pillule de filtre
const FilterPill = ({ label, active, onPress }: { label: string, active: boolean, onPress: () => void }) => (
    <TouchableOpacity 
        onPress={onPress}
        className={`px-4 py-1.5 rounded-full border ${active ? 'bg-[#4c669f] border-[#4c669f]' : 'bg-transparent border-gray-300 dark:border-gray-600'}`}
    >
        <Text className={`text-sm font-medium ${active ? 'text-white' : 'text-gray-600 dark:text-gray-400'}`}>
            {label}
        </Text>
    </TouchableOpacity>
);
