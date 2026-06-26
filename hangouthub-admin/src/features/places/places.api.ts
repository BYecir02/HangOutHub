import { api } from '@/lib/api/client';
import type { WeeklyHours } from '@/lib/opening-hours';

export interface AdminPlace {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  openingHours: string | null;
  openingHoursStructured: WeeklyHours | null;
  priceLevel: number | null;
  moderationStatus: string | null;
  coverUrl: string | null;
  avgRating: number | null;
  viewCount: number | null;
  images: string[];
  latitude: number | null;
  longitude: number | null;
  cityId: number | null;
  ownerId: string | null;
  createdAt: string | null;
  City: { id: number; name: string; country: string | null } | null;
  Owner?: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  PlaceTag?: {
    tagId: number;
    Tag: {
      id: number;
      name: string;
      categoryId: number | null;
      Category?: { id: number; name: string } | null;
    } | null;
  }[];
}

export interface UpdatePlacePayload {
  name?: string;
  category?: string;
  description?: string;
  address?: string;
  phone?: string;
  whatsapp?: string;
  openingHours?: string;
  openingHoursStructured?: string;
  priceLevel?: number;
  moderationStatus?: string;
  /** Liste d'ids de tags sérialisée en JSON (ex: "[1,4,7]"). */
  tagIds?: string;
  /** URLs des images de galerie à CONSERVER (JSON). Celles absentes sont retirées. */
  existingImages?: string;
  /** Nouveau fichier de couverture (remplace l'actuel). */
  coverFile?: File;
  /** Nouveaux fichiers à ajouter à la galerie. */
  galleryFiles?: File[];
}

export async function fetchPlaces() {
  const { data } = await api.get<AdminPlace[]>('/places');
  return data;
}

export async function fetchPlace(id: string) {
  const { data } = await api.get<AdminPlace>(`/places/${id}`);
  return data;
}

/**
 * Le endpoint PATCH /places/:id utilise un intercepteur multipart (cover/gallery).
 * On envoie donc du FormData (champs texte uniquement, pas d'upload depuis l'admin).
 * Les valeurs vides sont omises pour ne pas heurter les validations @IsNotEmpty.
 */
export async function updatePlace(id: string, payload: UpdatePlacePayload) {
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

  const { data } = await api.patch<AdminPlace>(`/places/${id}`, form);
  return data;
}

export async function deletePlace(id: string) {
  await api.delete(`/places/${id}`);
}

export interface CreatePlacePayload {
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  cityId?: number;
  category?: string;
  description?: string;
  phone?: string;
  whatsapp?: string;
  priceLevel?: number;
  moderationStatus?: string;
  tagIds?: string;
  openingHoursStructured?: string;
  coverFile?: File;
  galleryFiles?: File[];
}

export async function createPlace(payload: CreatePlacePayload) {
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

  const { data } = await api.post<AdminPlace>('/places', form);
  return data;
}
