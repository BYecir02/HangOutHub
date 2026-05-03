import api from '../api';

export interface EventRevisionActor {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface EventRevisionItem {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'COLLABORATOR_UPSERT' | 'COLLABORATOR_REMOVE' | string;
  createdAt: string | null;
  actor: EventRevisionActor | null;
  snapshot: unknown;
}

export async function listEventRevisions(eventId: string) {
  const response = await api.get<EventRevisionItem[]>(`/events/${eventId}/revisions`);
  return response.data;
}
