import React from 'react';
import { View, Text, TouchableOpacity, Alert } from 'react-native';

import Avatar from '@/shared/ui/primitives/Avatar';
import { useI18n } from '@/shared/hooks/use-i18n';

interface CommentItemProps {
  item: {
    id: string;
    user: string;
    avatar: string;
    content: string;
    time: string;
    isMine: boolean;
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
      Alert.alert(t('commentsActionMineTitle'), t('commentsActionQuestion'), [
        { text: t('commentsActionCancel'), style: 'cancel' },
        { text: t('commentsActionDelete'), style: 'destructive', onPress: () => onDelete?.(item.id) },
      ]);
    } else {
      Alert.alert(t('commentsActionGenericTitle'), t('commentsActionQuestion'), [
        { text: t('commentsActionCancel'), style: 'cancel' },
        { text: t('commentsActionReport'), style: 'destructive', onPress: () => onReport?.(item.id) },
      ]);
    }
  };

  return (
    <TouchableOpacity
      onLongPress={handleLongPress}
      activeOpacity={0.7}
      className={`flex-row mb-4 ${item.parentId ? 'ml-11' : ''}`}
    >
      <Avatar uri={item.avatar} label={item.user} size={34} style={{ marginRight: 10, marginTop: 2 }} />
      <View className="flex-1">
        <Text className="text-sm leading-[21px] text-gray-800 dark:text-gray-100">
          <Text className="font-semibold">{item.user} </Text>
          {item.content}
        </Text>
        <View className="flex-row items-center gap-4 mt-1.5">
          <Text className="text-xs text-gray-400 dark:text-gray-500">{item.time}</Text>
          <TouchableOpacity onPress={() => onReply?.(item)}>
            <Text className="text-xs font-semibold text-gray-400 dark:text-gray-500">
              {t('commentsActionReply')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
}
