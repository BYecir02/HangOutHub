import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useI18n } from '@/hooks/use-i18n';
import PostItem from '@/components/social/PostItem';
import { getApiErrorMessage } from '@/services/api';
import {
  getPostById,
  trackPostShare,
  type PostDetails,
} from '@/services/posts';
import { getFriendshipOverview } from '@/services/friendships';
import { getOrCreateDirectChat, sendDirectMessage } from '@/services/direct-chats';
import PersonRow from '@/components/social/PersonRow';
import type { SocialUser } from '@/types/social';
import * as Linking from 'expo-linking';

export default function PostViewScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { t } = useI18n();
  const [post, setPost] = useState<PostDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [connections, setConnections] = useState<SocialUser[]>([]);
  const [connectionsLoaded, setConnectionsLoaded] = useState(false);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [sendingConnectionId, setSendingConnectionId] = useState<string | null>(
    null,
  );

  const postId = params.id || '';

  const loadPost = useCallback(async () => {
    if (!postId) {
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const response = await getPostById(postId);
      setPost(response);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(getApiErrorMessage(error, t('postDetailLoadError')));
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [postId, t]);

  useEffect(() => {
    void loadPost();
  }, [loadPost]);

  const buildShareMessage = useCallback(
    (payload: PostDetails) => {
      const title = (payload.content || '').split('\n')[0]?.trim();
      const location = [payload.placeName, payload.cityName]
        .map((value) => (value || '').trim())
        .filter(Boolean)
        .join(' - ');
      const eventTitle = payload.Event?.title?.trim();
      const parts = [
        title || t('postItemPlanFallback'),
        eventTitle,
        location,
        Linking.createURL(`/post-view/${payload.id}`),
      ].filter(Boolean);
      return parts.join('\n');
    },
    [t],
  );

  const bumpShareCount = useCallback(() => {
    setPost((current) =>
      current
        ? { ...current, shareCount: (current.shareCount || 0) + 1 }
        : current,
    );
  }, []);

  const loadConnections = useCallback(async () => {
    if (connectionsLoaded) {
      return;
    }
    setLoadingConnections(true);
    try {
      const overview = await getFriendshipOverview();
      setConnections(overview.connections.map((item) => item.user));
      setConnectionsLoaded(true);
    } catch (error) {
      console.error('Erreur chargement connexions', error);
      setConnections([]);
    } finally {
      setLoadingConnections(false);
    }
  }, [connectionsLoaded]);

  const openShareToConnection = useCallback(async () => {
    if (!post) {
      return;
    }
    setShareModalOpen(true);
    await loadConnections();
  }, [loadConnections, post]);

  const handleShare = useCallback(async () => {
    if (!post) {
      return;
    }
    const message = buildShareMessage(post);
    Alert.alert(t('postShareTitle'), undefined, [
      {
        text: t('postShareExternal'),
        onPress: () => {
          void Share.share({ message }).then(() => {
            void trackPostShare(post.id);
            bumpShareCount();
          });
        },
      },
      {
        text: t('postShareDirect'),
        onPress: () => {
          void openShareToConnection();
        },
      },
      { text: t('postItemCancel'), style: 'cancel' },
    ]);
  }, [buildShareMessage, bumpShareCount, openShareToConnection, post, t]);

  const handleSendToConnection = useCallback(
    async (user: SocialUser) => {
      if (!post) {
        return;
      }
      setSendingConnectionId(user.id);
      try {
        const chat = await getOrCreateDirectChat(user.id);
        await sendDirectMessage(chat.id, {
          content: buildShareMessage(post),
          sharedPostId: post.id,
        });
        await trackPostShare(post.id);
        bumpShareCount();
        setShareModalOpen(false);
        router.push({
          pathname: '/direct-chat/[id]',
          params: { id: chat.id },
        });
      } catch (error) {
        Alert.alert(t('commonErrorTitle'), t('postShareSendError'));
      } finally {
        setSendingConnectionId(null);
      }
    },
    [buildShareMessage, bumpShareCount, post, router, t],
  );

  const commentTarget = useMemo(() => {
    if (!post) {
      return null;
    }
    return { id: post.id };
  }, [post]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator color="#4c669f" />
      </View>
    );
  }

  if (!post) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 px-6 dark:bg-black">
        <Text className="text-base text-gray-500 dark:text-gray-400">
          {errorMessage || t('postDetailEmpty')}
        </Text>
        <TouchableOpacity
          onPress={() => router.back()}
          className="mt-4 rounded-2xl bg-[#4c669f] px-4 py-2"
        >
          <Text className="text-sm font-semibold text-white">
            {t('genericCancel')}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <View className="flex-row items-center px-5 pb-3 pt-14">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#4c669f" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {t('postDetailTitle')}
        </Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <PostItem
          item={post}
          showDateColumn={false}
          onComment={commentTarget ? () => {
            router.push({ pathname: '/comments', params: { postId: post.id } });
          } : undefined}
          onShare={() => void handleShare()}
        />
      </ScrollView>

      {shareModalOpen ? (
        <TouchableOpacity
          activeOpacity={1}
          onPress={() => setShareModalOpen(false)}
          className="absolute inset-0 z-50 bg-black/60"
        >
          <TouchableOpacity
            activeOpacity={1}
            className="absolute bottom-0 w-full rounded-t-3xl bg-white p-5 pb-8 dark:bg-gray-900"
          >
            <View className="mb-4 items-center">
              <View className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
            </View>
            <Text className="mb-1 text-center text-lg font-bold text-gray-800 dark:text-white">
              {t('postShareConnectionsTitle')}
            </Text>
            <Text className="mb-4 text-center text-sm text-gray-500 dark:text-gray-400">
              {t('postShareConnectionsSubtitle')}
            </Text>

            {loadingConnections ? (
              <View className="items-center py-10">
                <ActivityIndicator color="#4c669f" />
              </View>
            ) : connections.length === 0 ? (
              <Text className="py-8 text-center text-sm text-gray-500 dark:text-gray-400">
                {t('postShareConnectionsEmpty')}
              </Text>
            ) : (
              <ScrollView
                style={{ maxHeight: 360 }}
                showsVerticalScrollIndicator={false}
              >
                {connections.map((user) => (
                  <PersonRow
                    key={user.id}
                    user={user}
                    subtitle={t('postShareConnectionsHint')}
                    onPress={() => void handleSendToConnection(user)}
                    primaryAction={
                      sendingConnectionId === user.id ? (
                        <ActivityIndicator color="#4c669f" />
                      ) : (
                        <View className="rounded-full bg-[#4c669f]/10 px-3 py-2">
                          <Text className="text-xs font-semibold text-[#4c669f]">
                            {t('postShareSend')}
                          </Text>
                        </View>
                      )
                    }
                  />
                ))}
              </ScrollView>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}
