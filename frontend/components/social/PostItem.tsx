import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

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
  postType?: 'post' | 'plan';
  placeName?: string | null;
  cityName?: string | null;
  ambiance?: string | null;
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
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { locale, t } = useI18n();
  const avatarUri =
    getImageUrl(item.User?.avatarUrl) || 'https://i.pravatar.cc/150';
  const postImageUri = getImageUrl(item.images?.[0]);

  const [isLiked, setIsLiked] = useState(Boolean(item.isLiked));
  const [likesCount, setLikesCount] = useState(item._count?.likes || 0);
  const [commentsCount, setCommentsCount] = useState(item._count?.comments || 0);
  const isPlan = item.postType === 'plan';

  const createdAtDate = item.createdAt ? new Date(item.createdAt) : new Date();
  const dayLabel = createdAtDate.toLocaleDateString(locale, { day: '2-digit' });
  const monthLabel = createdAtDate
    .toLocaleDateString(locale, { month: 'short' })
    .toUpperCase();
  const timeLabel = createdAtDate.toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });

  const rawContent = (item.content || '').trim();
  const firstLine = rawContent.split('\n')[0] || '';
  const titleText = firstLine
    ? firstLine.length > 72
      ? `${firstLine.slice(0, 69)}...`
      : firstLine
    : t('postItemPlanFallback');
  const bodyText = rawContent
    ? rawContent.slice(firstLine.length).trim()
    : '';
  const bodyExcerpt =
    bodyText.length > 160 ? `${bodyText.slice(0, 157)}...` : bodyText;
  const locationLabel = [item.placeName, item.cityName]
    .map((value) => (value || '').trim())
    .filter(Boolean)
    .join(' · ');
  const ambianceLabel = item.ambiance
    ? t(
        ({
          chill: 'postAmbianceChill',
          festif: 'postAmbianceFestif',
          food: 'postAmbianceFood',
          afterwork: 'postAmbianceAfterwork',
          sport: 'postAmbianceSport',
        } as const)[item.ambiance] || 'postAmbianceChill',
      )
    : '';

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

  const handleCreateOuting = () => {
    const sourceTitle = firstLine.trim();
    router.push({
      pathname: '/outing',
      params: {
        title: sourceTitle || undefined,
        sourceLabel: sourceTitle || undefined,
      },
    });
  };

  return (
    <View className="mx-5 mb-5 overflow-hidden rounded-3xl border border-gray-100 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <View className="flex-row">
        <View
          className={`w-20 items-center justify-center px-2 py-6 ${
            isPlan
              ? 'bg-[#ff4757]/10 dark:bg-[#ff4757]/20'
              : 'bg-[#4c669f]/10 dark:bg-[#4c669f]/20'
          }`}
        >
          <Text
            className={`text-[10px] font-semibold uppercase tracking-[0.24em] ${
              isPlan ? 'text-[#ff4757]' : 'text-[#4c669f]'
            }`}
          >
            {isPlan ? t('postTypePlanLabel') : t('postTypePostLabel')}
          </Text>
          <Text className="mt-3 text-2xl font-bold text-gray-900 dark:text-white">
            {dayLabel}
          </Text>
          <Text className="text-xs uppercase tracking-widest text-gray-500 dark:text-gray-300">
            {monthLabel}
          </Text>
          <View className="mt-2 rounded-full bg-white/70 px-2 py-1 dark:bg-gray-900/40">
            <Text className="text-[10px] font-semibold text-gray-600 dark:text-gray-200">
              {timeLabel}
            </Text>
          </View>
        </View>

        <View className="flex-1 px-4 pt-5">
          <View className="flex-row items-center justify-between">
            <View className="flex-row items-center flex-1">
              <Image
                source={{ uri: avatarUri }}
                className="h-9 w-9 rounded-full mr-3"
              />
              <View className="flex-1">
                <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                  {item.User?.displayName ||
                    item.User?.username ||
                    t('postItemUserFallback')}
                </Text>
              </View>
            </View>

            {(onDelete || onEdit) && (
              <TouchableOpacity onPress={handleOptions} className="p-2 -mr-2">
                <Ionicons
                  name="ellipsis-horizontal"
                  size={20}
                  color={isDark ? '#fff' : '#333'}
                />
              </TouchableOpacity>
            )}
          </View>

          <Text className="mt-4 text-xl font-bold text-gray-900 dark:text-white">
            {titleText}
          </Text>

          {locationLabel ? (
            <View className="mt-2 flex-row items-center">
              <Ionicons
                name="location-outline"
                size={14}
                color={isPlan ? '#ff4757' : '#4c669f'}
              />
              <Text className="ml-1 text-xs font-semibold text-gray-600 dark:text-gray-300">
                {locationLabel}
              </Text>
            </View>
          ) : null}

          {ambianceLabel ? (
            <View
              className={`mt-2 self-start rounded-full px-2.5 py-1 ${
                isPlan ? 'bg-[#ff4757]/10' : 'bg-[#4c669f]/10'
              }`}
            >
              <Text
                className={`text-[10px] font-semibold ${
                  isPlan ? 'text-[#ff4757]' : 'text-[#4c669f]'
                }`}
              >
                {ambianceLabel}
              </Text>
            </View>
          ) : null}

          {bodyExcerpt ? (
            <Text className="mt-2 text-base leading-6 text-gray-600 dark:text-gray-300">
              {bodyExcerpt}
            </Text>
          ) : null}

          {item.images && item.images.length > 0 && postImageUri ? (
            <Image
              source={{ uri: postImageUri }}
              className="mt-4 h-52 w-full rounded-2xl bg-gray-200 dark:bg-gray-800"
              resizeMode="cover"
            />
          ) : null}

          <View className="mt-4 flex-row items-center justify-between pb-4">
            <View className="flex-row">
              <TouchableOpacity
                className="flex-row items-center mr-5"
                onPress={handleLike}
              >
                <Ionicons
                  name={isLiked ? 'heart' : 'heart-outline'}
                  size={22}
                  color={isLiked ? '#ff4757' : isDark ? '#aaa' : '#666'}
                />
                <Text
                  className={`ml-1.5 text-sm font-semibold ${
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
                  name="chatbubble-ellipses-outline"
                  size={20}
                  color={isDark ? '#aaa' : '#666'}
                />
                <Text className="ml-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400">
                  {commentsCount}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleCreateOuting}
              className="rounded-full bg-[#4c669f] px-3 py-2"
            >
              <Text className="text-xs font-semibold text-white">
                {t('profileOrganizeOutingCta')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}
