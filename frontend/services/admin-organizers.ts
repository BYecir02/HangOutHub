import api from './api';

export type AdminOrganizerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface AdminOrganizerPlaceSummary {
  id: string;
  name: string;
  coverUrl?: string | null;
  address?: string | null;
  avgRating?: number | null;
  City?: {
    id?: number;
    name?: string | null;
    country?: string | null;
  } | null;
}

export interface AdminOrganizerSummary {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  role: string | null;
  organizer: {
    accountType: string;
    companyName: string;
    status: AdminOrganizerStatus | string | null;
    jobTitle: string;
    createdAt: string | null;
  } | null;
  placesCount: number;
}

export interface AdminOrganizerDetail extends AdminOrganizerSummary {
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  isVerified: boolean | null;
  organizer: {
    accountType: string;
    companyName: string;
    ifuNumber: string;
    payoutInfo: string;
    jobTitle: string;
    instagramUrl: string | null;
    tiktokUrl: string | null;
    facebookUrl: string | null;
    xUrl: string | null;
    websiteUrl: string | null;
    status: AdminOrganizerStatus | string | null;
    createdAt: string | null;
    updatedAt: string | null;
  } | null;
  OwnedPlaces?: AdminOrganizerPlaceSummary[];
}

export async function listAdminOrganizerProfiles() {
  const response = await api.get<AdminOrganizerSummary[]>('/users/admin/organizers');
  return response.data;
}

export async function getAdminOrganizerProfile(userId: string) {
  const response = await api.get<AdminOrganizerDetail>(`/users/${userId}`);
  return response.data;
}

export async function updateAdminOrganizerStatus(
  userId: string,
  status: AdminOrganizerStatus,
) {
  const response = await api.patch(`/users/organizers/${userId}/status`, {
    status,
  });

  return response.data;
}
