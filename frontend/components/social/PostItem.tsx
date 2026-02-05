// c:\Users\Lenovo\Desktop\Git\HangOutHub\HangOutHub\frontend\components\social\PostItem.tsx
import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, useColorScheme, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api, { getImageUrl } from '../../services/api';

interface PostItemProps {
  item: any;
  onDelete?: (id: string) => void;
  onEdit?: (post: any) => void;
  onComment?: (post: any) => void;
}

export default function PostItem({ item, onDelete, onEdit, onComment }: PostItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  // État local pour l'UI optimiste (réaction immédiate)
  const [isLiked, setIsLiked] = useState(item.isLiked);
  const [likesCount, setLikesCount] = useState(item._count?.likes || 0);

  const handleLike = async () => {
    const previousState = isLiked;
    // Mise à jour immédiate
    setIsLiked(!isLiked);
    setLikesCount((prev: number) => isLiked ? prev - 1 : prev + 1);

    try {
      await api.post(`/posts/${item.id}/like`);
    } catch (error) {
      // En cas d'erreur, on revient en arrière
      setIsLiked(previousState);
      setLikesCount((prev: number) => isLiked ? prev + 1 : prev - 1);
    }
  };

  const handleOptions = () => {
    const buttons: any[] = [];
    
    if (onEdit) {
      buttons.push({ text: 'Modifier', onPress: () => onEdit(item) });
    }
    
    if (onDelete) {
      buttons.push({ 
        text: 'Supprimer', 
        style: 'destructive', 
        onPress: () => {
          Alert.alert(
            "Confirmer", 
            "Supprimer ce post ?", 
            [
              { text: "Annuler", style: "cancel" },
              { text: "Supprimer", style: "destructive", onPress: () => onDelete(item.id) }
            ]
          );
        }
      });
    }

    buttons.push({ text: 'Annuler', style: 'cancel' });

    if (buttons.length > 1) {
      Alert.alert('Options', undefined, buttons);
    }
  };

  return (
    <View className="bg-white dark:bg-gray-900 mb-2 pb-4 border-b border-gray-100 dark:border-gray-800">
        {/* Header du post */}
        <View className="flex-row items-center p-4 justify-between">
            <View className="flex-row items-center flex-1">
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

            {(onDelete || onEdit) && (
              <TouchableOpacity onPress={handleOptions} className="p-2">
                <Ionicons name="ellipsis-horizontal" size={20} color={isDark ? "#fff" : "#333"} />
              </TouchableOpacity>
            )}
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
            <TouchableOpacity className="flex-row items-center mr-6" onPress={handleLike}>
                <Ionicons name={isLiked ? "heart" : "heart-outline"} size={24} color={isLiked ? "#ff4757" : (isDark ? "#aaa" : "#666")} />
                <Text className={`ml-1.5 font-medium ${isLiked ? 'text-[#ff4757]' : 'text-gray-500 dark:text-gray-400'}`}>{likesCount}</Text>
            </TouchableOpacity>
            <TouchableOpacity className="flex-row items-center" onPress={() => onComment && onComment(item)}>
                <Ionicons name="chatbubble-outline" size={22} color={isDark ? "#aaa" : "#666"} />
                <Text className="ml-1.5 text-gray-500 dark:text-gray-400 font-medium">{item._count?.comments || 0}</Text>
            </TouchableOpacity>
        </View>
    </View>
  );
}
