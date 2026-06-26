import { api } from '@/lib/api/client';

export type OrganizerStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface OrganizerSummary {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  role: string | null;
  organizer: {
    accountType: string;
    companyName: string;
    status: OrganizerStatus | string | null;
    jobTitle: string;
    createdAt: string | null;
  } | null;
  placesCount: number;
}

export async function fetchOrganizers() {
  const { data } = await api.get<OrganizerSummary[]>('/users/admin/organizers');
  return data;
}

export async function updateOrganizerStatus(
  userId: string,
  status: OrganizerStatus,
) {
  const { data } = await api.patch(`/users/organizers/${userId}/status`, {
    status,
  });
  return data;
}
