import type {
  DiscoverEvent,
  DiscoverPlace,
  RecommendationPreferencesSnapshot,
} from '@/components/discover/discover.types';

type StoredLocationLike = {
  cityId?: number | null;
  cityName?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
} | null;

type CandidateLocation = {
  cityId?: number | null;
  city?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
};

type CandidateTagRelation = {
  tagId?: number | null;
  Tag?: {
    id?: number | null;
  } | null;
} | null;

function normalizeText(value?: string | null): string {
  return value?.trim().toLowerCase() || '';
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function extractCandidateTagIds(relations?: CandidateTagRelation[] | null): number[] {
  if (!Array.isArray(relations)) {
    return [];
  }

  return relations
    .map((relation) => relation?.tagId ?? relation?.Tag?.id ?? null)
    .filter((value): value is number => typeof value === 'number');
}

function getCandidateLocation(candidate: {
  Place?: { City?: DiscoverEvent['City'] | null } | null;
  City?: DiscoverEvent['City'] | DiscoverPlace['City'];
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

function haversineDistanceKm(
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

function scoreLocationMatch(
  selectedLocation: StoredLocationLike,
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

function scoreRadiusMatch(
  selectedLocation: StoredLocationLike,
  candidate: CandidateLocation,
  radiusKm: RecommendationPreferencesSnapshot['radiusKm'],
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

function getEventBasePrice(event: DiscoverEvent): number | null {
  const ticketPrices = (event.TicketType || [])
    .map((ticketType) => toFiniteNumber(ticketType.price))
    .filter((value): value is number => value !== null);

  if (ticketPrices.length > 0) {
    return Math.min(...ticketPrices);
  }

  return toFiniteNumber(event.entryFee);
}

function scoreBudgetMatch(
  price: number | null,
  budget: RecommendationPreferencesSnapshot['budget'],
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

function scoreTagMatch(candidateTagIds: number[], preferredTagIds: Set<number>): number {
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

function scoreSoonness(startTime: string): number {
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

function scoreRatingMatch(avgRating?: number | null): number {
  if (typeof avgRating !== 'number' || !Number.isFinite(avgRating)) {
    return 0;
  }

  return Math.min(avgRating, 5) * 0.75;
}

export function scoreDiscoverEvent(
  event: DiscoverEvent,
  selectedLocation: StoredLocationLike,
  preferences: RecommendationPreferencesSnapshot,
  preferredTagSet: Set<number>,
): number {
  const candidateLocation = getCandidateLocation(event);
  const candidateTagIds = extractCandidateTagIds(event.EventTag);

  return (
    scoreTagMatch(candidateTagIds, preferredTagSet) +
    (preferences.cityIds.includes(candidateLocation.cityId || -1) ? 4 : 0) +
    scoreLocationMatch(selectedLocation, candidateLocation) +
    scoreRadiusMatch(selectedLocation, candidateLocation, preferences.radiusKm) +
    scoreBudgetMatch(getEventBasePrice(event), preferences.budget) +
    scoreSoonness(event.startTime)
  );
}

export function scoreDiscoverPlace(
  place: DiscoverPlace,
  selectedLocation: StoredLocationLike,
  preferences: RecommendationPreferencesSnapshot,
  preferredTagSet: Set<number>,
): number {
  const candidateLocation = getCandidateLocation(place);
  const candidateTagIds = extractCandidateTagIds(place.PlaceTag);

  return (
    scoreTagMatch(candidateTagIds, preferredTagSet) +
    (preferences.cityIds.includes(candidateLocation.cityId || -1) ? 4 : 0) +
    scoreLocationMatch(selectedLocation, candidateLocation) +
    scoreRadiusMatch(selectedLocation, candidateLocation, preferences.radiusKm) +
    scoreRatingMatch(place.avgRating)
  );
}
