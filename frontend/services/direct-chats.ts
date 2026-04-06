import api from '@/services/api';
import {
  buildMediaUploadPayload,
  type MediaUploadAsset,
} from '@/services/media-upload';

export interface DirectChatPartner {
  id: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface DirectChatMessage {
  id: string;
  conversationId?: string;
  content: string;
  clientId?: string | null;
  images?: string[] | null;
  replyToMessageId?: string | null;
  sharedPostId?: string | null;
  deliveredAt?: string | null;
  readAt?: string | null;
  sentAt?: string | null;
  editedAt?: string | null;
  deletedAt?: string | null;
  isDeleted?: boolean | null;
  Reactions?: DirectChatReaction[] | null;
  User?: DirectChatPartner | null;
}

export interface DirectMessagePayload {
  content?: string;
  clientId?: string;
  images?: MediaUploadAsset[];
  replyToMessageId?: string | null;
  sharedPostId?: string | null;
}

export interface DirectChatReaction {
  messageId: string;
  userId: string;
  emoji: string;
}

export interface DirectMessagesPage {
  items: DirectChatMessage[];
  hasMore: boolean;
  nextCursor: string | null;
}

export interface DirectChatSummary {
  id: string;
  partner: DirectChatPartner;
  lastMessage?: DirectChatMessage | null;
  messagesCount?: number;
  unreadCount?: number;
  lastMessageAt?: string | null;
}

export async function listDirectChats() {
  const response = await api.get<DirectChatSummary[]>('/direct-chats');
  return response.data;
}

export async function getDirectChat(id: string) {
  const response = await api.get<{ id: string; partner: DirectChatPartner }>(
    `/direct-chats/${id}`,
  );
  return response.data;
}

export async function getOrCreateDirectChat(userId: string) {
  const response = await api.post<{ id: string; partner: DirectChatPartner }>(
    `/direct-chats/with/${userId}`,
  );
  return response.data;
}

export async function getDirectMessages(
  id: string,
  options?: { beforeMessageId?: string; limit?: number },
) {
  const response = await api.get<DirectMessagesPage | DirectChatMessage[]>(
    `/direct-chats/${id}/messages`,
    {
      params: {
        beforeMessageId: options?.beforeMessageId,
        limit: options?.limit,
      },
    },
  );

  if (Array.isArray(response.data)) {
    return {
      items: response.data,
      hasMore: false,
      nextCursor: null,
    } satisfies DirectMessagesPage;
  }

  return response.data;
}

export async function sendDirectMessage(
  id: string,
  payload: string | Omit<DirectMessagePayload, 'images'>,
) {
  if (typeof payload === 'string') {
    return sendDirectMessageWithImages(id, { content: payload });
  }
  return sendDirectMessageWithImages(id, payload);
}

export async function sendDirectMessageWithImages(
  id: string,
  payload: DirectMessagePayload,
  options?: {
    onUploadProgress?: (progress: number) => void;
  },
) {
  const formData = new FormData();
  if (payload.content !== undefined) {
    formData.append('content', payload.content);
  }
  if (payload.clientId) {
    formData.append('clientId', payload.clientId);
  }
  if (payload.replyToMessageId) {
    formData.append('replyToMessageId', payload.replyToMessageId);
  }
  if (payload.sharedPostId) {
    formData.append('sharedPostId', payload.sharedPostId);
  }
  (payload.images || []).forEach((media, index) => {
    if (!media.uri) {
      return;
    }
    formData.append(
      'images',
      buildMediaUploadPayload(media, index, 'message') as never,
    );
  });
  const response = await api.post<DirectChatMessage>(
    `/direct-chats/${id}/messages`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (event) => {
        if (!options?.onUploadProgress) {
          return;
        }
        const total = event.total || 0;
        if (!total) {
          return;
        }
        const ratio = Math.min(Math.max(event.loaded / total, 0), 1);
        options.onUploadProgress(ratio);
      },
    },
  );
  return response.data;
}

export async function markDirectChatRead(id: string) {
  await api.post(`/direct-chats/${id}/read`);
}

export async function updateDirectMessage(
  chatId: string,
  messageId: string,
  payload:
    | string
    | {
        content: string;
        replyToMessageId?: string | null;
        sharedPostId?: string | null;
      },
) {
  const normalizedPayload =
    typeof payload === 'string' ? { content: payload } : payload;
  const response = await api.patch<DirectChatMessage>(
    `/direct-chats/${chatId}/messages/${messageId}`,
    normalizedPayload,
  );
  return response.data;
}

export async function deleteDirectMessage(
  chatId: string,
  messageId: string,
) {
  const response = await api.delete<DirectChatMessage>(
    `/direct-chats/${chatId}/messages/${messageId}`,
  );
  return response.data;
}

export async function addDirectMessageReaction(
  chatId: string,
  messageId: string,
  emoji: string,
) {
  const response = await api.post<DirectChatReaction>(
    `/direct-chats/${chatId}/messages/${messageId}/reactions`,
    { emoji },
  );
  return response.data;
}

export async function removeDirectMessageReaction(
  chatId: string,
  messageId: string,
) {
  await api.delete(`/direct-chats/${chatId}/messages/${messageId}/reactions`);
}
