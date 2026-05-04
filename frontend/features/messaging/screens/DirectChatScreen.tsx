import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Keyboard,
  Modal,
  Share,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { BlurView } from 'expo-blur';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import type { Socket } from 'socket.io-client';

import { useI18n } from '@/shared/hooks/use-i18n';
import {
  addDirectMessageReaction,
  removeDirectMessageReaction,
  getDirectChat,
  getDirectMessages,
  markDirectChatRead,
  sendDirectMessage,
  sendDirectMessageWithImages,
  updateDirectMessage,
  deleteDirectMessage,
  type DirectChatMessage,
  type DirectChatPartner,
} from '@/services/messaging/direct-chats';
import { getApiErrorMessage, getImageUrl } from '@/services/api';
import { resolveStoredUserSession } from '@/services/auth/user-session';
import { clearAuthState, storage } from '@/services/api';
import {
  resolveReplyToMessageId,
  resolveSharedPostId,
  stripReplyMarker,
  stripSharedPostMarker,
} from '@/services/messaging/direct-chat-meta';
import { getPostById, type PostDetails } from '@/services/social/posts';
import { isVideoUrl } from '@/services/shared/media';
import {
  FocusMessage,
  MessageImage,
  ZoomableImage,
} from '@/features/messaging/components/ChatMedia';
import ChatScreenShell from '@/features/messaging/components/ChatScreenShell';
import { ChatComposer } from '@/features/messaging/components/ChatComposer';
import {
  emitDirectTyping,
  getDirectChatSocket,
  joinDirectConversation,
  leaveDirectConversation,
} from '@/services/messaging/direct-chat-realtime';

type LocalMessageState = 'sending' | 'failed';

type LocalDirectChatMessage = DirectChatMessage & {
  localState?: LocalMessageState;
  localClientId?: string;
  localPayload?: {
    content?: string;
    images?: { uri: string }[];
    replyToMessageId?: string | null;
    sharedPostId?: string | null;
  };
};

