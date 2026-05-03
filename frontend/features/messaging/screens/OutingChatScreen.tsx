import React, { useCallback, useMemo, useRef, useState } from 'react';
import {
  Alert,
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  Text,
  TextInput,
  useWindowDimensions,
  useColorScheme,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';

import { ChatComposer } from '@/features/messaging/components/ChatComposer';
import ChatScreenShell from '@/features/messaging/components/ChatScreenShell';
import ScreenHeader from '@/shared/ui/ScreenHeader';
import ScreenState from '@/shared/ui/ScreenState';
import { useI18n } from '@/shared/hooks/use-i18n';
import api, { getApiErrorMessage } from '@/services/api';
import { sendOutingMessage, type OutingMessage } from '@/services/messaging/outings';

interface OutingDetail {
  id: string;
  title: string;
  scheduledDate: string;
  Place?: {
    name?: string | null;
    address?: string | null;
    City?: {
      name: string;
    } | null;
  } | null;
}

interface MeResponse {
  id: string;
}

function formatTime(value: string, locale: string) {
  return new Date(value).toLocaleTimeString(locale, {
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function OutingChatScreen() {
  const router = useRouter();
  const { locale, t } = useI18n();
  const colorScheme = useColorScheme();
  const params = useLocalSearchParams<{ id?: string }>();
  const outingId = params.id;
  const inputRef = useRef<TextInput | null>(null);
  const { width: screenWidth } = useWindowDimensions();
  const attachmentSize = Math.min(Math.round(screenWidth * 0.58), 240);

  const [title, setTitle] = useState(t('outingChatDefaultTitle'));
  const [subtitle, setSubtitle] = useState('');
  const [messages, setMessages] = useState<OutingMessage[]>([]);
  const messagesRef = useRef<OutingMessage[]>([]);
  const [myUserId, setMyUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncWarning, setSyncWarning] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [draft, setDraft] = useState('');
  const [pendingImages, setPendingImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const isDark = colorScheme === 'dark';
  const MAX_MESSAGE_IMAGES = 5;

  const loadChat = useCallback(
    async ({ isRefresh = false, silent = false } = {}) => {
      if (!outingId) {
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else if (!silent) {
        setLoading(true);
      }

      try {
        const [meResponse, outingResponse, messagesResponse] = await Promise.all([
          api.get<MeResponse>('/users/me'),
          api.get<OutingDetail>(`/outings/${outingId}`),
          api.get<OutingMessage[]>(`/outings/${outingId}/messages`),
        ]);

        setMyUserId(meResponse.data.id);
        setTitle(outingResponse.data.title || t('outingChatDefaultTitle'));
        const location =
          outingResponse.data.Place?.name ||
          outingResponse.data.Place?.City?.name ||
          outingResponse.data.Place?.address ||
          t('messagesLocationFallback');
        const dateLabel = outingResponse.data.scheduledDate
          ? new Date(outingResponse.data.scheduledDate).toLocaleString(locale, {
              day: '2-digit',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '';
        setSubtitle(dateLabel ? `${dateLabel} - ${location}` : location);
        setMessages(messagesResponse.data);
        messagesRef.current = messagesResponse.data;
        setErrorMessage(null);
        setSyncWarning(false);
      } catch (error) {
        console.error('Erreur chargement discussion sortie:', error);

        if (messagesRef.current.length > 0) {
          setSyncWarning(true);
        } else {
          setMessages([]);
          setErrorMessage(getApiErrorMessage(error, t('outingChatLoadFailedDefault')));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [locale, outingId, t],
  );

  useFocusEffect(
    useCallback(() => {
      void loadChat();

      const interval = setInterval(() => {
        void loadChat({ silent: true });
      }, 4000);

      return () => {
        clearInterval(interval);
      };
    }, [loadChat]),
  );

  const sendEnabled = useMemo(
    () => !sending && (draft.trim().length > 0 || pendingImages.length > 0),
    [draft, pendingImages.length, sending],
  );

  const handlePickImages = useCallback(async () => {
    if (pendingImages.length >= MAX_MESSAGE_IMAGES) {
      Alert.alert(
        t('commonErrorTitle'),
        t('directChatImageLimit', { count: MAX_MESSAGE_IMAGES }),
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      quality: 0.7,
    });

    if (!result.canceled) {
      setPendingImages((current) => {
        const remaining = MAX_MESSAGE_IMAGES - current.length;
        const picked = result.assets.slice(0, remaining);
        return [...current, ...picked];
      });
    }
  }, [MAX_MESSAGE_IMAGES, pendingImages.length, t]);

  const removePendingImage = useCallback((uri: string) => {
    setPendingImages((current) => current.filter((item) => item.uri !== uri));
  }, []);

  const handleSend = async () => {
    const content = draft.trim();
    if (!outingId || sending || (!content && pendingImages.length === 0)) {
      return;
    }

    setSending(true);
    setUploadProgress(pendingImages.length > 0 ? 0 : null);
    try {
      const response = await sendOutingMessage(
        outingId,
        {
          content,
          images: pendingImages,
        },
        {
          onUploadProgress: (progress) => {
            setUploadProgress(progress);
          },
        },
      );
      setMessages((current) => {
        const next = [...current, response];
        messagesRef.current = next;
        return next;
      });
      setSyncWarning(false);
      setDraft('');
      setPendingImages([]);
    } catch (error) {
      console.error('Erreur envoi message:', error);
      Alert.alert(t('commonErrorTitle'), t('directChatSendFailed'));
    } finally {
      setSending(false);
      setUploadProgress(null);
    }
  };

  if (loading) {
    return (
      <ScreenState
        mode="loading"
        fullScreen
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  if (errorMessage && messages.length === 0) {
    return (
      <ScreenState
        mode="error"
        fullScreen
        title={t('outingChatLoadFailedTitle')}
        description={errorMessage}
        actionLabel={t('commonRetry')}
        onAction={() => {
          void loadChat();
        }}
        containerClassName="bg-gray-50 dark:bg-black"
      />
    );
  }

  return (
    <ChatScreenShell
      header={
        <View className="px-5 pb-4 pt-16">
          <ScreenHeader
            title={title}
            subtitle={subtitle || undefined}
            label={t('outingChatLiveLabel')}
            onBack={() => router.back()}
          />
        </View>
      }
      banner={
        syncWarning ? (
          <View className="mx-4 mb-2 rounded-2xl bg-orange-100 px-4 py-3 dark:bg-orange-900/30">
            <Text className="text-xs font-semibold text-orange-700 dark:text-orange-300">
              {t('outingChatSyncWarning')}
            </Text>
          </View>
        ) : undefined
      }
      composer={
        <View className="px-4 pb-6 pt-2">
          <ChatComposer
            inputRef={inputRef}
            input={draft}
            onChangeInput={setDraft}
            placeholder={t('outingChatInputPlaceholder')}
            pendingImages={pendingImages}
            onRemoveImage={removePendingImage}
            onPickImages={() => void handlePickImages()}
            onSend={handleSend}
            sending={sending}
            sendEnabled={sendEnabled}
            isDark={isDark}
            uploadProgress={uploadProgress}
          />
        </View>
      }
    >
      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => void loadChat({ isRefresh: true })}
            tintColor="#4c669f"
          />
        }
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
        ListEmptyComponent={
          <ScreenState
            mode="empty"
            title={t('outingChatEmptyTitle')}
            description={t('outingChatEmptyDescription')}
            containerClassName="px-0 py-10"
          />
        }
        renderItem={({ item }) => {
          const mine = item.senderId === myUserId;
          const senderName =
            item.User?.displayName || item.User?.username || t('outingChatMemberFallback');
          const attachments = (item.images || []).filter((uri): uri is string => Boolean(uri));

          return (
            <View className={`mb-3 ${mine ? 'items-end' : 'items-start'}`}>
              {!mine ? (
                <Text className="mb-1 text-xs text-gray-400 dark:text-gray-500">
                  {senderName}
                </Text>
              ) : null}
              <View
                className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                  mine ? 'bg-[#4c669f]' : 'bg-white dark:bg-gray-900'
                }`}
              >
                {item.content ? (
                  <Text className={mine ? 'text-white' : 'text-gray-800 dark:text-gray-100'}>
                    {item.content}
                  </Text>
                ) : null}
                {attachments.length > 0 ? (
                  <View className="mt-3 flex-row flex-wrap">
                    {attachments.map((uri, index) => (
                      <Image
                        key={`${item.id}-${uri}-${index}`}
                        source={{ uri }}
                        style={{
                          width: attachmentSize,
                          height: attachmentSize,
                          marginRight: index % 2 === 0 ? 8 : 0,
                          marginBottom: 8,
                          borderRadius: 16,
                        }}
                        resizeMode="cover"
                      />
                    ))}
                  </View>
                ) : null}
              </View>
              <Text className="mt-1 text-[11px] text-gray-400 dark:text-gray-500">
                {formatTime(item.sentAt, locale)}
              </Text>
            </View>
          );
        }}
      />
    </ChatScreenShell>
  );
}
