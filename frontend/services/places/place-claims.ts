import * as ImagePicker from 'expo-image-picker';

import api from '../api';

export type PlaceClaimStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface PlaceClaimPlace {
  id: string;
  name: string;
  coverUrl: string | null;
  ownerId: string | null;
  moderationStatus?: string | null;
  City?: {
    id?: number;
    name?: string | null;
    country?: string | null;
  } | null;
}

export interface PlaceClaimUser {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface PlaceClaimItem {
  id: string;
  userId: string;
  placeId: string;
  documentUrl: string;
  status: PlaceClaimStatus | string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  Place: PlaceClaimPlace;
  User?: PlaceClaimUser;
}

function toUploadFile(
  asset: ImagePicker.ImagePickerAsset,
  fallbackName: string,
) {
  return {
    uri: asset.uri,
    name: asset.fileName || fallbackName,
    type: asset.mimeType || 'image/jpeg',
  } as unknown as Blob;
}

export async function submitPlaceClaim(
  placeId: string,
  proof: ImagePicker.ImagePickerAsset,
) {
  const formData = new FormData();
  formData.append(
    'document',
    toUploadFile(proof, `place-claim-${placeId}.jpg`),
  );

  const response = await api.post<PlaceClaimItem>(
    `/places/${placeId}/claims`,
    formData,
    {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    },
  );

  return response.data;
}

export async function listMyPlaceClaims() {
  const response = await api.get<PlaceClaimItem[]>('/places/claims/mine');
  return response.data;
}

export async function listPlaceClaims() {
  const response = await api.get<PlaceClaimItem[]>('/places/admin/claims');
  return response.data;
}

export async function updatePlaceClaimStatus(
  claimId: string,
  status: 'APPROVED' | 'REJECTED',
) {
  const response = await api.patch<PlaceClaimItem>(
    `/places/admin/claims/${claimId}/status`,
    { status },
  );

  return response.data;
}
