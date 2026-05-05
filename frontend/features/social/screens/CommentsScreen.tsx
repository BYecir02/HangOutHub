import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  PanResponder,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import ScreenState from '@/shared/ui/ScreenState';
import CommentItem from '@/features/social/components/CommentItem';
import { useI18n } from '@/shared/hooks/use-i18n';
import api, { clearAuthState, getApiErrorMessage, getImageUrl, isUnauthorizedError } from '@/services/api';
import { emitPostChanged } from '@/services/social/post-events';

interface CommentAuthor {
  displayName?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
}

interface ApiComment {
  id: string;
  content: string;
  createdAt: string;
  userId: string;
  parentId?: string | null;
  User: CommentAuthor;
}

interface CommentListItem {
  id: string;
  user: string;
  avatar: string;
  content: string;
  time: string;
  userId: string;
  parentId?: string | null;
}

interface CurrentUserState {
  id: string;
  avatarUrl?: string | null;
}

const SWIPE_CLOSE_THRESHOLD_Y = 120;
const SWIPE_CLOSE_THRESHOLD_VY = 0.6;
const SWIPE_ANIMATE_OUT = 900;

export default function CommentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ postId?: string }>();
  const postId = params.postId;
  const { locale, t } = useI18n();
  const commentsListRef = useRef<FlatList<CommentListItem>>(null);

  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy, dx }) =>
        dy > 8 && Math.abs(dy) > Math.abs(dx),
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) translateY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > SWIPE_CLOSE_THRESHOLD_Y || vy > SWIPE_CLOSE_THRESHOLD_VY) {
          Animated.timing(translateY, {
            toValue: SWIPE_ANIMATE_OUT,
            duration: 220,
            useNativeDriver: true,
          }).start(() => router.back());
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<CommentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUserState | null>(null);
  const [replyingTo, setReplyingTo] = useState<CommentListItem | null>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const handleInvalidSession = useCallback(async () => {
    await clearAuthState();
    router.replace('/');
  }, [router]);

  const mapComment = useCallback(
    (item: ApiComment): CommentListItem => {
      return {
        id: item.id,
        user: item.User.displayName || item.User.username || t('commentsUserFallback'),
        avatar: getImageUrl(item.User.avatarUrl) || 'https://i.pravatar.cc/150',
        content: item.content,
        time: new Date(item.createdAt).toLocaleDateString(locale),
        userId: item.userId,
        parentId: item.parentId,
      };
    },
    [locale, t],
  );

  const scrollCommentsToEnd = useCallback(() => {
    requestAnimationFrame(() => {
      commentsListRef.current?.scrollToEnd({ animated: true });
    });
  }, []);

  const syncPostCommentsCount = useCallback(
    (nextCount: number) => {
      if (!postId) return;
      emitPostChanged({ id: postId, _count: { comments: nextCount } });
    },
    [postId],
  );

  const fetchComments = useCallback(async () => {
    if (!postId) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get<ApiComment[]>(`/posts/${postId}/comments`);
      const nextComments = res.data.map(mapComment);
      setComments(nextComments);
      if (nextComments.length > 0) scrollCommentsToEnd();
      setErrorMessage(null);
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await handleInvalidSession();
        return;
      }
      console.error('Erreur chargement commentaires:', error);
      setErrorMessage(getApiErrorMessage(error, t('commonErrorTitle')));
    } finally {
      setLoading(false);
    }
  }, [handleInvalidSession, mapComment, postId, scrollCommentsToEnd, t]);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await api.get('/users/me');
      setCurrentUser({ id: res.data.id, avatarUrl: res.data.avatarUrl });
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await handleInvalidSession();
        return;
      }
      setCurrentUser(null);
    }
  }, [handleInvalidSession]);

  useEffect(() => {
    void fetchComments();
    void fetchCurrentUser();

    const showListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false),
    );

    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, [fetchComments, fetchCurrentUser]);

  const handleSend = async () => {
    if (!comment.trim() || isSending || !postId) return;

    setIsSending(true);
    try {
      const res = await api.post<ApiComment>(`/posts/${postId}/comments`, {
        content: comment,
        parentId: replyingTo ? replyingTo.id : undefined,
      });
      const nextComment = mapComment(res.data);
      setComments((prev) => {
        const next = [...prev, nextComment];
        syncPostCommentsCount(next.length);
        return next;
      });
      setComment('');
      setReplyingTo(null);
      setErrorMessage(null);
      Keyboard.dismiss();
      scrollCommentsToEnd();
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await handleInvalidSession();
        return;
      }
      console.error('Erreur envoi commentaire:', error);
      Alert.alert(t('commonErrorTitle'), getApiErrorMessage(error, t('commonErrorTitle')));
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setComments((prev) => {
        const idsToRemove = new Set<string>([commentId]);
        let shouldScanAgain = true;
        while (shouldScanAgain) {
          shouldScanAgain = false;
          prev.forEach((current) => {
            if (current.parentId && idsToRemove.has(current.parentId)) {
              if (!idsToRemove.has(current.id)) {
                idsToRemove.add(current.id);
                shouldScanAgain = true;
              }
            }
          });
        }
        const next = prev.filter((current) => !idsToRemove.has(current.id));
        syncPostCommentsCount(next.length);
        return next;
      });
      Alert.alert(t('commentsDeleteSuccessTitle'), t('commentsDeleteSuccessMessage'));
    } catch (error) {
      if (isUnauthorizedError(error)) {
        await handleInvalidSession();
        return;
      }
      Alert.alert(t('commonErrorTitle'), t('commentsDeleteErrorMessage'));
    }
  };

  const handleReportComment = () => {
    Alert.alert(t('commentsReportTitle'), t('commentsReportMessage'));
  };

  const handleClose = () => {
    Animated.timing(translateY, {
      toValue: SWIPE_ANIMATE_OUT,
      duration: 220,
      useNativeDriver: true,
    }).start(() => router.back());
  };

  const composer = (
    <>
      {replyingTo ? (
        <View className="flex-row items-center justify-between border-t border-gray-200 bg-gray-50 px-4 py-2 dark:border-gray-700 dark:bg-gray-800">
          <Text className="text-sm text-gray-500 dark:text-gray-400">
            {t('commentsReplyToUser', { user: replyingTo.user })}
          </Text>
          <TouchableOpacity onPress={() => setReplyingTo(null)}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        </View>
      ) : null}

      <View
        className={`flex-row items-end border-t border-gray-100 bg-white p-3 dark:border-gray-800 dark:bg-gray-900 ${
          isKeyboardVisible ? '' : 'pb-5'
        } ${replyingTo ? 'border-t-0' : ''}`}
      >
        <Image
          source={{ uri: getImageUrl(currentUser?.avatarUrl) || 'https://i.pravatar.cc/150?u=me' }}
          className="mb-2 mr-3 h-8 w-8 rounded-full"
        />
        <View className="flex-1 flex-row items-center rounded-3xl bg-gray-100 px-4 py-2 dark:bg-gray-800">
          <TextInput
            className="max-h-24 flex-1 pb-2 pt-2 text-gray-800 dark:text-white"
            placeholder={
              replyingTo
                ? t('commentsReplyPlaceholder', { user: replyingTo.user })
                : t('commentsInputPlaceholder')
            }
            placeholderTextColor="#999"
            multiline
            value={comment}
            onChangeText={setComment}
          />
          <TouchableOpacity
            onPress={handleSend}
            disabled={!comment.trim() || isSending}
            className="mb-1 ml-2"
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#4c669f" />
            ) : (
              <Text className={`font-bold ${comment.trim() ? 'text-[#4c669f]' : 'text-gray-400'}`}>
                {t('commentsPublish')}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}
      className="flex-1"
    >
      <View className="flex-1 justify-end">
        <Pressable className="absolute inset-0" onPress={handleClose}>
          <View className="absolute inset-0 bg-black/[0.45]" />
        </Pressable>

        <Animated.View
          className="w-full flex-1 overflow-hidden bg-white dark:bg-gray-900"
          style={{
            height: '85%',
            maxHeight: 680,
            borderTopLeftRadius: 28,
            borderTopRightRadius: 28,
            transform: [{ translateY }],
          }}
        >
          {/* Drag handle — pan handler attached here */}
          <View
            {...panResponder.panHandlers}
            className="items-center pt-4 pb-2"
          >
            <View className="h-1.5 w-12 rounded-full bg-gray-300 dark:bg-gray-700" />
          </View>

          {/* Header — pan handler continues here */}
          <View
            {...panResponder.panHandlers}
            className="flex-row items-start justify-between px-5 pb-4"
          >
            <View className="flex-1 pr-3">
              <Text className="text-lg font-bold text-gray-900 dark:text-white">
                {t('commentsTitle')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleClose}
              className="bg-gray-100 p-2 dark:bg-gray-800"
              style={{ borderRadius: 999 }}
            >
              <Ionicons name="close" size={18} color="#6b7280" />
            </TouchableOpacity>
          </View>

          <View className="flex-1 min-h-[1px]">
            {loading ? (
              <ScreenState mode="loading" />
            ) : errorMessage ? (
              <ScreenState
                mode="error"
                title={t('commonErrorTitle')}
                description={errorMessage}
                actionLabel={t('commonRetry')}
                onAction={() => { void fetchComments(); }}
              />
            ) : comments.length === 0 ? (
              <ScreenState mode="empty" title={t('commentsFirstComment')} />
            ) : (
              <FlatList
                ref={commentsListRef}
                data={comments}
                keyExtractor={(item) => item.id}
                style={{ flex: 1 }}
                keyboardDismissMode="on-drag"
                contentContainerStyle={{ padding: 16, paddingBottom: 12 }}
                keyboardShouldPersistTaps="handled"
                renderItem={({ item }) => (
                  <CommentItem
                    item={{ ...item, isMine: item.userId === currentUser?.id }}
                    onDelete={handleDeleteComment}
                    onReport={handleReportComment}
                    onReply={setReplyingTo}
                  />
                )}
              />
            )}
          </View>

          <View className="mt-4">{composer}</View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}
