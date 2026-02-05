import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, ActivityIndicator, Modal, useColorScheme, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Tabs from '../../components/ui/Tabs';
import PostItem from '../../components/social/PostItem';
import ProfileHeader from '../../components/profile/ProfileHeader';
import ProfileStats from '../../components/profile/ProfileStats';
import { useUserProfile } from '../../hooks/useUserProfile';
import { useRouter } from 'expo-router';

export default function ProfileScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('sorties');
  
  // Utilisation du Hook personnalisé
  const { user, posts, loading, deletePost } = useUserProfile();
  
  // États pour les Modals
  const [previewImage, setPreviewImage] = useState<string | null>(null); // Pour l'avatar/cover
  
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const tabItems = [
    { id: 'sorties', label: 'Mes Sorties' },
    { id: 'posts', label: 'Posts' },
    { id: 'avis', label: 'Avis' },
  ];

  const handleDeletePost = async (postId: string) => {
    try {
      await deletePost(postId);
      Alert.alert("Succès", "Post supprimé.");
    } catch (error) {
      Alert.alert("Erreur", "Impossible de supprimer le post.");
    }
  };

  const handleEditPost = (post: any) => {
    // Navigation vers l'écran de création en mode édition
    router.push({
      pathname: '/post',
      params: { 
        postId: post.id, 
        content: post.content,
        visibility: post.visibility
      }
    });
  };

  const handleCommentPost = (post: any) => {
    router.push({
      pathname: '/comments',
      params: { postId: post.id }
    });
  };

  if (loading) {
    return (
      <View className="flex-1 justify-center items-center bg-white dark:bg-black">
        <ActivityIndicator size="large" color="#4c669f" />
      </View>
    );
  }

  return (
    <ScrollView className="flex-1 bg-white dark:bg-black" showsVerticalScrollIndicator={false}>
      
      {/* 1. Header (Couverture, Avatar, Infos, Boutons) */}
      <ProfileHeader user={user} onImagePress={setPreviewImage} />

      {/* 2. Statistiques */}
      <ProfileStats postsCount={posts.length} />

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
        <View className="min-h-[200px]">
          {activeTab === 'sorties' && (
            <View className="items-center justify-center py-10">
              <Ionicons name="calendar-outline" size={48} color={isDark ? "#333" : "#eee"} />
              <Text className="text-gray-400 dark:text-gray-600 mt-2">Aucune sortie prévue</Text>
            </View>
          )}

          {/* --- LISTE DES POSTS (FEED) --- */}
          {activeTab === 'posts' && (
            <View>
              {posts.length > 0 ? (
                posts.map((post) => (
                  <PostItem 
                    key={post.id} 
                    item={post} 
                    onDelete={handleDeletePost}
                    onEdit={handleEditPost}
                    onComment={handleCommentPost}
                  />
                ))
              ) : (
                <View className="w-full items-center py-10">
                    <Text className="text-gray-400">Aucune publication pour le moment.</Text>
                </View>
              )}
            </View>
          )}

          {activeTab === 'avis' && (
            <View>
              <Text className="text-gray-400 italic text-center py-10">Aucun avis laissé.</Text>
            </View>
          )}
        </View>
      </View>

      {/* MODAL DE PRÉVISUALISATION D'IMAGE (Avatar/Cover) */}
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