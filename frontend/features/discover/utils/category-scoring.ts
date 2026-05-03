import { type StoredLocation } from '@/services/shared/location-preferences';

// ─── Shared types (re-exported for convenience) ──────────────────────────────

export interface CandidateLocation {
  cityId?: number | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export type CandidateTagRelation = {
  tagId?: number | null;
  Tag?: { id?: number | null } | null;
} | null;

export interface PreferenceSnapshot {
  tagIds: number[];
  cityIds: number[];
  budget: 'low' | 'medium' | 'high';
  radiusKm: 2 | 5 | 10 | 20 | 'unlimited';
}

// ─── CategoryResult subset types needed by ranking functions ─────────────────

interface CategoryEventForRanking {
  id: string;
  startTime: string;
  entryFee: number | string | null;
  TicketType?: { price: number | string; quantity?: number }[];
  Place?: {
    City?: {
      id?: number | null;
      name?: string | null;
      country?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    } | null;
  } | null;
  City?: {
    id?: number | null;
    name?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  address?: string | null;
  EventTag?: CandidateTagRelation[];
}

interface CategoryPlaceForRanking {
  id: string;
  avgRating?: number | null;
  City?: {
    id?: number | null;
    name?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  address?: string | null;
  PlaceTag?: CandidateTagRelation[];
}

// ─── Pure utility functions ───────────────────────────────────────────────────

export function estimateCategoryCardHeight(index: number): number {
  const imageHeights = [182, 240, 208, 262, 194, 228];
  return imageHeights[index % imageHeights.length] + 124;
}

export function normalizeText(value?: string | null): string {
  return value?.trim().toLowerCase() || '';
}

export function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

export function extractCandidateTagIds(relations?: CandidateTagRelation[] | null): number[] {
  if (!Array.isArray(relations)) {
    return [];
  }

  return relations
    .map((relation) => relation?.tagId ?? relation?.Tag?.id ?? null)
    .filter((value): value is number => typeof value === 'number');
}

export function getCandidateLocation(candidate: {
  Place?: {
    City?: {
      id?: number | null;
      name?: string | null;
      country?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    } | null;
  } | null;
  City?: {
    id?: number | null;
    name?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
}): CandidateLocation {
  const sourceLocation = candidate.Place?.City || candidate.City || null;

  return {
    cityId: sourceLocation?.id ?? null,
    city: sourceLocation?.name ?? null,
    country: sourceLocation?.country ?? null,
    latitude: sourceLocation?.latitude ?? null,
    longitude: sourceLocation?.longitude ?? null,
  };
}

export function haversineDistanceKm(
  startLatitude: number,
  startLongitude: number,
  endLatitude: number,
  endLongitude: number,
): number {
  const earthRadiusKm = 6371;
  const latitudeDelta = ((endLatitude - startLatitude) * Math.PI) / 180;
  const longitudeDelta = ((endLongitude - startLongitude) * Math.PI) / 180;
  const startLatitudeRadians = (startLatitude * Math.PI) / 180;
  const endLatitudeRadians = (endLatitude * Math.PI) / 180;

  const a =
    Math.sin(latitudeDelta / 2) * Math.sin(latitudeDelta / 2) +
    Math.sin(longitudeDelta / 2) *
      Math.sin(longitudeDelta / 2) *
      Math.cos(startLatitudeRadians) *
      Math.cos(endLatitudeRadians);

  return 2 * earthRadiusKm * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function scoreLocationMatch(
  selectedLocation: StoredLocation | null,
  candidate: CandidateLocation,
): number {
  if (!selectedLocation) {
    return 0;
  }

  let score = 0;

  if (
    typeof selectedLocation.cityId === 'number' &&
    typeof candidate.cityId === 'number' &&
    selectedLocation.cityId === candidate.cityId
  ) {
    score += 5;
  } else if (
    normalizeText(selectedLocation.cityName) &&
    normalizeText(candidate.city) &&
    normalizeText(selectedLocation.cityName) === normalizeText(candidate.city)
  ) {
    score += 3.5;
  }

  if (
    normalizeText(selectedLocation.country) &&
    normalizeText(candidate.country) &&
    normalizeText(selectedLocation.country) === normalizeText(candidate.country)
  ) {
    score += 1.5;
  }

  return score;
}

export function scoreRadiusMatch(
  selectedLocation: StoredLocation | null,
  candidate: CandidateLocation,
  radiusKm: PreferenceSnapshot['radiusKm'],
): number {
  if (radiusKm === 'unlimited') {
    return 0;
  }

  const selectedLatitude = toFiniteNumber(selectedLocation?.latitude);
  const selectedLongitude = toFiniteNumber(selectedLocation?.longitude);
  const candidateLatitude = toFiniteNumber(candidate.latitude);
  const candidateLongitude = toFiniteNumber(candidate.longitude);

  if (
    selectedLatitude === null ||
    selectedLongitude === null ||
    candidateLatitude === null ||
    candidateLongitude === null
  ) {
    return 0;
  }

  const distanceKm = haversineDistanceKm(
    selectedLatitude,
    selectedLongitude,
    candidateLatitude,
    candidateLongitude,
  );

  if (distanceKm <= radiusKm) {
    return 3;
  }

  if (distanceKm <= radiusKm * 2) {
    return 1;
  }

  return -1;
}

export function getEventBasePrice(event: CategoryEventForRanking): number | null {
  const ticketPrices = (event.TicketType || [])
    .map((ticketType) => toFiniteNumber(ticketType.price))
    .filter((value): value is number => value !== null);

  if (ticketPrices.length > 0) {
    return Math.min(...ticketPrices);
  }

  return toFiniteNumber(event.entryFee);
}

export function scoreBudgetMatch(
  price: number | null,
  budget: PreferenceSnapshot['budget'],
): number {
  if (price === null) {
    return 0;
  }

  const priceBand = price <= 15 ? 'low' : price <= 45 ? 'medium' : 'high';

  if (priceBand === budget) {
    return 3;
  }

  if (budget === 'medium' && priceBand !== 'high') {
    return 1.5;
  }

  if (budget === 'low' && priceBand === 'medium') {
    return 1;
  }

  if (budget === 'high' && priceBand === 'medium') {
    return 1;
  }

  return 0.5;
}

export function scoreTagMatch(candidateTagIds: number[], preferredTagIds: Set<number>): number {
  if (preferredTagIds.size === 0 || candidateTagIds.length === 0) {
    return 0;
  }

  let matches = 0;

  for (const tagId of candidateTagIds) {
    if (preferredTagIds.has(tagId)) {
      matches += 1;
    }
  }

  return matches * 6;
}

export function scoreSoonness(startTime: string): number {
  const startDate = new Date(startTime);

  if (Number.isNaN(startDate.getTime())) {
    return 0;
  }

  const diffDays = (startDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24);

  if (diffDays <= 2) {
    return 2;
  }

  if (diffDays <= 7) {
    return 1;
  }

  return 0;
}

export function scoreRatingMatch(avgRating?: number | null): number {
  if (typeof avgRating !== 'number' || !Number.isFinite(avgRating)) {
    return 0;
  }

  return Math.min(avgRating, 5) * 0.75;
}

export function rankEvents<T extends CategoryEventForRanking>(
  events: T[],
  selectedLocation: StoredLocation | null,
  preferences: PreferenceSnapshot,
): T[] {
  if (selectedLocation?.mode !== 'all') {
    return events;
  }

  const preferredTagSet = new Set(preferences.tagIds);

  return [...events]
    .map((event) => ({
      event,
      score:
        scoreTagMatch(extractCandidateTagIds(event.EventTag), preferredTagSet) +
        (preferences.cityIds.includes(getCandidateLocation(event).cityId || -1) ? 4 : 0) +
        scoreLocationMatch(selectedLocation, getCandidateLocation(event)) +
        scoreRadiusMatch(selectedLocation, getCandidateLocation(event), preferences.radiusKm) +
        scoreBudgetMatch(getEventBasePrice(event), preferences.budget) +
        scoreSoonness(event.startTime),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        new Date(left.event.startTime).getTime() - new Date(right.event.startTime).getTime(),
    )
    .map(({ event }) => event);
}

export function rankPlaces<T extends CategoryPlaceForRanking>(
  places: T[],
  selectedLocation: StoredLocation | null,
  preferences: PreferenceSnapshot,
): T[] {
  if (selectedLocation?.mode !== 'all') {
    return places;
  }

  const preferredTagSet = new Set(preferences.tagIds);

  return [...places]
    .map((place) => ({
      place,
      score:
        scoreTagMatch(extractCandidateTagIds(place.PlaceTag), preferredTagSet) +
        (preferences.cityIds.includes(getCandidateLocation(place).cityId || -1) ? 4 : 0) +
        scoreLocationMatch(selectedLocation, getCandidateLocation(place)) +
        scoreRadiusMatch(selectedLocation, getCandidateLocation(place), preferences.radiusKm) +
        scoreRatingMatch(place.avgRating),
    }))
    .sort(
      (left, right) =>
        right.score - left.score ||
        (right.place.avgRating || 0) - (left.place.avgRating || 0),
    )
    .map(({ place }) => place);
}
