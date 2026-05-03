import { io, type Socket } from 'socket.io-client';

import { BASE_URL, storage } from '../api';

const ACCESS_TOKEN_KEY = 'userToken';

let directChatSocket: Socket | null = null;

async function resolveAccessToken() {
  return storage.getItem(ACCESS_TOKEN_KEY);
}

export async function getDirectChatSocket() {
  const token = await resolveAccessToken();
  if (!token) {
    return null;
  }

  if (directChatSocket) {
    if (!directChatSocket.connected) {
      directChatSocket.connect();
    }
    return directChatSocket;
  }

  directChatSocket = io(`${BASE_URL}/direct-chats`, {
    transports: ['websocket'],
    reconnection: true,
    autoConnect: true,
    auth: {
      token,
    },
  });

  return directChatSocket;
}

export function disconnectDirectChatSocket() {
  if (!directChatSocket) {
    return;
  }
  directChatSocket.disconnect();
  directChatSocket = null;
}

export function joinDirectConversation(socket: Socket, conversationId: string) {
  socket.emit('chat:join', { conversationId });
}

export function leaveDirectConversation(socket: Socket, conversationId: string) {
  socket.emit('chat:leave', { conversationId });
}

export function emitDirectTyping(
  socket: Socket,
  conversationId: string,
  isTyping: boolean,
) {
  socket.emit('chat:typing', { conversationId, isTyping });
}