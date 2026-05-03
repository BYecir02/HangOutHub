import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  Share,
  Text,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { useI18n } from '@/hooks/use-i18n';
import PostItem from '@/components/social/PostItem';
import BottomSheetModal from '@/components/ui/BottomSheetModal';
import ScreenHeader from '@/components/ui/ScreenHeader';
import ScreenState from '@/components/ui/ScreenState';
import { clearAuthState, getApiErrorMessage, isUnauthorizedError } from '@/services/api';
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
  const [connectionsErrorMessage, setConnectionsErrorMessage] = useState<string | null>(
    null,
  );
  const [sendingConnectionId, setSendingConnectionId] = useState<string | null>(
    null,
  );

  const handleInvalidSession = useCallback(async () => {
    await clearAuthState();
    router.replace('/');
  }, [router]);

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
      if (isUnauthorizedError(error)) {
        await handleInvalidSession();
        return;
      }

      setErrorMessage(getApiErrorMessage(error, t('postDetailLoadError')));
      setPost(null);
    } finally {
      setLoading(false);
    }
  }, [handleInvalidSession, postId, t]);

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
      setConnectionsErrorMessage(null);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await handleInvalidSession();
        return;
      }

      console.error('Erreur chargement connexions', error);
      setConnections([]);
      setConnectionsErrorMessage(
        getApiErrorMessage(error, t('commonErrorTitle')),
      );
    } finally {
      setLoadingConnections(false);
    }
  }, [connectionsLoaded, handleInvalidSession, t]);

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
        if (isUnauthorizedError(error)) {
          await handleInvalidSession();
          return;
        }

        Alert.alert(t('commonErrorTitle'), t('postShareSendError'));
      } finally {
        setSendingConnectionId(null);
      }
    },
    [buildShareMessage, bumpShareCount, handleInvalidSession, post, router, t],
  );

  const commentTarget = useMemo(() => {
    if (!post) {
      return null;
    }
    return { id: post.id };
  }, [post]);

  if (loading) {
    return (
      <ScreenState mode="loading" fullScreen containerClassName="bg-gray-50 dark:bg-black" />
    );
  }

  if (!post) {
    return (
      <ScreenState
        mode="error"
        fullScreen
        title={errorMessage || t('postDetailEmpty')}
        actionLabel={t('genericCancel')}
        onAction={() => router.back()}
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  return (
    <View className="flex-1 bg-gray-50 dark:bg-black">
      <View className="px-5 pb-3 pt-14">
        <ScreenHeader title={t('postDetailTitle')} onBack={() => router.back()} />
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

      <BottomSheetModal
        visible={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        title={t('postShareConnectionsTitle')}
        subtitle={t('postShareConnectionsSubtitle')}
        maxHeight={520}
      >
        {loadingConnections ? (
          <ScreenState mode="loading" />
        ) : connectionsErrorMessage ? (
          <ScreenState
            mode="error"
            title={connectionsErrorMessage}
            actionLabel={t('commonRetry')}
            onAction={() => {
              setConnectionsLoaded(false);
              void loadConnections();
            }}
          />
        ) : connections.length === 0 ? (
          <ScreenState mode="empty" title={t('postShareConnectionsEmpty')} />
        ) : (
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
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
      </BottomSheetModal>
    </View>
  );
}
