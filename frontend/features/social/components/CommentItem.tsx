// c:\Users\Lenovo\Desktop\Git\HangOutHub\HangOutHub\frontend\components\social\CommentItem.tsx
import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';

import Avatar from '@/shared/ui/primitives/Avatar';
import Divider from '@/shared/ui/primitives/Divider';
import { useI18n } from '@/shared/hooks/use-i18n';

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
  const { t } = useI18n();
  
  const handleLongPress = () => {
    if (item.isMine) {
      Alert.alert(
        t('commentsActionMineTitle'),
        t('commentsActionQuestion'),
        [
          { text: t('commentsActionCancel'), style: 'cancel' },
          { 
            text: t('commentsActionDelete'), 
            style: 'destructive', 
            onPress: () => onDelete && onDelete(item.id) 
          }
          // On pourra ajouter "Modifier" ici plus tard
        ]
      );
    } else {
      Alert.alert(
        t('commentsActionGenericTitle'),
        t('commentsActionQuestion'),
        [
          { text: t('commentsActionCancel'), style: 'cancel' },
          { 
            text: t('commentsActionReport'), 
            style: 'destructive', 
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
      <Avatar uri={item.avatar} label={item.user} size={36} style={{ marginRight: 12 }} />
      <View className="flex-1">
        <View className="bg-gray-100 dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none">
          <Text className="font-bold text-gray-900 dark:text-white text-sm mb-1">{item.user}</Text>
          <Text className="text-gray-700 dark:text-gray-300 leading-5">{item.content}</Text>
        </View>
        <Divider className="my-2" color="#d1d5db" />
        <View className="flex-row mt-1 ml-1">
          <Text className="text-xs text-gray-400 mr-4">{item.time}</Text>
          <TouchableOpacity onPress={() => onReply && onReply(item)}>
            <Text className="text-xs text-gray-500 font-bold">{t('commentsActionReply')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
