// c:\Users\Lenovo\Desktop\Git\HangOutHub\HangOutHub\frontend\components\social\PostItem.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity, useColorScheme } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getImageUrl } from '../../services/api';

interface PostItemProps {
  item: any;
}

export default function PostItem({ item }: PostItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <View className="bg-white dark:bg-gray-900 mb-2 pb-4 border-b border-gray-100 dark:border-gray-800">
        {/* Header du post */}
        <View className="flex-row items-center p-4">
            <Image 
                source={{ uri: getImageUrl(item.User?.avatarUrl) || 'https://i.pravatar.cc/150' }} 
                className="w-10 h-10 rounded-full mr-3" 
            />
            <View>
                <Text className="font-bold text-gray-800 dark:text-white text-base">
                    {item.User?.displayName || item.User?.username}
                </Text>
                <Text className="text-xs text-gray-500 dark:text-gray-400">
                    {new Date(item.createdAt).toLocaleDateString()}
                </Text>
            </View>
        </View>

        {/* Contenu Texte */}
        {item.content && (
            <Text className="px-4 pb-3 text-gray-800 dark:text-gray-200 text-base leading-6">
                {item.content}
            </Text>
        )}

        {/* Images (On affiche la première en grand pour l'instant) */}
        {item.images && item.images.length > 0 && (
            <Image 
                source={{ uri: getImageUrl(item.images[0]) }} 
                className="w-full h-96 bg-gray-200 dark:bg-gray-800"
                resizeMode="cover"
            />
        )}

        {/* Actions (Like/Comment) */}
        <View className="flex-row px-4 pt-3">
            <TouchableOpacity className="flex-row items-center mr-6">
                <Ionicons name="heart-outline" size={24} color={isDark ? "#fff" : "#333"} />
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center">
                <Ionicons name="chatbubble-outline" size={24} color={isDark ? "#fff" : "#333"} />
            </TouchableOpacity>
        </View>
    </View>
  );
}