export default function DirectChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ id?: string }>();
  const { locale, t } = useI18n();
  const [partner, setPartner] = useState<DirectChatPartner | null>(null);
  const [messages, setMessages] = useState<LocalDirectChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [input, setInput] = useState('');
  const [partnerTyping, setPartnerTyping] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [pendingImages, setPendingImages] = useState<ImagePicker.ImagePickerAsset[]>(
    [],
  );
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [previewIndex, setPreviewIndex] = useState(0);
  const [actionMessage, setActionMessage] = useState<DirectChatMessage | null>(
    null,
  );
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingReplyToId, setEditingReplyToId] = useState<string | null>(null);
  const [replyToMessageId, setReplyToMessageId] = useState<string | null>(null);
  const [pressedMessageId, setPressedMessageId] = useState<string | null>(null);
  const [actionPosition, setActionPosition] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [sharedPosts, setSharedPosts] = useState<Record<string, PostDetails>>(
    {},
  );
  const listRef = useRef<FlatList<LocalDirectChatMessage> | null>(null);
  const previewListRef = useRef<FlatList<string> | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const inputRef = useRef<TextInput | null>(null);
  const messageRefs = useRef<Record<string, View | null>>({});
  const fetchingSharedPostsRef = useRef<Set<string>>(new Set());
  const typingActiveRef = useRef(false);
  const typingPauseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingVisibilityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isNearBottomRef = useRef(true);
  const shouldAutoScrollRef = useRef(false);
  const autoScrollAnimatedRef = useRef(true);
  const hasFirstLoadRef = useRef(false);
  const FALLBACK_SYNC_INTERVAL_MS = 20000;
  const PAGE_SIZE = 40;
  const MAX_MESSAGE_IMAGES = 5;
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const gridColumns = screenWidth < 360 ? 2 : 3;
  const gridGap = 8;
  const gridMaxWidth = screenWidth * 0.8;
  const gridImageSize = Math.min(
    Math.floor((gridMaxWidth - gridGap * (gridColumns - 1)) / gridColumns),
    110,
  );
  const statusAccentColor = '#FFD166';
  const maxInlineImages = gridColumns * 2;
  const largeImageWidth = Math.min(Math.round(screenWidth * 0.7), 260);
  const largeImageHeight = Math.round(largeImageWidth * 1.25);

  const chatId = params.id || '';

  useEffect(() => {
    hasFirstLoadRef.current = false;
    shouldAutoScrollRef.current = false;
    autoScrollAnimatedRef.current = true;
    isNearBottomRef.current = true;
    typingActiveRef.current = false;
    setPartnerTyping(false);
    setUploadProgress(null);
    setHasMoreMessages(false);
    setNextCursor(null);
  }, [chatId]);

  const scheduleAutoScroll = useCallback((animated: boolean) => {
    shouldAutoScrollRef.current = true;
    autoScrollAnimatedRef.current = animated;
  }, []);

  const scrollToBottom = useCallback((animated: boolean) => {
    requestAnimationFrame(() => {
      listRef.current?.scrollToEnd({ animated });
    });
  }, []);

  const setTypingState = useCallback(
    (next: boolean) => {
      if (!chatId) {
        typingActiveRef.current = false;
        return;
      }
      const socket = socketRef.current;
      if (!socket || !socket.connected) {
        typingActiveRef.current = next;
        return;
      }
      if (typingActiveRef.current === next) {
        return;
      }
      typingActiveRef.current = next;
      emitDirectTyping(socket, chatId, next);
    },
    [chatId],
  );

  const stopTyping = useCallback(() => {
    if (typingPauseTimeoutRef.current) {
      clearTimeout(typingPauseTimeoutRef.current);
      typingPauseTimeoutRef.current = null;
    }
    setTypingState(false);
  }, [setTypingState]);

  const handleInputChange = useCallback(
    (value: string) => {
      setInput(value);
      if (!chatId) {
        return;
      }

      const hasText = value.trim().length > 0;
      if (!hasText) {
        stopTyping();
        return;
      }

      setTypingState(true);

      if (typingPauseTimeoutRef.current) {
        clearTimeout(typingPauseTimeoutRef.current);
      }
      typingPauseTimeoutRef.current = setTimeout(() => {
        setTypingState(false);
      }, 1500);
    },
    [chatId, setTypingState, stopTyping],
  );

  const mergeMessages = useCallback((items: LocalDirectChatMessage[]) => {
    const byId = new Map<string, LocalDirectChatMessage>();
    const byClientId = new Map<string, string>();

    items.forEach((item) => {
      const messageId = item.id || item.localClientId;
      if (!messageId) {
        return;
      }

      const candidateClientId = item.clientId || item.localClientId || undefined;
      if (candidateClientId) {
        const existingMessageId = byClientId.get(candidateClientId);
        if (existingMessageId) {
          const existing = byId.get(existingMessageId);
          const candidateIsServerVersion = !item.localState;
          const existingIsLocalOnly = Boolean(existing?.localState);
          if (!candidateIsServerVersion || !existingIsLocalOnly) {
            return;
          }
          byId.delete(existingMessageId);
        }
        byClientId.set(candidateClientId, messageId);
      }

      const existingById = byId.get(messageId);
      if (!existingById) {
        byId.set(messageId, item);
        return;
      }

      if (!item.localState && existingById.localState) {
        byId.set(messageId, item);
      }
    });

    return Array.from(byId.values()).sort((a, b) => {
      const left = new Date(a.sentAt || 0).getTime();
      const right = new Date(b.sentAt || 0).getTime();
      if (left === right) {
        return (a.id || '').localeCompare(b.id || '');
      }
      return left - right;
    });
  }, []);

  const applyReactionLocally = useCallback(
    (messageId: string, userId: string, emoji: string | null) => {
      setMessages((current) =>
        current.map((message) => {
          if (message.id !== messageId) {
            return message;
          }

          const existing = (message.Reactions || []).filter(
            (reaction) => reaction.userId !== userId,
          );

          if (emoji) {
            return {
              ...message,
              Reactions: [...existing, { messageId, userId, emoji }],
            };
          }

          return {
            ...message,
            Reactions: existing,
          };
        }),
      );
    },
    [],
  );

  const loadThread = useCallback(async (options?: { silent?: boolean }) => {
    if (!chatId) {
      return;
    }

    const silent = options?.silent ?? false;
    if (!silent) {
      setLoading(true);
    }
    try {
      const [conversation, items] = await Promise.all([
        getDirectChat(chatId),
        getDirectMessages(chatId, { limit: PAGE_SIZE }),
      ]);
      setPartner(conversation.partner);
      setMessages((current) => {
        const localPending = current.filter((message) => Boolean(message.localState));
        const currentLastMessageId = current[current.length - 1]?.id || null;
        const nextItems = mergeMessages(items.items as LocalDirectChatMessage[]);
        const nextLastMessageId = nextItems[nextItems.length - 1]?.id || null;
        const hasNewTailMessage =
          Boolean(nextLastMessageId) && currentLastMessageId !== nextLastMessageId;

        if (!hasFirstLoadRef.current) {
          scheduleAutoScroll(false);
        } else if (hasNewTailMessage && isNearBottomRef.current) {
          scheduleAutoScroll(true);
        }

        return mergeMessages([...nextItems, ...localPending]);
      });
      setHasMoreMessages(items.hasMore);
      setNextCursor(items.nextCursor);
      hasFirstLoadRef.current = true;
      setErrorMessage(null);
      void markDirectChatRead(chatId);
    } catch (error) {
      if (!silent) {
        setErrorMessage(
          getApiErrorMessage(error, t('directChatLoadFailed')),
        );
      }
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [PAGE_SIZE, chatId, mergeMessages, scheduleAutoScroll, t]);

  const loadOlderMessages = useCallback(async () => {
    if (!chatId || loadingMore || !hasMoreMessages || !nextCursor) {
      return;
    }

    setLoadingMore(true);
    try {
      const page = await getDirectMessages(chatId, {
        limit: PAGE_SIZE,
        beforeMessageId: nextCursor,
      });

      setMessages((current) =>
        mergeMessages([...(page.items as LocalDirectChatMessage[]), ...current]),
      );
      setHasMoreMessages(page.hasMore);
      setNextCursor(page.nextCursor);
    } catch {
      // Silently ignore pagination errors to avoid breaking the current thread view.
    } finally {
      setLoadingMore(false);
    }
  }, [PAGE_SIZE, chatId, hasMoreMessages, loadingMore, mergeMessages, nextCursor]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void loadThread();
      const intervalId = setInterval(() => {
        if (cancelled) {
          return;
        }
        void loadThread({ silent: true });
      }, FALLBACK_SYNC_INTERVAL_MS);

      return () => {
        cancelled = true;
        clearInterval(intervalId);
      };
    }, [FALLBACK_SYNC_INTERVAL_MS, loadThread]),
  );

  useEffect(() => {
    let isMounted = true;

    const resolveUser = async () => {
      const token = await storage.getItem('userToken');
      const session = await resolveStoredUserSession();
      if (!session && token) {
        await clearAuthState();
        router.replace('/');
        return;
      }
      if (!isMounted) {
        return;
      }
      setCurrentUserId(session?.id ?? null);
    };

    void resolveUser();

    return () => {
      isMounted = false;
      if (typingPauseTimeoutRef.current) {
        clearTimeout(typingPauseTimeoutRef.current);
      }
      if (typingVisibilityTimeoutRef.current) {
        clearTimeout(typingVisibilityTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!chatId) {
      return undefined;
    }

    let isActive = true;
    let attachedSocket: Socket | null = null;

    const handleMessageNew = (incoming: DirectChatMessage) => {
      if (!incoming || (incoming.conversationId && incoming.conversationId !== chatId)) {
        return;
      }

      setMessages((current) => {
        const matchById = current.find((message) => message.id === incoming.id);
        if (matchById) {
          return current;
        }

        if (incoming.clientId) {
          const matchByClientId = current.find(
            (message) =>
              message.localClientId === incoming.clientId ||
              message.clientId === incoming.clientId,
          );
          if (matchByClientId) {
            return mergeMessages(
              current.map((message) =>
                message.id === matchByClientId.id
                  ? { ...incoming, localState: undefined, localPayload: undefined }
                  : message,
              ),
            );
          }
        }

        return mergeMessages([...current, incoming]);
      });

      if (incoming.User?.id !== currentUserId && isNearBottomRef.current) {
        scheduleAutoScroll(true);
      }
      if (incoming.User?.id !== currentUserId) {
        void markDirectChatRead(chatId);
      }
    };

    const handleMessageUpdated = (incoming: DirectChatMessage) => {
      if (!incoming || (incoming.conversationId && incoming.conversationId !== chatId)) {
        return;
      }
      setMessages((current) =>
        current.map((message) =>
          message.id === incoming.id
            ? { ...incoming, localState: undefined, localPayload: undefined }
            : message,
        ),
      );
    };

    const handleReadUpdated = (payload: { userId?: string; readAt?: string }) => {
      if (!payload?.userId || !payload.readAt || payload.userId === currentUserId) {
        return;
      }

      const boundary = new Date(payload.readAt).getTime();
      setMessages((current) =>
        current.map((message) => {
          if (message.User?.id !== currentUserId || !message.sentAt) {
            return message;
          }
          if (new Date(message.sentAt).getTime() > boundary) {
            return message;
          }
          return {
            ...message,
            deliveredAt: message.deliveredAt || payload.readAt,
            readAt: payload.readAt,
          };
        }),
      );
    };

    const handleDeliveredUpdated = (payload: {
      userId?: string;
      deliveredAt?: string;
    }) => {
      if (
        !payload?.userId ||
        !payload.deliveredAt ||
        payload.userId === currentUserId
      ) {
        return;
      }

      const boundary = new Date(payload.deliveredAt).getTime();
      setMessages((current) =>
        current.map((message) => {
          if (message.User?.id !== currentUserId || !message.sentAt || message.readAt) {
            return message;
          }
          if (new Date(message.sentAt).getTime() > boundary) {
            return message;
          }
          return {
            ...message,
            deliveredAt: message.deliveredAt || payload.deliveredAt,
          };
        }),
      );
    };

    const handleReactionUpdated = (payload: {
      messageId?: string;
      userId?: string;
      emoji?: string | null;
    }) => {
      if (!payload?.messageId || !payload.userId) {
        return;
      }
      applyReactionLocally(payload.messageId, payload.userId, payload.emoji || null);
    };

    const handleTypingUpdated = (payload: {
      userId?: string;
      isTyping?: boolean;
    }) => {
      if (!payload?.userId || payload.userId === currentUserId) {
        return;
      }

      if (payload.isTyping) {
        setPartnerTyping(true);
        if (typingVisibilityTimeoutRef.current) {
          clearTimeout(typingVisibilityTimeoutRef.current);
        }
        typingVisibilityTimeoutRef.current = setTimeout(() => {
          setPartnerTyping(false);
        }, 2400);
        return;
      }

      setPartnerTyping(false);
    };

    const handleSocketConnect = () => {
      if (!isActive || !socketRef.current || !chatId) {
        return;
      }

      joinDirectConversation(socketRef.current, chatId);
      if (typingActiveRef.current) {
        emitDirectTyping(socketRef.current, chatId, true);
      }
      void loadThread({ silent: true });
    };

    void (async () => {
      const socket = await getDirectChatSocket();
      if (!isActive || !socket) {
        return;
      }

      attachedSocket = socket;
      socketRef.current = socket;
      joinDirectConversation(socket, chatId);
      if (typingActiveRef.current) {
        emitDirectTyping(socket, chatId, true);
      }

      socket.on('connect', handleSocketConnect);
      socket.on('message:new', handleMessageNew);
      socket.on('message:updated', handleMessageUpdated);
      socket.on('chat:read', handleReadUpdated);
      socket.on('chat:delivered', handleDeliveredUpdated);
      socket.on('message:reaction', handleReactionUpdated);
      socket.on('chat:typing', handleTypingUpdated);
    })();

    return () => {
      isActive = false;
      setPartnerTyping(false);
      if (typingVisibilityTimeoutRef.current) {
        clearTimeout(typingVisibilityTimeoutRef.current);
        typingVisibilityTimeoutRef.current = null;
      }
      if (attachedSocket) {
        emitDirectTyping(attachedSocket, chatId, false);
        attachedSocket.off('connect', handleSocketConnect);
        attachedSocket.off('message:new', handleMessageNew);
        attachedSocket.off('message:updated', handleMessageUpdated);
        attachedSocket.off('chat:read', handleReadUpdated);
        attachedSocket.off('chat:delivered', handleDeliveredUpdated);
        attachedSocket.off('message:reaction', handleReactionUpdated);
        attachedSocket.off('chat:typing', handleTypingUpdated);
        leaveDirectConversation(attachedSocket, chatId);
      }
    };
  }, [applyReactionLocally, chatId, currentUserId, loadThread, mergeMessages, scheduleAutoScroll]);

  useEffect(() => {
    if (!shouldAutoScrollRef.current || messages.length === 0) {
      return;
    }
    shouldAutoScrollRef.current = false;
    scrollToBottom(autoScrollAnimatedRef.current);
  }, [messages, scrollToBottom]);

  const getReplyPreviewText = useCallback(
    (message: DirectChatMessage | null) => {
      if (!message) {
        return t('directChatReplyUnknown');
      }
      if (message.isDeleted || message.deletedAt) {
        return t('directChatMessageDeleted');
      }
      const hasImages = (message.images || []).length > 0;
      const replySharedPostId = resolveSharedPostId(message);
      const baseContent = replySharedPostId
        ? stripSharedPostMarker(message.content || '', replySharedPostId)
        : message.content;
      const cleaned = stripReplyMarker(baseContent || '', resolveReplyToMessageId(message)).trim();
      if (cleaned) {
        return cleaned;
      }
      if (hasImages) {
        return (message.images || []).some((uri) => isVideoUrl(uri))
          ? t('directChatReplyMedia')
          : t('directChatReplyPhoto');
      }
      return t('directChatReplyUnknown');
    },
    [t],
  );

  useEffect(() => {
    const ids = messages
      .map((message) => resolveSharedPostId(message))
      .filter((value): value is string => Boolean(value));

    ids.forEach((id) => {
      if (sharedPosts[id] || fetchingSharedPostsRef.current.has(id)) {
        return;
      }
      fetchingSharedPostsRef.current.add(id);
      void getPostById(id)
        .then((post) => {
          setSharedPosts((current) => ({ ...current, [id]: post }));
        })
        .catch(() => {
          // Ignore if post cannot be loaded.
        })
        .finally(() => {
          fetchingSharedPostsRef.current.delete(id);
        });
    });
  }, [messages, sharedPosts]);

  const messageById = useMemo(() => {
    const map = new Map<string, DirectChatMessage>();
    messages.forEach((message) => {
      map.set(message.id, message);
    });
    return map;
  }, [messages]);

  const displayName = useMemo(() => {
    if (!partner) {
      return t('directChatTitleFallback');
    }
    return partner.displayName || partner.username || t('directChatTitleFallback');
  }, [partner, t]);

  const partnerAvatar = useMemo(
    () => getImageUrl(partner?.avatarUrl),
    [partner?.avatarUrl],
  );
  const partnerInitial = useMemo(() => {
    if (!partner) {
      return '\u2022';
    }
    return (partner.displayName || partner.username || '\u2022')
      .trim()
      .charAt(0)
      .toUpperCase();
  }, [partner]);

  const formatTime = useCallback(
    (value?: string | null) => {
      if (!value) {
        return '';
      }
      const date = new Date(value);
      return date.toLocaleTimeString(locale, {
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    [locale],
  );

  const getOwnMessageStatusToken = useCallback(
    (message: LocalDirectChatMessage) => {
      if (message.localState === 'failed') {
        return '!';
      }
      if (message.localState === 'sending') {
        return '...';
      }
      if (message.readAt) {
        return '\u2713\u2713';
      }
      if (message.deliveredAt) {
        return '\u2713\u2713';
      }
      return '\u2713';
    },
    [],
  );

  const getOwnMessageStatusColor = useCallback(
    (message: LocalDirectChatMessage) => {
      if (message.localState === 'failed') {
        return '#ef4444';
      }
      if (message.readAt) {
        return statusAccentColor;
      }
      if (message.localState === 'sending') {
        return 'rgba(255,255,255,0.78)';
      }
      if (message.deliveredAt) {
        return 'rgba(255,255,255,0.74)';
      }
      return 'rgba(255,255,255,0.62)';
    },
    [statusAccentColor],
  );

  const formatDayLabel = useCallback(
    (value?: string | null) => {
      if (!value) {
        return '';
      }

      const date = new Date(value);
      const today = new Date();
      const yesterday = new Date();
      yesterday.setDate(today.getDate() - 1);

      const isSameDay = (a: Date, b: Date) =>
        a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() &&
        a.getDate() === b.getDate();

      if (isSameDay(date, today)) {
        return t('directChatDateToday');
      }

      if (isSameDay(date, yesterday)) {
        return t('directChatDateYesterday');
      }

      return date.toLocaleDateString(locale, {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
      });
    },
    [locale, t],
  );

  const getDayKey = useCallback((value?: string | null) => {
    if (!value) {
      return '';
    }
    const date = new Date(value);
    return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  }, []);

  const handlePickImages = async () => {
    if (pendingImages.length >= MAX_MESSAGE_IMAGES) {
      Alert.alert(
        t('commonErrorTitle'),
        t('directChatImageLimit', { count: MAX_MESSAGE_IMAGES }),
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images', 'videos'],
      allowsMultipleSelection: true,
      quality: 0.6,
    });

    if (!result.canceled) {
      setPendingImages((current) => {
        const remaining = MAX_MESSAGE_IMAGES - current.length;
        const picked = result.assets.slice(0, remaining);
        return [...current, ...picked];
      });
    }
  };

  const removePendingImage = (uri: string) => {
    setPendingImages((current) => current.filter((item) => item.uri !== uri));
  };

  const handleSend = async () => {
    const content = input.trim();
    if ((!content && pendingImages.length === 0) || !chatId || sending) {
      return;
    }

    stopTyping();
    setSending(true);
    setUploadProgress(pendingImages.length > 0 ? 0 : null);
    try {
      if (editingMessageId) {
        const editingMessage = messageById.get(editingMessageId);
        const updated = await updateDirectMessage(
          chatId,
          editingMessageId,
          {
            content,
            replyToMessageId: editingReplyToId,
            sharedPostId: resolveSharedPostId(editingMessage),
          },
        );
        setMessages((prev) =>
          prev.map((message) =>
            message.id === updated.id ? updated : message,
          ),
        );
        setEditingMessageId(null);
        setEditingReplyToId(null);
        setInput('');
      } else {
        const clientId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
        const payload = {
          content: content || undefined,
          clientId,
          replyToMessageId,
        };
        const optimisticId = `temp-${clientId}`;
        const optimisticMessage: LocalDirectChatMessage = {
          id: optimisticId,
          conversationId: chatId,
          clientId,
          localClientId: clientId,
          localState: 'sending',
          localPayload: {
            content: payload.content,
            replyToMessageId,
            images: pendingImages.map((item) => ({ uri: item.uri })),
          },
          content: content || '',
          images: pendingImages.map((item) => item.uri),
          replyToMessageId,
          sentAt: new Date().toISOString(),
          User: currentUserId ? { id: currentUserId } : null,
        };

        scheduleAutoScroll(true);
        setMessages((prev) => mergeMessages([...prev, optimisticMessage]));
        setInput('');
        setPendingImages([]);
        setReplyToMessageId(null);

        const message =
          pendingImages.length > 0
            ? await sendDirectMessageWithImages(chatId, {
                ...payload,
                images: pendingImages,
              }, {
                onUploadProgress: (progress) => {
                  setUploadProgress(progress);
                },
              })
            : await sendDirectMessage(chatId, payload);

        setMessages((prev) =>
          mergeMessages(
            prev.map((current) =>
              current.id === optimisticId ||
              current.localClientId === message.clientId
                ? { ...message, localState: undefined, localPayload: undefined }
                : current,
            ),
          ),
        );
        void markDirectChatRead(chatId);
      }
    } catch (error) {
      if (!editingMessageId) {
        setMessages((prev) =>
          prev.map((message) =>
            message.localState === 'sending'
              ? { ...message, localState: 'failed' }
              : message,
          ),
        );
      }
      setErrorMessage(
        getApiErrorMessage(error, t('directChatSendFailed')),
      );
    } finally {
      setSending(false);
      setUploadProgress(null);
    }
  };

  const retryFailedMessage = useCallback(
    async (messageId: string) => {
      const failed = messages.find((message) => message.id === messageId);
      if (!failed || failed.localState !== 'failed' || !failed.localPayload || !chatId) {
        return;
      }

      setMessages((current) =>
        current.map((message) =>
          message.id === messageId ? { ...message, localState: 'sending' } : message,
        ),
      );
      setUploadProgress(failed.localPayload.images?.length ? 0 : null);

      try {
        const sent = failed.localPayload.images?.length
          ? await sendDirectMessageWithImages(chatId, {
              ...failed.localPayload,
              clientId: failed.localClientId,
            }, {
              onUploadProgress: (progress) => {
                setUploadProgress(progress);
              },
            })
          : await sendDirectMessage(chatId, {
              ...failed.localPayload,
              clientId: failed.localClientId,
            });

        setMessages((current) =>
          mergeMessages(
            current.map((message) =>
              message.id === messageId
                ? { ...sent, localState: undefined, localPayload: undefined }
                : message,
            ),
          ),
        );
      } catch {
        setMessages((current) =>
          current.map((message) =>
            message.id === messageId ? { ...message, localState: 'failed' } : message,
          ),
        );
      } finally {
        setUploadProgress(null);
      }
    },
    [chatId, mergeMessages, messages],
  );
  const sendEnabled = Boolean(input.trim() || pendingImages.length > 0);
  const previewVisible = previewImages.length > 0;
  const showActions = Boolean(actionMessage);
  const actionIsDeleted = Boolean(actionMessage?.isDeleted || actionMessage?.deletedAt);
  const actionIsMine = actionMessage?.User?.id === currentUserId;
  const openUpward = actionPosition
    ? actionPosition.y > screenHeight * 0.55
    : false;
  const actionMessageImages = actionIsDeleted
    ? []
    : (actionMessage?.images || [])
        .map((image) => getImageUrl(image) || image)
        .filter(Boolean);
  const actionVisibleImages = actionMessageImages.slice(0, maxInlineImages);
  const actionRemainingImages =
    actionMessageImages.length - actionVisibleImages.length;
  const actionSharedPostId = actionIsDeleted
    ? null
    : resolveSharedPostId(actionMessage);
  const actionSharedPost = actionSharedPostId
    ? sharedPosts[actionSharedPostId]
    : null;
  const actionReplyToId = actionIsDeleted
    ? null
    : resolveReplyToMessageId(actionMessage);
  const actionReplyMessage = actionReplyToId
    ? messageById.get(actionReplyToId) ?? null
    : null;
  const actionReplyPreviewText = actionReplyToId
    ? getReplyPreviewText(actionReplyMessage)
    : '';
  const actionDisplayContent = actionSharedPostId
    ? stripSharedPostMarker(actionMessage?.content ?? '', actionSharedPostId)
    : actionMessage?.content ?? '';
  const actionDisplayText = actionIsDeleted
    ? t('directChatMessageDeleted')
    : stripReplyMarker(actionDisplayContent, actionReplyToId);
  const actionIsImageOnly = actionMessageImages.length > 0 && !actionDisplayText;
  const actionIsSingleImageOnly =
    actionIsImageOnly && actionMessageImages.length === 1;
  const actionGridVisibleCount = actionIsSingleImageOnly
    ? 1
    : Math.min(gridColumns, actionVisibleImages.length);
  const actionImageGridWidth = actionIsSingleImageOnly
    ? largeImageWidth
    : gridImageSize * actionGridVisibleCount +
      gridGap * Math.max(0, actionGridVisibleCount - 1);

  const openPreview = useCallback((images: string[], index: number) => {
    setPreviewImages(images);
    setPreviewIndex(index);
  }, []);

  const closePreview = useCallback(() => {
    setPreviewImages([]);
    setPreviewIndex(0);
  }, []);

  useEffect(() => {
    if (!previewVisible) {
      return;
    }
    requestAnimationFrame(() => {
      previewListRef.current?.scrollToIndex({
        index: previewIndex,
        animated: false,
      });
    });
  }, [previewIndex, previewVisible]);

  const shareImage = useCallback(async (uri: string) => {
    try {
      await Share.share({ url: uri, message: uri });
    } catch {
      // ignore
    }
  }, []);

  const saveImage = useCallback(
    async (uri: string) => {
      try {
        const permission = await MediaLibrary.requestPermissionsAsync();
        if (permission.status !== 'granted') {
          Alert.alert(t('commonErrorTitle'), t('directChatImageSaveDenied'));
          return;
        }

        let localUri = uri;
        if (uri.startsWith('http')) {
          const filename = uri.split('/').pop() || `image-${Date.now()}.jpg`;
          const download = await FileSystem.downloadAsync(
            uri,
            `${FileSystem.cacheDirectory}${filename}`,
          );
          localUri = download.uri;
        }

        await MediaLibrary.saveToLibraryAsync(localUri);
        Alert.alert(t('directChatImageSaved'));
      } catch {
        Alert.alert(t('commonErrorTitle'), t('directChatImageSaveFailed'));
      }
    },
    [t],
  );

  const handleImageActions = useCallback(
    (uri: string) => {
      Alert.alert(t('directChatImageActionTitle'), undefined, [
        {
          text: t('directChatImageShare'),
          onPress: () => void shareImage(uri),
        },
        {
          text: t('directChatImageSave'),
          onPress: () => void saveImage(uri),
        },
        {
          text: t('genericCancel'),
          style: 'cancel',
        },
      ]);
    },
    [saveImage, shareImage, t],
  );

  const openMessageActions = useCallback((message: DirectChatMessage) => {
    if (!message || message.isDeleted) {
      return;
    }
    Keyboard.dismiss();
    const ref = messageRefs.current[message.id];
    if (ref && typeof ref.measureInWindow === 'function') {
      ref.measureInWindow((x, y, width, height) => {
        setActionPosition({ x, y, width, height });
        setActionMessage(message);
      });
    } else {
      setActionPosition(null);
      setActionMessage(message);
    }
  }, []);

  const closeMessageActions = useCallback(() => {
    setActionMessage(null);
    setActionPosition(null);
    setPressedMessageId(null);
  }, []);

  const startEditingMessage = useCallback(() => {
    if (!actionMessage) {
      return;
    }
    stopTyping();
    const resolvedReplyToId = resolveReplyToMessageId(actionMessage);
    const sharedPostId = resolveSharedPostId(actionMessage);
    const baseContent = sharedPostId
      ? stripSharedPostMarker(actionMessage.content || '', sharedPostId)
      : actionMessage.content || '';

    setEditingMessageId(actionMessage.id);
    setReplyToMessageId(null);
    setEditingReplyToId(resolvedReplyToId);
    setInput(stripReplyMarker(baseContent, resolvedReplyToId));
    setPendingImages([]);
    closeMessageActions();
  }, [actionMessage, closeMessageActions, stopTyping]);

  const startReplyMessage = useCallback(() => {
    if (!actionMessage) {
      return;
    }
    setReplyToMessageId(actionMessage.id);
    closeMessageActions();
    requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
  }, [actionMessage, closeMessageActions]);

  const cancelReplyMessage = useCallback(() => {
    setReplyToMessageId(null);
  }, []);

  const cancelEditingMessage = useCallback(() => {
    stopTyping();
    setEditingMessageId(null);
    setEditingReplyToId(null);
    setInput('');
  }, [stopTyping]);

  const confirmDeleteMessage = useCallback(() => {
    if (!actionMessage || !chatId) {
      return;
    }
    Alert.alert(
      t('directChatDeleteTitle'),
      t('directChatDeleteMessage'),
      [
        { text: t('directChatActionCancel'), style: 'cancel' },
        {
          text: t('directChatActionDelete'),
          style: 'destructive',
          onPress: () => {
            void (async () => {
              try {
                const deleted = await deleteDirectMessage(
                  chatId,
                  actionMessage.id,
                );
                setMessages((prev) =>
                  prev.map((message) =>
                    message.id === deleted.id ? deleted : message,
                  ),
                );
              } catch (error) {
                setErrorMessage(
                  getApiErrorMessage(error, t('directChatDeleteFailed')),
                );
              } finally {
                closeMessageActions();
              }
            })();
          },
        },
      ],
    );
  }, [
    actionMessage,
    chatId,
    closeMessageActions,
    t,
  ]);

  const handleCopyMessage = useCallback(async () => {
    if (!actionMessage) {
      return;
    }
    const sharedPostId = resolveSharedPostId(actionMessage);
    const replyToId = resolveReplyToMessageId(actionMessage);
    const baseContent = sharedPostId
      ? stripSharedPostMarker(actionMessage.content || '', sharedPostId)
      : actionMessage.content || '';
    const cleaned = stripReplyMarker(baseContent, replyToId).trim();
    if (!cleaned) {
      Alert.alert(t('commonErrorTitle'), t('directChatCopyFailed'));
      return;
    }
    try {
      await Clipboard.setStringAsync(cleaned);
      Alert.alert(t('directChatCopySuccess'));
      closeMessageActions();
    } catch {
      Alert.alert(t('commonErrorTitle'), t('directChatCopyFailed'));
    }
  }, [
    actionMessage,
    closeMessageActions,
    t,
  ]);

  const handleForwardMessage = useCallback(async () => {
    if (!actionMessage) {
      return;
    }
    const sharedPostId = resolveSharedPostId(actionMessage);
    const replyToId = resolveReplyToMessageId(actionMessage);
    const baseContent = sharedPostId
      ? stripSharedPostMarker(actionMessage.content || '', sharedPostId)
      : actionMessage.content || '';
    const cleaned = stripReplyMarker(baseContent, replyToId).trim();
    const messageImages = (actionMessage.images || [])
      .map((image) => getImageUrl(image) || image)
      .filter(Boolean);
    try {
      if (messageImages.length > 0) {
        await Share.share({
          message: cleaned || t('directChatReplyMedia'),
          url: messageImages[0],
        });
      } else {
        await Share.share({ message: cleaned || '' });
      }
      closeMessageActions();
    } catch {
      Alert.alert(t('commonErrorTitle'), t('directChatForwardFailed'));
    }
  }, [
    actionMessage,
    closeMessageActions,
    t,
  ]);

  const handlePressInMessage = useCallback((messageId: string) => {
    setPressedMessageId(messageId);
  }, []);

  const handlePressOutMessage = useCallback((messageId: string) => {
    setPressedMessageId((current) => (current === messageId ? null : current));
  }, []);

  const handleLongPressMessage = useCallback(
    (message: DirectChatMessage) => {
      if (!message || message.isDeleted) {
        return;
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setPressedMessageId(null);
      openMessageActions(message);
    },
    [openMessageActions],
  );

  const handleReaction = useCallback(
    async (emoji: string) => {
      if (!actionMessage || !chatId) {
        closeMessageActions();
        return;
      }
      if (actionMessage.isDeleted || actionMessage.deletedAt) {
        closeMessageActions();
        return;
      }
      if (!currentUserId) {
        closeMessageActions();
        return;
      }

      const normalizedEmoji = emoji.trim();
      if (!normalizedEmoji) {
        closeMessageActions();
        return;
      }

      const existingReaction = (actionMessage.Reactions || []).find(
        (reaction) => reaction.userId === currentUserId,
      );

      applyReactionLocally(
        actionMessage.id,
        currentUserId,
        existingReaction?.emoji === normalizedEmoji ? null : normalizedEmoji,
      );
      closeMessageActions();

      try {
        if (existingReaction?.emoji === normalizedEmoji) {
          await removeDirectMessageReaction(chatId, actionMessage.id);
        } else {
          await addDirectMessageReaction(chatId, actionMessage.id, normalizedEmoji);
        }
      } catch (error) {
        applyReactionLocally(
          actionMessage.id,
          currentUserId,
          existingReaction?.emoji || null,
        );
        setErrorMessage(getApiErrorMessage(error, t('directChatSendFailed')));
      }
    },
    [actionMessage, applyReactionLocally, chatId, closeMessageActions, currentUserId, t],
  );

  const actionMenuItems = useMemo(() => {
    if (!actionMessage) {
      return [];
    }

    const items: {
      key: string;
      label: string;
      onPress: () => void;
      danger?: boolean;
    }[] = [
      {
        key: 'reply',
        label: t('directChatActionReply'),
        onPress: startReplyMessage,
      },
      {
        key: 'copy',
        label: t('directChatActionCopy'),
        onPress: handleCopyMessage,
      },
      {
        key: 'forward',
        label: t('directChatActionForward'),
        onPress: handleForwardMessage,
      },
    ];

    const actionBaseContent = actionMessage.content || '';
    const actionBaseSharedPostId = resolveSharedPostId(actionMessage);
    const actionBaseReplyId = resolveReplyToMessageId(actionMessage);
    const actionCleanContent = stripReplyMarker(
      actionBaseSharedPostId
        ? stripSharedPostMarker(actionBaseContent, actionBaseSharedPostId)
        : actionBaseContent,
      actionBaseReplyId,
    ).trim();

    if (actionIsMine && actionCleanContent) {
      items.push({
        key: 'edit',
        label: t('directChatActionEdit'),
        onPress: startEditingMessage,
      });
    }

    if (actionIsMine) {
      items.push({
        key: 'delete',
        label: t('directChatActionDelete'),
        onPress: confirmDeleteMessage,
        danger: true,
      });
    }

    return items;
  }, [
    actionIsMine,
    actionMessage,
    confirmDeleteMessage,
    handleCopyMessage,
    handleForwardMessage,
    startReplyMessage,
    startEditingMessage,
    t,
  ]);

  if (loading) {
    return (
      <View className="flex-1 items-center justify-center bg-gray-50 dark:bg-black">
        <ActivityIndicator color="#4c669f" />
      </View>
    );
  }

  return (
    <ChatScreenShell>
      <View className="flex-row items-center border-b border-gray-200 px-5 pb-3 pt-14 dark:border-gray-800">
        <TouchableOpacity onPress={() => router.back()} className="mr-4">
          <Ionicons name="arrow-back" size={24} color="#4c669f" />
        </TouchableOpacity>
        {partnerAvatar ? (
          <Image
            source={{ uri: partnerAvatar }}
            className="mr-3 h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-800"
          />
        ) : (
          <View className="mr-3 h-10 w-10 items-center justify-center rounded-full bg-[#4c669f]/15">
            <Text className="text-sm font-semibold text-[#4c669f]">
              {partnerInitial}
            </Text>
          </View>
        )}
        <Text className="text-lg font-bold text-gray-900 dark:text-white">
          {displayName}
        </Text>
      </View>

      {errorMessage ? (
        <View className="mx-5 mb-3 rounded-2xl bg-red-100 px-4 py-3 dark:bg-red-900/30">
          <Text className="text-xs font-semibold text-red-700 dark:text-red-300">
            {errorMessage}
          </Text>
        </View>
      ) : null}

      {editingMessageId ? (
        <View className="mx-5 mb-3 flex-row items-center justify-between rounded-2xl bg-gray-100 px-4 py-2 dark:bg-gray-900">
          <Text className="text-xs font-semibold text-gray-700 dark:text-gray-200">
            {t('directChatEditingLabel')}
          </Text>
          <TouchableOpacity onPress={cancelEditingMessage}>
            <Text className="text-xs font-semibold text-[#4c669f]">
              {t('directChatEditingCancel')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        initialNumToRender={24}
        maxToRenderPerBatch={16}
        windowSize={9}
        removeClippedSubviews
        maintainVisibleContentPosition={{
          minIndexForVisible: 0,
          autoscrollToTopThreshold: 20,
        }}
        scrollEnabled={!showActions}
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } =
            event.nativeEvent;
          const distanceFromBottom =
            contentSize.height - (contentOffset.y + layoutMeasurement.height);
          isNearBottomRef.current = distanceFromBottom <= 80;

          if (contentOffset.y <= 120) {
            void loadOlderMessages();
          }
        }}
        scrollEventThrottle={16}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 24, paddingTop: 8 }}
        renderItem={({ item, index }) => {
          const isMine = item.User?.id === currentUserId;
          const isFailed = item.localState === 'failed';
          const bubbleTone = isMine
            ? 'bg-[#4c669f] text-white'
            : 'bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-100';
          const isDeleted = Boolean(item.isDeleted || item.deletedAt);
          const messageImages = isDeleted
            ? []
            : (item.images || [])
                .map((image) => getImageUrl(image) || image)
                .filter(Boolean);
          const visibleImages = messageImages.slice(0, maxInlineImages);
          const remainingImages = messageImages.length - visibleImages.length;
          const sharedPostId = isDeleted ? null : resolveSharedPostId(item);
          const sharedPost = sharedPostId ? sharedPosts[sharedPostId] : null;
          const replyToId = isDeleted ? null : resolveReplyToMessageId(item);
          const replyMessage = replyToId
            ? messageById.get(replyToId) ?? null
            : null;
          const replyPreviewText = replyToId
            ? getReplyPreviewText(replyMessage)
            : '';
          const displayContent = sharedPostId
            ? stripSharedPostMarker(item.content || '', sharedPostId)
            : item.content || '';
          const displayText = isDeleted
            ? t('directChatMessageDeleted')
            : stripReplyMarker(displayContent, replyToId);
          const sharedTitle = sharedPost?.content
            ? sharedPost.content.split('\n')[0]?.trim()
            : t('postItemPlanFallback');
          const sharedLocation = [sharedPost?.placeName, sharedPost?.cityName]
            .map((value) => (value || '').trim())
            .filter(Boolean)
            .join(' - ');
          const sharedImage = getImageUrl(
            sharedPost?.images?.[0] ||
              sharedPost?.Event?.images?.[0] ||
              sharedPost?.Event?.coverUrl ||
              sharedPost?.Place?.coverUrl ||
              sharedPost?.Event?.Place?.coverUrl,
          );
          const dayKey = getDayKey(item.sentAt);
          const previousDayKey =
            index > 0 ? getDayKey(messages[index - 1]?.sentAt) : '';
          const showDayLabel = Boolean(dayKey && dayKey !== previousDayKey);
          const timeLabel = formatTime(item.sentAt);
          const isImageOnly = messageImages.length > 0 && !displayText;
          const isSingleImageOnly = isImageOnly && messageImages.length === 1;
          const reactionSummary = Object.values(
            (item.Reactions || []).reduce<
              Record<string, { emoji: string; count: number; me: boolean }>
            >((accumulator, reaction) => {
              if (!accumulator[reaction.emoji]) {
                accumulator[reaction.emoji] = {
                  emoji: reaction.emoji,
                  count: 0,
                  me: false,
                };
              }
              accumulator[reaction.emoji].count += 1;
              if (reaction.userId === currentUserId) {
                accumulator[reaction.emoji].me = true;
              }
              return accumulator;
            }, {}),
          );
          const gridVisibleCount = isSingleImageOnly
            ? 1
            : Math.min(gridColumns, visibleImages.length);
          const imageGridWidth = isSingleImageOnly
            ? largeImageWidth
            : gridImageSize * gridVisibleCount +
              gridGap * Math.max(0, gridVisibleCount - 1);
          const canOpenActions = !isDeleted && !item.localState;
          const isActionTarget = actionMessage?.id === item.id;
          const highlightStyle = isActionTarget
            ? {
                borderWidth: 1,
                borderColor: '#4c669f',
                borderRadius: 18,
                shadowColor: '#000',
                shadowOpacity: 0.25,
                shadowRadius: 10,
                shadowOffset: { width: 0, height: 4 },
                elevation: 6,
              }
            : undefined;
          return (
            <View className={`mb-3 ${isMine ? 'items-end' : 'items-start'}`}>
              {showDayLabel ? (
                <View className="mb-3 w-full items-center">
                  <Text className="rounded-full bg-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                    {formatDayLabel(item.sentAt)}
                  </Text>
                </View>
              ) : null}
              {sharedPostId ? (
                <TouchableOpacity
                  onPress={() => {
                    router.push({
                      pathname: '/post-view/[id]',
                      params: { id: sharedPostId },
                    });
                  }}
                  className={`mb-2 w-[80%] overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${
                    isMine ? 'self-end' : 'self-start'
                  }`}
                >
                  {sharedImage ? (
                    <Image
                      source={{ uri: sharedImage }}
                      className="h-32 w-full bg-gray-200 dark:bg-gray-800"
                      resizeMode="cover"
                    />
                  ) : null}
                  <View className="px-4 py-3">
                    <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                      {sharedTitle || t('postItemPlanFallback')}
                    </Text>
                    {sharedLocation ? (
                      <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {sharedLocation}
                      </Text>
                    ) : null}
                    <Text className="mt-2 text-xs font-semibold text-[#4c669f]">
                      {t('postShareOpen')}
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : null}
              {(messageImages.length > 0 || displayText) ? (
                <FocusMessage
                  active={isActionTarget}
                  pressed={pressedMessageId === item.id}
                  style={[
                    isImageOnly ? { width: imageGridWidth } : undefined,
                    highlightStyle,
                  ]}
                >
                  <View
                    ref={(ref) => {
                      messageRefs.current[item.id] = ref;
                    }}
                    className={
                      isImageOnly
                        ? isMine
                          ? 'self-end'
                          : 'self-start'
                        : `max-w-[80%] rounded-2xl px-3 py-3 ${bubbleTone}`
                    }
                  >
                    {replyToId ? (
                      <View
                        className={`mb-2 rounded-xl px-2 py-1 ${
                          isMine
                            ? 'bg-white/15'
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      >
                        <Text
                          numberOfLines={1}
                          className={`text-[11px] font-semibold ${
                            isMine
                              ? 'text-white/80'
                              : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {replyPreviewText}
                        </Text>
                      </View>
                    ) : null}
                    {messageImages.length > 0 ? (
                      <View
                        className={
                          isImageOnly
                            ? 'flex-row flex-wrap gap-2'
                            : 'mb-2 flex-row flex-wrap gap-2'
                        }
                      >
                        {visibleImages.map((image, imageIndex) => (
                          <MessageImage
                            key={image}
                            uri={image}
                            onPress={() => openPreview(messageImages, imageIndex)}
                            onPressIn={() => handlePressInMessage(item.id)}
                            onPressOut={() => handlePressOutMessage(item.id)}
                            onLongPress={
                              canOpenActions
                                ? () => handleLongPressMessage(item)
                                : undefined
                            }
                            width={isSingleImageOnly ? largeImageWidth : gridImageSize}
                            height={isSingleImageOnly ? largeImageHeight : gridImageSize}
                            overlayLabel={
                              remainingImages > 0 &&
                              imageIndex === visibleImages.length - 1
                                ? `+${remainingImages}`
                                : undefined
                            }
                          />
                        ))}
                      </View>
                    ) : null}
                    {displayText ? (
                      <TouchableOpacity
                        activeOpacity={1}
                        onPressIn={() => handlePressInMessage(item.id)}
                        onPressOut={() => handlePressOutMessage(item.id)}
                        onLongPress={
                          canOpenActions
                            ? () => handleLongPressMessage(item)
                            : undefined
                        }
                        delayLongPress={350}
                      >
                        <Text
                          className={`${
                            isDeleted
                              ? 'text-gray-400 dark:text-gray-500 italic'
                              : isMine
                                ? 'text-white'
                                : 'text-gray-800 dark:text-gray-100'
                          }`}
                        >
                          {displayText}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                    {timeLabel ? (
                      <Text
                        className={`mt-2 w-full text-[10px] text-right ${
                          isMine
                            ? 'text-white/70'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {timeLabel}
                        {isMine ? (
                          <Text style={{ color: getOwnMessageStatusColor(item) }}>
                            {` | ${getOwnMessageStatusToken(item)}`}
                          </Text>
                        ) : null}
                        {item.editedAt && !isDeleted
                          ? ` | ${t('directChatMessageEdited')}`
                          : ''}
                      </Text>
                    ) : null}
                    {reactionSummary.length > 0 ? (
                      <View className="mt-2 flex-row flex-wrap gap-2">
                        {reactionSummary.map((reaction) => (
                          <View
                            key={reaction.emoji}
                            className={`rounded-full px-2 py-1 ${
                              reaction.me
                                ? 'bg-white/25'
                                : isMine
                                  ? 'bg-white/15'
                                  : 'bg-gray-100 dark:bg-gray-800'
                            }`}
                          >
                            <Text
                              className={`text-xs font-semibold ${
                                isMine ? 'text-white' : 'text-gray-700 dark:text-gray-200'
                              }`}
                            >
                              {reaction.emoji} {reaction.count}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}
                    {isMine && isFailed ? (
                      <TouchableOpacity
                        onPress={() => void retryFailedMessage(item.id)}
                        className="mt-2 self-end rounded-full bg-red-500/15 px-2 py-1"
                      >
                        <Text className="text-[11px] font-semibold text-red-500">
                          {t('directChatRetryAction')}
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </FocusMessage>
              ) : null}
            </View>
          );
        }}
        ListEmptyComponent={
          <View className="mt-16 items-center px-6">
            <Text className="text-base text-gray-500 dark:text-gray-400">
              {t('directChatEmptyTitle')}
            </Text>
            <Text className="mt-2 text-center text-sm text-gray-400 dark:text-gray-500">
              {t('directChatEmptyDescription')}
            </Text>
          </View>
        }
        ListHeaderComponent={
          loadingMore ? (
            <View className="pb-3 pt-1">
              <ActivityIndicator color="#4c669f" />
            </View>
          ) : null
        }
      />

      <View className="px-4 pb-6 pt-2">
        {replyToMessageId ? (
          <View className="mb-3 flex-row items-center justify-between rounded-2xl bg-gray-100 px-4 py-2 dark:bg-gray-900">
            <View className="flex-1 pr-3">
              <Text className="text-[11px] font-semibold text-gray-700 dark:text-gray-200">
                {t('directChatReplyingLabel')}
              </Text>
              <Text
                numberOfLines={1}
                className="text-xs text-gray-500 dark:text-gray-400"
              >
                {getReplyPreviewText(
                  (replyToMessageId ? messageById.get(replyToMessageId) : null) ??
                    null,
                )}
              </Text>
            </View>
            <TouchableOpacity onPress={cancelReplyMessage}>
              <Text className="text-xs font-semibold text-[#4c669f]">
                {t('directChatReplyingCancel')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
        {partnerTyping ? (
          <View className="mb-3 self-start rounded-full bg-gray-100 px-3 py-1.5 dark:bg-gray-900">
            <Text className="text-[11px] font-semibold text-gray-600 dark:text-gray-300">
              {`${displayName} ${t('directChatTypingSuffix')}`}
            </Text>
          </View>
        ) : null}
        <ChatComposer
          inputRef={inputRef}
          input={input}
          onChangeInput={handleInputChange}
          placeholder={t('directChatInputPlaceholder')}
          pendingImages={pendingImages}
          onRemoveImage={removePendingImage}
          onPickImages={handlePickImages}
          onSend={handleSend}
          sending={sending}
          sendEnabled={sendEnabled}
          isDark={isDark}
          uploadProgress={uploadProgress}
        />
      </View>

      <Modal
        transparent
        visible={showActions}
        onRequestClose={closeMessageActions}
        animationType="fade"
      >
        <View style={StyleSheet.absoluteFill}>
          <BlurView
            intensity={18}
            tint={isDark ? 'dark' : 'light'}
            style={StyleSheet.absoluteFill}
          />
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0,0,0,0.35)' }]} />
        </View>
        <TouchableOpacity
          activeOpacity={1}
          onPress={closeMessageActions}
          style={StyleSheet.absoluteFill}
        />
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
          <View className="flex-1 justify-center px-5" pointerEvents="box-none">
            <View
              style={{ alignItems: actionIsMine ? 'flex-end' : 'flex-start' }}
            >
              {openUpward ? (
                <View
                  className="mb-3 w-80 rounded-3xl bg-white p-6 shadow-lg dark:bg-gray-900"
                >
                  {actionMenuItems.map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      onPress={item.onPress}
                      className="rounded-2xl px-5 py-4"
                    >
                      <Text
                        className={`text-lg font-semibold ${
                          item.danger
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <View className="mb-3 flex-row items-center gap-3 rounded-full bg-white px-4 py-3 shadow-lg dark:bg-gray-900">
                {[
                  '\u2764\uFE0F',
                  '\uD83D\uDE02',
                  '\uD83D\uDE2E',
                  '\uD83D\uDE22',
                  '\uD83D\uDC4D',
                  '\uD83D\uDC4E',
                ].map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    onPress={() => handleReaction(emoji)}
                  >
                    <Text className="text-lg">{emoji}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {actionSharedPostId && actionSharedPost ? (
                <View
                  className={`mb-2 w-[80%] overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900 ${
                    actionIsMine ? 'self-end' : 'self-start'
                  }`}
                >
                  {getImageUrl(
                    actionSharedPost?.images?.[0] ||
                      actionSharedPost?.Event?.images?.[0] ||
                      actionSharedPost?.Event?.coverUrl ||
                      actionSharedPost?.Place?.coverUrl ||
                      actionSharedPost?.Event?.Place?.coverUrl,
                  ) ? (
                    <Image
                      source={{
                        uri: getImageUrl(
                          actionSharedPost?.images?.[0] ||
                            actionSharedPost?.Event?.images?.[0] ||
                            actionSharedPost?.Event?.coverUrl ||
                            actionSharedPost?.Place?.coverUrl ||
                            actionSharedPost?.Event?.Place?.coverUrl,
                        )!,
                      }}
                      className="h-32 w-full bg-gray-200 dark:bg-gray-800"
                      resizeMode="cover"
                    />
                  ) : null}
                  <View className="px-4 py-3">
                    <Text className="text-sm font-semibold text-gray-900 dark:text-white">
                      {(actionSharedPost?.content || '').split('\n')[0]?.trim() ||
                        t('postItemPlanFallback')}
                    </Text>
                    {[
                      actionSharedPost?.placeName,
                      actionSharedPost?.cityName,
                    ]
                      .map((value) => (value || '').trim())
                      .filter(Boolean)
                      .join(' - ') ? (
                      <Text className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        {[
                          actionSharedPost?.placeName,
                          actionSharedPost?.cityName,
                        ]
                          .map((value) => (value || '').trim())
                          .filter(Boolean)
                          .join(' - ')}
                      </Text>
                    ) : null}
                  </View>
                </View>
              ) : null}
              {(actionMessageImages.length > 0 || actionDisplayText) ? (
                <FocusMessage
                  active
                  pressed={false}
                  style={[
                    actionIsImageOnly ? { width: actionImageGridWidth } : undefined,
                  ]}
                >
                  <View
                    className={
                      actionIsImageOnly
                        ? actionIsMine
                          ? 'self-end'
                          : 'self-start'
                        : `max-w-[80%] rounded-2xl px-3 py-3 ${
                            actionIsMine ? 'bg-[#4c669f] text-white' : 'bg-white text-gray-800 dark:bg-gray-900 dark:text-gray-100'
                          }`
                    }
                  >
                    {actionReplyToId ? (
                      <View
                        className={`mb-2 rounded-xl px-2 py-1 ${
                          actionIsMine
                            ? 'bg-white/15'
                            : 'bg-gray-100 dark:bg-gray-800'
                        }`}
                      >
                        <Text
                          numberOfLines={1}
                          className={`text-[11px] font-semibold ${
                            actionIsMine
                              ? 'text-white/80'
                              : 'text-gray-600 dark:text-gray-300'
                          }`}
                        >
                          {actionReplyPreviewText}
                        </Text>
                      </View>
                    ) : null}
                    {actionMessageImages.length > 0 ? (
                      <View className="mb-2 flex-row flex-wrap gap-2">
                        {actionVisibleImages.map((image, imageIndex) => (
                          <MessageImage
                            key={image}
                            uri={image}
                            onPress={() =>
                              openPreview(actionMessageImages, imageIndex)
                            }
                            width={
                              actionIsSingleImageOnly
                                ? largeImageWidth
                                : gridImageSize
                            }
                            height={
                              actionIsSingleImageOnly
                                ? largeImageHeight
                                : gridImageSize
                            }
                            overlayLabel={
                              actionRemainingImages > 0 &&
                              imageIndex === actionVisibleImages.length - 1
                                ? `+${actionRemainingImages}`
                                : undefined
                            }
                          />
                        ))}
                      </View>
                    ) : null}
                    {actionDisplayText ? (
                      <Text
                        className={`${
                          actionIsDeleted
                            ? 'text-gray-400 dark:text-gray-500 italic'
                            : actionIsMine
                              ? 'text-white'
                              : 'text-gray-800 dark:text-gray-100'
                        }`}
                      >
                        {actionDisplayText}
                      </Text>
                    ) : null}
                    {actionMessage?.sentAt ? (
                      <Text
                        className={`mt-2 w-full text-[10px] text-right ${
                          actionIsMine
                            ? 'text-white/70'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {formatTime(actionMessage.sentAt)}
                      </Text>
                    ) : null}
                  </View>
                </FocusMessage>
              ) : null}

              {!openUpward ? (
                <View
                  className="mt-3 w-80 rounded-3xl bg-white p-6 shadow-lg dark:bg-gray-900"
                >
                  {actionMenuItems.map((item) => (
                    <TouchableOpacity
                      key={item.key}
                      onPress={item.onPress}
                      className="rounded-2xl px-5 py-4"
                    >
                      <Text
                        className={`text-lg font-semibold ${
                          item.danger
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-gray-900 dark:text-white'
                        }`}
                      >
                        {item.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={previewVisible} onRequestClose={closePreview} animationType="fade">
        <StatusBar hidden />
        <View className="flex-1 bg-black">
          <FlatList
            ref={previewListRef}
            data={previewImages}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => `${item}-${index}`}
            getItemLayout={(_, index) => ({
              length: screenWidth,
              offset: screenWidth * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
              const index = Math.round(
                event.nativeEvent.contentOffset.x / screenWidth,
              );
              setPreviewIndex(index);
            }}
            renderItem={({ item, index }) => (
              <View
                style={{
                  width: screenWidth,
                  height: screenHeight,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ZoomableImage
                  uri={item}
                  width={screenWidth}
                  height={screenHeight}
                  shouldPlay={index === previewIndex}
                  onClose={closePreview}
                  onLongPress={() => handleImageActions(item)}
                />
              </View>
            )}
          />
          <View className="absolute left-0 right-0 top-12 items-center">
            <Text className="text-xs font-semibold text-white/70">
              {previewIndex + 1} / {previewImages.length}
            </Text>
          </View>
          <TouchableOpacity
            onPress={closePreview}
            className="absolute right-5 top-12 h-10 w-10 items-center justify-center rounded-full bg-white/15"
          >
            <Ionicons name="close" size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </Modal>
    </ChatScreenShell>
  );
}




