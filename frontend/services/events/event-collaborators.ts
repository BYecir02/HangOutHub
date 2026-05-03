import api from '../api';

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

export type PlaceTeamRole = 'STAFF' | 'MANAGER' | 'SCANNER';

export interface PlaceTeamMemberItem {
  placeId: string;
  userId: string;
  role: PlaceTeamRole | null;
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

export async function listEventPlaceTeam(eventId: string) {
  const response = await api.get<PlaceTeamMemberItem[]>(
    `/events/${eventId}/place-team`,
  );
  return response.data;
}

export async function addEventPlaceTeamMember(
  eventId: string,
  payload: {
    userId: string;
    role?: PlaceTeamRole;
  },
) {
  const response = await api.post<PlaceTeamMemberItem[]>(
    `/events/${eventId}/place-team`,
    payload,
  );
  return response.data;
}

export async function removeEventPlaceTeamMember(
  eventId: string,
  placeMemberUserId: string,
) {
  const response = await api.delete<PlaceTeamMemberItem[]>(
    `/events/${eventId}/place-team/${placeMemberUserId}`,
  );
  return response.data;
}
