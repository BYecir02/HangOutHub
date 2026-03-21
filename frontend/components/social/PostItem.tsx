import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { useI18n } from '@/hooks/use-i18n';

import api, { getImageUrl } from '../../services/api';

interface PostAuthor {
  username?: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}

interface PostItemData {
  id: string;
  userId?: string;
  content?: string | null;
  images?: string[];
  isLiked?: boolean;
  isOwner?: boolean;
  visibility?: 'public' | 'friends' | 'private';
  createdAt?: string;
  User?: PostAuthor;
  _count?: {
    likes?: number;
    comments?: number;
  };
}

interface PostItemProps {
  item: PostItemData;
  onDelete?: (id: string) => void;
  onEdit?: (post: PostItemData) => void;
  onComment?: (post: PostItemData) => void;
}

export default function PostItem({
  item,
  onDelete,
  onEdit,
  onComment,
}: PostItemProps) {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { locale, t } = useI18n();
  const avatarUri =
    getImageUrl(item.User?.avatarUrl) || 'https://i.pravatar.cc/150';
  const postImageUri = getImageUrl(item.images?.[0]);

  const [isLiked, setIsLiked] = useState(Boolean(item.isLiked));
  const [likesCount, setLikesCount] = useState(item._count?.likes || 0);
  const [commentsCount, setCommentsCount] = useState(item._count?.comments || 0);

  useEffect(() => {
    setIsLiked(Boolean(item.isLiked));
    setLikesCount(item._count?.likes || 0);
    setCommentsCount(item._count?.comments || 0);
  }, [item._count?.comments, item._count?.likes, item.isLiked]);

  const handleLike = async () => {
    const previousState = isLiked;
    setIsLiked(!isLiked);
    setLikesCount((prev) => (isLiked ? prev - 1 : prev + 1));

    try {
      await api.post(`/posts/${item.id}/like`);
    } catch {
      setIsLiked(previousState);
      setLikesCount((prev) => (isLiked ? prev + 1 : prev - 1));
    }
  };

  const handleOptions = () => {
    const buttons: {
      text: string;
      style?: 'default' | 'cancel' | 'destructive';
      onPress?: () => void;
    }[] = [];

    if (onEdit) {
      buttons.push({ text: t('postItemEdit'), onPress: () => onEdit(item) });
    }

    if (onDelete) {
      buttons.push({
        text: t('postItemDelete'),
        style: 'destructive',
        onPress: () => {
          Alert.alert(t('postItemDeleteConfirmTitle'), t('postItemDeleteConfirmMessage'), [
            { text: t('postItemCancel'), style: 'cancel' },
            {
              text: t('postItemDelete'),
              style: 'destructive',
              onPress: () => onDelete(item.id),
            },
          ]);
        },
      });
    }

    buttons.push({ text: t('postItemCancel'), style: 'cancel' });

    if (buttons.length > 1) {
      Alert.alert(t('postItemOptionsTitle'), undefined, buttons);
    }
  };

  return (
    <View className="bg-white dark:bg-gray-900 pb-4 border-b border-gray-100 dark:border-gray-800">
      <View className="flex-row items-center p-4 justify-between">
        <View className="flex-row items-center flex-1">
          <Image
            source={{ uri: avatarUri }}
            className="w-10 h-10 rounded-full mr-3"
          />
          <View>
            <Text className="font-bold text-gray-800 dark:text-white text-base">
              {item.User?.displayName || item.User?.username || t('postItemUserFallback')}
            </Text>
            <Text className="text-xs text-gray-500 dark:text-gray-400">
              {item.createdAt
                ? new Date(item.createdAt).toLocaleDateString(locale)
                : t('postItemJustNow')}
            </Text>
          </View>
        </View>

        {(onDelete || onEdit) && (
          <TouchableOpacity onPress={handleOptions} className="p-2">
            <Ionicons
              name="ellipsis-horizontal"
              size={20}
              color={isDark ? '#fff' : '#333'}
            />
          </TouchableOpacity>
        )}
      </View>

      {item.content && (
        <Text className="px-4 pb-3 text-gray-800 dark:text-gray-200 text-base leading-6">
          {item.content}
        </Text>
      )}

      {item.images && item.images.length > 0 && postImageUri && (
        <Image
          source={{ uri: postImageUri }}
          className="w-full h-96 bg-gray-200 dark:bg-gray-800"
          resizeMode="cover"
        />
      )}

      <View className="flex-row px-4 pt-3">
        <TouchableOpacity
          className="flex-row items-center mr-6"
          onPress={handleLike}
        >
          <Ionicons
            name={isLiked ? 'heart' : 'heart-outline'}
            size={24}
            color={isLiked ? '#ff4757' : isDark ? '#aaa' : '#666'}
          />
          <Text
            className={`ml-1.5 font-medium ${
              isLiked ? 'text-[#ff4757]' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {likesCount}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          className="flex-row items-center"
          onPress={() => onComment?.(item)}
        >
          <Ionicons
            name="chatbubble-outline"
            size={22}
            color={isDark ? '#aaa' : '#666'}
          />
          <Text className="ml-1.5 text-gray-500 dark:text-gray-400 font-medium">
            {commentsCount}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
