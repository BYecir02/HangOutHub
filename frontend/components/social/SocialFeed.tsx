import React from 'react';
import { View, Text, TouchableOpacity, FlatList, Image, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import EventCard from '../ui/EventCard';

// --- MOCK DATA ---
const STORIES = [
  { id: 's1', user: 'Moi', image: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200', isAdd: true },
  { id: 's2', user: 'Alice', image: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200' },
  { id: 's3', user: 'Marc', image: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200' },
  { id: 's4', user: 'Sophie', image: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200' },
  { id: 's5', user: 'Jean', image: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200' },
];

// --- NOUVELLES DONNÉES MOCK PLUS RICHES ---
const POSTS = [
  {
    id: 'p1',
    type: 'plan', // NOUVEAU TYPE : Planification
    user: 'Jean Dupont',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=200',
    time: 'Il y a 10 min',
    content: 'J\'organise un afterwork ce soir, qui est chaud ? 🍻',
    planDetails: {
      location: 'Le Code Bar',
      time: 'Ce soir • 19:00',
      attendees: ['Alice', 'Marc', 3]
    },
    likes: 5,
    comments: 12
  },
  {
    id: 'p2',
    type: 'ticket_buy', // NOUVEAU TYPE : Achat Billet
    user: 'Alice Martin',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200',
    time: 'Il y a 2h',
    content: 'Ça y est, j\'ai mes places ! Trop hâte 😍',
    event: {
      title: 'Concert Dadju & Tayc',
      date: 'SAM. 24 JUIN',
      location: 'Palais des Congrès',
      image: 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?q=80&w=1000',
      price: 'Payant'
    }
  },
  {
    id: 'p3',
    type: 'review', // NOUVEAU TYPE : Avis
    user: 'Marc Z.',
    avatar: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200',
    time: 'Il y a 4h',
    content: 'Superbe ambiance hier soir ! 🔥',
    placeName: 'Dream Beach',
    rating: 5,
    image: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800',
    likes: 24,
    comments: 8
  },
  {
    id: 'p4',
    type: 'standard', // NOUVEAU : Post Texte seul (Question)
    user: 'Sophie',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=200',
    time: 'Il y a 5h',
    content: 'Quelqu\'un a déjà testé le nouveau resto sur la Haie Vive ? J\'hésite à y aller ce soir 🤔',
    likes: 2,
    comments: 15
  },
  {
    id: 'p5',
    type: 'standard', // NOUVEAU : Post Photo + Texte (Souvenir)
    user: 'Paul',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200',
    time: 'Il y a 6h',
    content: 'Retour sur ce week-end de folie ! 🌊☀️',
    image: 'https://images.unsplash.com/photo-1514525253440-b393452e3383?w=800',
    likes: 45,
    comments: 3
  }
];

export default function SocialFeed() {
  
  // Rendu des Stories (En-tête)
  const renderHeader = () => (
    <View className="mb-6 mt-6">
      <Text className="px-5 text-lg font-bold text-gray-800 dark:text-white mb-3">Stories</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
        {STORIES.map((story) => (
          <TouchableOpacity key={story.id} className="mr-4 items-center">
            <View className={`w-16 h-16 rounded-full p-0.5 ${story.isAdd ? 'border-0' : 'border-2 border-[#4c669f]'}`}>
              <Image source={{ uri: story.image }} className="w-full h-full rounded-full" />
              {story.isAdd && (
                <View className="absolute bottom-0 right-0 bg-[#4c669f] rounded-full p-1 border-2 border-white dark:border-black">
                  <Ionicons name="add" size={12} color="white" />
                </View>
              )}
            </View>
            <Text className="text-xs text-gray-600 dark:text-gray-400 mt-1">{story.user}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  // Rendu d'un Post
  const renderPost = ({ item }: { item: any }) => (
    <View className="bg-white dark:bg-gray-900 p-4 mb-2 border-y border-gray-100 dark:border-gray-800">
      
      {/* En-tête du post */}
      <View className="flex-row items-center mb-3">
        <Image source={{ uri: item.avatar }} className="w-10 h-10 rounded-full mr-3" />
        <View>
          <View className="flex-row items-center">
            <Text className="font-bold text-gray-800 dark:text-white text-base mr-1">{item.user}</Text>
            {/* Petit badge d'action contextuel */}
            {item.type === 'ticket_buy' && <Text className="text-xs text-gray-500">a pris son billet 🎟️</Text>}
            {item.type === 'plan' && <Text className="text-xs text-gray-500">organise une sortie 📅</Text>}
            {item.type === 'review' && <Text className="text-xs text-gray-500">a noté un lieu ⭐</Text>}
          </View>
          <Text className="text-xs text-gray-500 dark:text-gray-400">{item.time}</Text>
        </View>
        <TouchableOpacity className="ml-auto">
          <Ionicons name="ellipsis-horizontal" size={20} color="#999" />
        </TouchableOpacity>
      </View>

      {/* Contenu Texte */}
      {item.content && (
        <Text className="text-gray-800 dark:text-gray-200 mb-3 text-base leading-6">{item.content}</Text>
      )}

      {/* --- BLOCS SPÉCIFIQUES --- */}

      {/* 1. BLOC PLANIFICATION (Nouveau) */}
      {item.type === 'plan' && item.planDetails && (
        <View className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-xl mb-3 border border-blue-100 dark:border-blue-800">
          <View className="flex-row justify-between items-center mb-2">
            <View className="flex-row items-center">
              <View className="bg-blue-100 dark:bg-blue-800 p-2 rounded-lg mr-3">
                 <Ionicons name="calendar" size={20} color="#4c669f" />
              </View>
              <View>
                <Text className="font-bold text-gray-800 dark:text-white">{item.planDetails.location}</Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">{item.planDetails.time}</Text>
              </View>
            </View>
          </View>
          
          {/* Liste des participants (Social Proof) */}
          <View className="flex-row items-center mt-2 pt-2 border-t border-blue-100 dark:border-blue-800">
             <Text className="text-xs text-gray-500 mr-2">Déjà partants :</Text>
             <View className="flex-row">
                {[1, 2, 3].map((_, i) => (
                  <View key={i} className="w-6 h-6 rounded-full bg-gray-300 dark:bg-gray-600 border border-white dark:border-gray-900 -ml-2 first:ml-0 justify-center items-center">
                    <Ionicons name="person" size={10} color="#fff" />
                  </View>
                ))}
                <View className="w-6 h-6 rounded-full bg-gray-200 dark:bg-gray-700 border border-white dark:border-gray-900 -ml-2 justify-center items-center">
                   <Text className="text-[8px] font-bold text-gray-600 dark:text-gray-300">+3</Text>
                </View>
             </View>
             <TouchableOpacity className="ml-auto bg-[#4c669f] px-3 py-1 rounded-full">
                <Text className="text-white text-xs font-bold">Je viens !</Text>
             </TouchableOpacity>
          </View>
        </View>
      )}

      {/* 2. BLOC BILLET / EVENT (Amélioré) */}
      {item.type === 'ticket_buy' && item.event && (
        <View className="mb-3">
           {/* On réutilise ton EventCard mais on peut ajouter un overlay "J'y vais aussi" */}
           <EventCard 
             title={item.event.title}
             date={item.event.date}
             location={item.event.location}
             imageUrl={item.event.image}
             price={item.event.price}
             onPress={() => {}}
           />
           <TouchableOpacity className="mt-2 bg-gray-100 dark:bg-gray-800 p-2 rounded-lg items-center">
              <Text className="text-[#4c669f] font-bold text-sm">Prendre ma place aussi 👉</Text>
           </TouchableOpacity>
        </View>
      )}

      {/* 3. BLOC REVIEW / PHOTO (Amélioré) */}
      {item.type === 'review' && item.image && (
        <View className="mb-3">
          <Image 
            source={{ uri: item.image }} 
            className="w-full h-64 rounded-xl mb-2 bg-gray-200 dark:bg-gray-800"
            resizeMode="cover"
          />
          <View className="flex-row items-center bg-gray-50 dark:bg-gray-800 p-2 rounded-lg absolute bottom-4 left-4 right-4 bg-opacity-90">
             <Ionicons name="location" size={16} color="#4c669f" />
             <Text className="text-gray-800 dark:text-white font-bold ml-1 flex-1">{item.placeName}</Text>
             <View className="flex-row">
               {[1,2,3,4,5].map(star => (
                 <Ionicons key={star} name="star" size={14} color="#f59e0b" />
               ))}
             </View>
          </View>
        </View>
      )}

      {/* 4. BLOC STANDARD (Photo simple sans contexte spécifique) */}
      {item.type === 'standard' && item.image && (
        <Image 
          source={{ uri: item.image }} 
          className="w-full h-64 rounded-xl mb-3 bg-gray-200 dark:bg-gray-800"
          resizeMode="cover"
        />
      )}

      {/* Actions (Like/Comment) */}
      <View className="flex-row pt-2 border-t border-gray-50 dark:border-gray-800">
        <TouchableOpacity className="flex-row items-center mr-6">
          <Ionicons name="heart-outline" size={22} color={item.likes > 10 ? "#ff4757" : "#666"} />
          <Text className="ml-1.5 text-gray-500 dark:text-gray-400 font-medium">{item.likes}</Text>
        </TouchableOpacity>
        <TouchableOpacity className="flex-row items-center">
          <Ionicons name="chatbubble-outline" size={22} color="#666" />
          <Text className="ml-1.5 text-gray-500 dark:text-gray-400 font-medium">{item.comments}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <FlatList
      data={POSTS}
      renderItem={renderPost}
      keyExtractor={(item) => item.id}
      ListHeaderComponent={renderHeader}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 100 }}
    />
  );
}