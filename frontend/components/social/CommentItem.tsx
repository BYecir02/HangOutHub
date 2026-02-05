// c:\Users\Lenovo\Desktop\Git\HangOutHub\HangOutHub\frontend\components\social\CommentItem.tsx
import React from 'react';
import { View, Text, Image, TouchableOpacity, Alert } from 'react-native';

interface CommentItemProps {
  item: {
    id: string;
    user: string;
    avatar: string;
    content: string;
    time: string;
    isMine: boolean; // Pour savoir si c'est mon commentaire
    parentId?: string | null;
  };
  onDelete?: (id: string) => void;
  onReport?: (id: string) => void;
  onReply?: (comment: any) => void;
}

export default function CommentItem({ item, onDelete, onReport, onReply }: CommentItemProps) {
  
  const handleLongPress = () => {
    if (item.isMine) {
      Alert.alert(
        "Mon commentaire",
        "Que voulez-vous faire ?",
        [
          { text: "Annuler", style: "cancel" },
          { 
            text: "Supprimer", 
            style: "destructive", 
            onPress: () => onDelete && onDelete(item.id) 
          }
          // On pourra ajouter "Modifier" ici plus tard
        ]
      );
    } else {
      Alert.alert(
        "Commentaire",
        "Que voulez-vous faire ?",
        [
          { text: "Annuler", style: "cancel" },
          { 
            text: "Signaler", 
            style: "destructive", 
            onPress: () => onReport && onReport(item.id) 
          }
        ]
      );
    }
  };

  return (
    <TouchableOpacity 
      onLongPress={handleLongPress} 
      activeOpacity={0.7} 
      className={`flex-row mb-5 ${item.parentId ? 'ml-12' : ''}`} // Indentation si c'est une réponse
    >
      <Image source={{ uri: item.avatar }} className="w-9 h-9 rounded-full mr-3" />
      <View className="flex-1">
        <View className="bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none">
          <Text className="font-bold text-gray-900 dark:text-white text-sm mb-1">{item.user}</Text>
          <Text className="text-gray-700 dark:text-gray-300 leading-5">{item.content}</Text>
        </View>
        <View className="flex-row mt-1 ml-1">
          <Text className="text-xs text-gray-400 mr-4">{item.time}</Text>
          <TouchableOpacity onPress={() => onReply && onReply(item)}>
            <Text className="text-xs text-gray-500 font-bold">Répondre</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
