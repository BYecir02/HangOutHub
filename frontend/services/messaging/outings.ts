import api from '@/services/api';
import {
  buildMediaUploadPayload,
  type MediaUploadAsset,
} from '@/services/media-upload';

export interface OutingMessageUser {
  id: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
}

export interface OutingMessage {
  id: string;
  outingId: string;
  senderId: string;
  content: string;
  images?: string[] | null;
  sentAt: string;
  User?: OutingMessageUser;
}

export interface SendOutingMessagePayload {
  content?: string;
  clientId?: string;
  images?: MediaUploadAsset[];
}

export async function sendOutingMessage(
  outingId: string,
  payload: SendOutingMessagePayload,
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

  (payload.images || []).forEach((media, index) => {
    if (!media.uri) {
      return;
    }

    formData.append(
      'images',
      buildMediaUploadPayload(media, index, 'message') as never,
    );
  });

  const response = await api.post<OutingMessage>(
    `/outings/${outingId}/messages`,
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