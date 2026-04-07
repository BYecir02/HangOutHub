import { io, type Socket } from 'socket.io-client';

import { BASE_URL, storage } from './api';

const ACCESS_TOKEN_KEY = 'userToken';

let postsSocket: Socket | null = null;

async function resolveAccessToken() {
  return storage.getItem(ACCESS_TOKEN_KEY);
}

export async function getPostsSocket() {
  const token = await resolveAccessToken();
  if (!token) {
    return null;
  }

  if (postsSocket) {
    if (!postsSocket.connected) {
      postsSocket.connect();
    }

    return postsSocket;
  }

  postsSocket = io(`${BASE_URL}/posts`, {
    transports: ['websocket'],
    reconnection: true,
    autoConnect: true,
    auth: {
      token,
    },
  });

  return postsSocket;
}

export function disconnectPostsSocket() {
  if (!postsSocket) {
    return;
  }

  postsSocket.disconnect();
  postsSocket = null;
}