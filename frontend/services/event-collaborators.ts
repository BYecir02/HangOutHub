import api from './api';

export type EventCollaboratorPermission = 'EDIT' | 'SCAN';

export interface EventCollaboratorItem {
  userId: string;
  permission: EventCollaboratorPermission | null;
  createdAt: string | null;
  User: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export async function listEventCollaborators(eventId: string) {
  const response = await api.get<EventCollaboratorItem[]>(
    `/events/${eventId}/collaborators`,
  );
  return response.data;
}

export async function addEventCollaborator(
  eventId: string,
  payload: {
    userId: string;
    permission: EventCollaboratorPermission;
  },
) {
  const response = await api.post<EventCollaboratorItem[]>(
    `/events/${eventId}/collaborators`,
    payload,
  );
  return response.data;
}

export async function removeEventCollaborator(
  eventId: string,
  collaboratorUserId: string,
) {
  const response = await api.delete<EventCollaboratorItem[]>(
    `/events/${eventId}/collaborators/${collaboratorUserId}`,
  );
  return response.data;
}