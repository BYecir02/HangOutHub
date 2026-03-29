import api from './api';

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

export interface MyPlaceTeamMembershipItem {
  placeId: string;
  role: PlaceTeamRole | null;
  createdAt?: string | null;
  Place: {
    id: string;
    name: string;
    ownerId?: string | null;
    City?: {
      id: number;
      name: string;
      country?: string | null;
    } | null;
  };
}

export async function listMyPlaceTeams() {
  const response = await api.get<MyPlaceTeamMembershipItem[]>('/places/team/me');
  return response.data;
}

export async function listPlaceTeam(placeId: string) {
  const response = await api.get<PlaceTeamMemberItem[]>(`/places/${placeId}/team`);
  return response.data;
}

export async function upsertPlaceTeamMember(
  placeId: string,
  payload: {
    userId: string;
    role?: PlaceTeamRole;
  },
) {
  const response = await api.post<PlaceTeamMemberItem[]>(
    `/places/${placeId}/team`,
    payload,
  );
  return response.data;
}

export async function removePlaceTeamMember(
  placeId: string,
  placeMemberUserId: string,
) {
  const response = await api.delete<PlaceTeamMemberItem[]>(
    `/places/${placeId}/team/${placeMemberUserId}`,
  );
  return response.data;
}
