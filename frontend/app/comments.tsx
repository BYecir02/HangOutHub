import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import BottomSheetModal from '@/components/ui/BottomSheetModal';
import ScreenState from '@/components/ui/ScreenState';
import CommentItem from '../components/social/CommentItem';
import { useI18n } from '@/hooks/use-i18n';
import api, { clearAuthState, getApiErrorMessage, getImageUrl } from '../services/api';

const isUnauthorized = (error: unknown) =>
  (error as { response?: { status?: number } }).response?.status === 401;

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

export default function CommentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ postId?: string }>();
  const postId = params.postId;
  const { locale, t } = useI18n();

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

  const fetchComments = useCallback(async () => {
    if (!postId) {
      setComments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const res = await api.get<ApiComment[]>(`/posts/${postId}/comments`);
      setComments(res.data.map(mapComment));
      setErrorMessage(null);
    } catch (error) {
      if (isUnauthorized(error)) {
        await handleInvalidSession();
        return;
      }

      console.error('Erreur chargement commentaires:', error);
      setErrorMessage(getApiErrorMessage(error, t('commonErrorTitle')));
    } finally {
      setLoading(false);
    }
  }, [handleInvalidSession, mapComment, postId, t]);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await api.get('/users/me');
      setCurrentUser({
        id: res.data.id,
        avatarUrl: res.data.avatarUrl,
      });
    } catch (error) {
      if (isUnauthorized(error)) {
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
    if (!comment.trim() || isSending || !postId) {
      return;
    }

    setIsSending(true);
    try {
      const res = await api.post<ApiComment>(`/posts/${postId}/comments`, {
        content: comment,
        parentId: replyingTo ? replyingTo.id : undefined,
      });

      setComments((prev) => [...prev, mapComment(res.data)]);
      setComment('');
      setReplyingTo(null);
      setErrorMessage(null);
      Keyboard.dismiss();
    } catch (error) {
      if (isUnauthorized(error)) {
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

        return prev.filter((current) => !idsToRemove.has(current.id));
      });
      Alert.alert(t('commentsDeleteSuccessTitle'), t('commentsDeleteSuccessMessage'));
    } catch (error) {
      if (isUnauthorized(error)) {
        await handleInvalidSession();
        return;
      }

      Alert.alert(t('commonErrorTitle'), t('commentsDeleteErrorMessage'));
    }
  };

  const handleReportComment = () => {
    Alert.alert(t('commentsReportTitle'), t('commentsReportMessage'));
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
          source={{
            uri: getImageUrl(currentUser?.avatarUrl) || 'https://i.pravatar.cc/150?u=me',
          }}
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
              <Text
                className={`font-bold ${
                  comment.trim() ? 'text-[#4c669f]' : 'text-gray-400'
                }`}
              >
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
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <BottomSheetModal
        visible
        onClose={() => router.back()}
        title={t('commentsTitle')}
        maxHeight={680}
        footer={composer}
      >
        {loading ? (
          <ScreenState mode="loading" />
        ) : errorMessage ? (
          <ScreenState
            mode="error"
            title={t('commonErrorTitle')}
            description={errorMessage}
            actionLabel={t('commonRetry')}
            onAction={() => {
              void fetchComments();
            }}
          />
        ) : comments.length === 0 ? (
          <ScreenState mode="empty" title={t('commentsFirstComment')} />
        ) : (
          <FlatList
            data={comments}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, paddingBottom: 12 }}
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
      </BottomSheetModal>
    </KeyboardAvoidingView>
  );
}
