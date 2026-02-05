// c:\Users\Lenovo\Desktop\Git\HangOutHub\HangOutHub\frontend\app\comments.tsx
import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, FlatList, Image, KeyboardAvoidingView, Platform, Pressable, Keyboard, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SlideInDown, SlideOutDown } from 'react-native-reanimated';
import CommentItem from '../components/social/CommentItem';
import api, { getImageUrl } from '../services/api';

export default function CommentsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets(); 
  const { postId } = params; 
  
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [replyingTo, setReplyingTo] = useState<any | null>(null); // Commentaire auquel on répond

  const [isKeyboardVisible, setKeyboardVisible] = useState(false);

  useEffect(() => {
    fetchComments();
    fetchCurrentUser();
    const showListener = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow', () => setKeyboardVisible(true));
    const hideListener = Keyboard.addListener(Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide', () => setKeyboardVisible(false));
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  const fetchCurrentUser = async () => {
    try {
      const res = await api.get('/users/me');
      setCurrentUserId(res.data.id);
    } catch (error) {
      console.log("Erreur user");
    }
  };

  const fetchComments = async () => {
    try {
      const res = await api.get(`/posts/${postId}/comments`);
      // On transforme les données pour qu'elles collent à CommentItem
      const formattedComments = res.data.map((c: any) => ({
        id: c.id,
        user: c.User.displayName || c.User.username,
        avatar: getImageUrl(c.User.avatarUrl) || 'https://i.pravatar.cc/150',
        content: c.content,
        time: new Date(c.createdAt).toLocaleDateString(),
        userId: c.userId,
        parentId: c.parentId
      }));
      setComments(formattedComments);
    } catch (error) {
      console.error("Erreur chargement commentaires:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSend = async () => {
    if (!comment.trim() || isSending) return;
    
    setIsSending(true);
    try {
      const res = await api.post(`/posts/${postId}/comments`, { 
        content: comment,
        parentId: replyingTo ? replyingTo.id : undefined
      });
      
      // On ajoute le nouveau commentaire à la liste (formaté)
      const newComment = {
        id: res.data.id,
        user: res.data.User.displayName || res.data.User.username,
        avatar: getImageUrl(res.data.User.avatarUrl) || 'https://i.pravatar.cc/150',
        content: res.data.content,
        time: 'À l\'instant',
        userId: currentUserId,
        parentId: res.data.parentId
      };
      
      setComments(prev => [...prev, newComment]);
      setComment('');
      setReplyingTo(null); // On réinitialise la réponse
      Keyboard.dismiss();
    } catch (error) {
      console.error("Erreur envoi commentaire:", error);
    } finally {
      setIsSending(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      await api.delete(`/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
      Alert.alert("Succès", "Commentaire supprimé");
    } catch (error) {
      Alert.alert("Erreur", "Impossible de supprimer");
    }
  };

  const handleReportComment = (commentId: string) => {
    Alert.alert("Signalé", "Merci, nous allons examiner ce commentaire.");
  };

  const handleReply = (comment: any) => {
    setReplyingTo(comment);
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      className="flex-1"
    >
      <View className="flex-1 justify-end bg-black/50">
      {/* Zone transparente cliquable pour fermer */}
      <Pressable className="flex-1" onPress={() => router.back()} />

      {/* Le KeyboardAvoidingView englobe TOUT le modal blanc */}
      <Animated.View 
        className="h-[75%] w-full bg-white dark:bg-gray-900 rounded-t-3xl shadow-xl overflow-hidden"
        entering={SlideInDown}
        exiting={SlideOutDown}
      >
          
          {/* Header du Modal */}
          <View className="flex-row justify-between items-center p-4 border-b border-gray-100 dark:border-gray-800">
            <View className="w-8" />
            <View className="items-center">
                <View className="w-10 h-1 bg-gray-300 dark:bg-gray-600 rounded-full mb-2" />
                <Text className="font-bold text-lg text-gray-800 dark:text-white">Commentaires</Text>
            </View>
            <TouchableOpacity onPress={() => router.back()} className="p-1">
                <Ionicons name="close" size={24} color="#666" />
            </TouchableOpacity>
        </View>

        {/* Liste des commentaires */}
        {loading ? (
            <ActivityIndicator size="large" color="#4c669f" className="mt-10" />
        ) : (
            <FlatList
                data={comments}
                keyExtractor={item => item.id}
                contentContainerStyle={{ padding: 16, paddingBottom: 100 }}
                renderItem={({ item }) => (
                  <CommentItem 
                    item={{ ...item, isMine: item.userId === currentUserId }} 
                    onDelete={handleDeleteComment}
                    onReport={handleReportComment}
                    onReply={handleReply}
                  />
                )}
                ListEmptyComponent={
                    <Text className="text-center text-gray-400 mt-10">Soyez le premier à commenter ! 👇</Text>
                }
            />
        )}

        {/* Zone de saisie (Input Bar) */}
        {/* On applique le padding dynamique (insets.bottom) ici */}
        {replyingTo && (
          <View className="px-4 py-2 bg-gray-50 dark:bg-gray-800 flex-row justify-between items-center border-t border-gray-200 dark:border-gray-700">
            <Text className="text-gray-500 dark:text-gray-400 text-sm">
              Réponse à <Text className="font-bold">{replyingTo.user}</Text>
            </Text>
            <TouchableOpacity onPress={() => setReplyingTo(null)}>
              <Ionicons name="close-circle" size={20} color="#666" />
            </TouchableOpacity>
          </View>
        )}

        <View 
            className={`flex-row items-end p-3 border-t border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 ${isKeyboardVisible ? '' : 'pb-5'} ${replyingTo ? 'border-t-0' : ''}`}
        >
            <Image source={{ uri: 'https://i.pravatar.cc/150?u=me' }} className="w-8 h-8 rounded-full mr-3 mb-2" />
            <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-gray-800 rounded-3xl px-4 py-2">
                <TextInput
                    className="flex-1 text-gray-800 dark:text-white max-h-24 pt-2 pb-2"
                    placeholder={replyingTo ? `Répondre à ${replyingTo.user}...` : "Ajouter un commentaire..."}
                    placeholderTextColor="#999"
                    multiline
                    value={comment}
                    onChangeText={setComment}
                />
                <TouchableOpacity onPress={handleSend} disabled={!comment.trim() || isSending} className="ml-2 mb-1">
                    {isSending ? (
                      <ActivityIndicator size="small" color="#4c669f" />
                    ) : (
                      <Text className={`font-bold ${comment.trim() ? 'text-[#4c669f]' : 'text-gray-400'}`}>Publier</Text>
                    )}
                </TouchableOpacity>
            </View>
        </View>

      </Animated.View>
      </View>
    </KeyboardAvoidingView>
  );
}