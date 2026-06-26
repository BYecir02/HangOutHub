import { api } from '@/lib/api/client';

export interface AdminEventListItem {
  id: string;
  title: string;
  startTime: string;
  endTime?: string | null;
  coverUrl?: string | null;
  entryFee?: number | string | null;
  address?: string | null;
  City?: { name?: string | null } | null;
  Place?: { name?: string | null } | null;
}

export interface AdminEvent {
  id: string;
  title: string;
  description: string | null;
  startTime: string;
  endTime: string | null;
  entryFee: number | string | null;
  coverUrl: string | null;
  images: string[];
  address: string | null;
  maxTicketsPerUser: number | null;
  cancellationPolicy: string | null;
  refundPolicy: string | null;
  User?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  City?: { id: number; name: string; country: string | null } | null;
  Place?: { id: string; name: string; address: string | null; coverUrl: string | null } | null;
  TicketType?: {
    id: string;
    name: string;
    description: string | null;
    price: number | string;
    quantity: number;
  }[];
  EventTag?: {
    tagId: number;
    Tag: { id: number; name: string; status?: string } | null;
  }[];
}

export interface EventRevision {
  id: string;
  action: string;
  createdAt: string | null;
  actor: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
}

export interface UpdateEventPayload {
  title?: string;
  description?: string;
  address?: string;
  startTime?: string;
  endTime?: string;
  entryFee?: number;
  maxTicketsPerUser?: number;
  /** Liste d'ids de tags sérialisée en JSON (ex: "[1,4,7]"). */
  tagIds?: string;
  /** URLs des images de galerie à CONSERVER (JSON). Celles absentes sont retirées. */
  existingImages?: string;
  /** Nouveau fichier de couverture (remplace l'actuel). */
  coverFile?: File;
  /** Nouveaux fichiers à ajouter à la galerie. */
  galleryFiles?: File[];
}

export async function fetchEvents() {
  const { data } = await api.get<{ items: AdminEventListItem[] }>('/events', {
    params: { limit: 200 },
  });
  return data.items;
}

export async function fetchEvent(id: string) {
  const { data } = await api.get<AdminEvent>(`/events/${id}`);
  return data;
}

export async function fetchEventRevisions(id: string) {
  const { data } = await api.get<EventRevision[]>(`/events/${id}/revisions`);
  return data;
}

export async function updateEvent(id: string, payload: UpdateEventPayload) {
  const { coverFile, galleryFiles, ...fields } = payload;
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && `${value}`.trim() !== '') {
      form.append(key, String(value));
    }
  }
  if (coverFile) {
    form.append('cover', coverFile);
  }
  galleryFiles?.forEach((file) => form.append('gallery', file));

  const { data } = await api.patch<AdminEvent>(`/events/${id}`, form);
  return data;
}

export async function deleteEvent(id: string) {
  await api.delete(`/events/${id}`);
}

export interface CreateEventPayload {
  title: string;
  startTime: string;
  organizerId: string;
  cityId?: number;
  endTime?: string;
  address?: string;
  entryFee?: number;
  maxTicketsPerUser?: number;
  description?: string;
  tagIds?: string;
  coverFile?: File;
  galleryFiles?: File[];
}

export async function createEvent(payload: CreateEventPayload) {
  const { coverFile, galleryFiles, ...fields } = payload;
  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined && value !== null && `${value}`.trim() !== '') {
      form.append(key, String(value));
    }
  }
  if (coverFile) {
    form.append('cover', coverFile);
  }
  galleryFiles?.forEach((file) => form.append('gallery', file));

  const { data } = await api.post<AdminEvent>('/events', form);
  return data;
}
