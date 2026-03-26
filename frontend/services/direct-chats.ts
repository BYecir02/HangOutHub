import api from '@/services/api';

export interface DirectChatPartner {
  id: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface DirectChatMessage {
  id: string;
  content: string;
  sentAt?: string | null;
  User?: DirectChatPartner | null;
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

export async function getDirectMessages(id: string) {
  const response = await api.get<DirectChatMessage[]>(
    `/direct-chats/${id}/messages`,
  );
  return response.data;
}

export async function sendDirectMessage(id: string, content: string) {
  const response = await api.post<DirectChatMessage>(
    `/direct-chats/${id}/messages`,
    { content },
  );
  return response.data;
}

export async function markDirectChatRead(id: string) {
  await api.post(`/direct-chats/${id}/read`);
}
