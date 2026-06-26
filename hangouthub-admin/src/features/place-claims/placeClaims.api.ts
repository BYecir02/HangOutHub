import { api } from '@/lib/api/client';

export interface PlaceClaimItem {
  id: string;
  userId: string;
  placeId: string;
  documentUrl: string;
  status: string | null;
  createdAt?: string | null;
  Place: {
    id: string;
    name: string;
    coverUrl: string | null;
    City?: { name?: string | null; country?: string | null } | null;
  };
  User?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

export async function fetchPlaceClaims() {
  const { data } = await api.get<PlaceClaimItem[]>('/places/admin/claims');
  return data;
}

export async function updatePlaceClaimStatus(
  claimId: string,
  status: 'APPROVED' | 'REJECTED',
) {
  const { data } = await api.patch(`/places/admin/claims/${claimId}/status`, {
    status,
  });
  return data;
}
