// c:\Users\Lenovo\Desktop\Git\HangOutHub\HangOutHub\frontend\components\profile\ProfileHeader.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { getImageUrl } from '../../services/api';

interface ProfileHeaderProps {
  user: any;
  onImagePress: (url: string) => void;
}

export default function ProfileHeader({ user, onImagePress }: ProfileHeaderProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const coverUrl = getImageUrl(user?.coverUrl) || 'https://images.unsplash.com/photo-1557683316-973673baf926';
  const avatarUrl = getImageUrl(user?.avatarUrl) || 'https://i.pravatar.cc/150';

  return (
    <View>
      {/* 1. Couverture & Profil */}
      <View className="h-48 bg-gray-200 dark:bg-gray-800">
        {/* Ajout de w-full h-full sur le TouchableOpacity pour qu'il remplisse le conteneur */}
        <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(coverUrl)} className="w-full h-full">
          <Image 
            source={{ uri: coverUrl }} 
            className="w-full h-full"
            resizeMode="cover"
            onError={(e) => console.log("❌ Erreur Cover:", e.nativeEvent.error)}
          />
        </TouchableOpacity>
        
        {/* Photo de profil avec badge caméra */}
        <View className="absolute -bottom-12 left-5">
          <View className="p-1 bg-white dark:bg-black rounded-full shadow-sm relative">
            <TouchableOpacity activeOpacity={0.9} onPress={() => onImagePress(avatarUrl)}>
              <Image 
                source={{ uri: avatarUrl }} 
                className="w-24 h-24 rounded-full"
                resizeMode="cover"
                onError={(e) => console.log("❌ Erreur Avatar:", e.nativeEvent.error)}
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
    </View>
  );
}
