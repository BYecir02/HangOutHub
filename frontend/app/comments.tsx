import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';

import CommentItem from '../components/social/CommentItem';
import api, { getImageUrl } from '../services/api';

interface CommentAuthor {
  displayName?: string | null;
  username?: string;
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

  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<CommentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUser, setCurrentUser] = useState<CurrentUserState | null>(null);
  const [replyingTo, setReplyingTo] = useState<CommentListItem | null>(null);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  const mapComment = useCallback((item: ApiComment): CommentListItem => {
    return {
      id: item.id,
      user: item.User.displayName || item.User.username || 'Utilisateur',
      avatar:
        getImageUrl(item.User.avatarUrl) || 'https://i.pravatar.cc/150',
      content: item.content,
      time: new Date(item.createdAt).toLocaleDateString(),
      userId: item.userId,
      parentId: item.parentId,
    };
  }, []);

  const fetchComments = useCallback(async () => {
    if (!postId) {
      setComments([]);
      setLoading(false);
      return;
    }

    try {
      const res = await api.get<ApiComment[]>(`/posts/${postId}/comments`);
      setComments(res.data.map(mapComment));
    } catch (error) {
      console.error('Erreur chargement commentaires:', error);
    } finally {
      setLoading(false);
    }
  }, [mapComment, postId]);

  const fetchCurrentUser = useCallback(async () => {
    try {
      const res = await api.get('/users/me');
      setCurrentUser({
        id: res.data.id,
        avatarUrl: res.data.avatarUrl,
      });
    } catch {
      console.log('Erreur user');
    }
  }, []);

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
      Keyboard.dismiss();
    } catch (error) {
      console.error('Erreur envoi commentaire:', error);
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
      Alert.alert('Succes', 'Commentaire supprime');
    } catch {
      Alert.alert('Erreur', 'Impossible de supprimer');
    }
  };

  const handleReportComment = () => {
    Alert.alert(
      'Signale',
      'Merci, nous allons examiner ce commentaire.',
    );
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      className="flex-1"
    >
      <View className="flex-1 justify-end bg-black/50">
        <Pressable className="flex-1" onPress={() => router.back()} />

        <Animated.View
          className="h-[75%] w-full bg-white dark:bg-gray-900 rounded-t-3xl shadow-xl overflow-hidden"
          entering={SlideInDown}
          exiting={SlideOutDown}
        >
          <View className="flex-row justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
            <View className="w-8" />
            <View className="items-center">
              <View className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mb-2" />
              <Text className="font-bold text-lg text-gray-800 dark:text-white">
                Commentaires
              </Text>
            </View>
            <TouchableOpacity onPress={() => router.back()} className="p-1">
              <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator size="large" color="#4c669f" className="mt-10" />
          ) : (
            <FlatList
              data={comments}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
              renderItem={({ item }) => (
                <CommentItem
                  item={{ ...item, isMine: item.userId === currentUser?.id }}
                  onDelete={handleDeleteComment}
                  onReport={handleReportComment}
                  onReply={setReplyingTo}
                />
              )}
              ListEmptyComponent={
                <Text className="text-center text-gray-400 mt-10">
                  Soyez le premier a commenter !
                </Text>
              }
            />
          )}

          {replyingTo && (
            <View className="px-4 py-2 bg-gray-50 dark:bg-gray-800 flex-row justify-between items-center border-t border-gray-200 dark:border-gray-700">
              <Text className="text-gray-500 dark:text-gray-400 text-sm">
                Reponse a <Text className="font-bold">{replyingTo.user}</Text>
              </Text>
              <TouchableOpacity onPress={() => setReplyingTo(null)}>
                <Ionicons name="close-circle" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          )}

          <View
            className={`flex-row items-end p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 ${
              isKeyboardVisible ? '' : 'pb-5'
            } ${replyingTo ? 'border-t-0' : ''}`}
          >
            <Image
              source={{
                uri:
                  getImageUrl(currentUser?.avatarUrl) ||
                  'https://i.pravatar.cc/150?u=me',
              }}
              className="w-8 h-8 rounded-full mr-3 mb-2"
            />
            <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-3xl px-4 py-2">
              <TextInput
                className="flex-1 text-gray-800 dark:text-white max-h-24 pt-2 pb-2"
                placeholder={
                  replyingTo
                    ? `Repondre a ${replyingTo.user}...`
                    : 'Ajouter un commentaire...'
                }
                placeholderTextColor="#999"
                multiline
                value={comment}
                onChangeText={setComment}
              />
              <TouchableOpacity
                onPress={handleSend}
                disabled={!comment.trim() || isSending}
                className="ml-2 mb-1"
              >
                {isSending ? (
                  <ActivityIndicator size="small" color="#4c669f" />
                ) : (
                  <Text
                    className={`font-bold ${
                      comment.trim() ? 'text-[#4c669f]' : 'text-gray-400'
                    }`}
                  >
                    Publier
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}
