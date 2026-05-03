export interface DiscoverEvent {
  id: string;
  title: string;
  startTime: string;
  coverUrl: string | null;
  entryFee: number | string | null;
  TicketType?: {
    id?: string;
    price: number | string;
    quantity: number;
  }[];
  Place?: {
    id?: string;
    name?: string | null;
    City?: {
      id?: number | null;
      name?: string | null;
      country?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    } | null;
  } | null;
  address?: string | null;
  City?: {
    id?: number | null;
    name?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  EventTag?: Array<{
    tagId?: number | null;
    Tag?: {
      id?: number | null;
    } | null;
  } | null>;
}

export interface DiscoverPlace {
  id: string;
  name: string;
  coverUrl: string | null;
  avgRating?: number | null;
  City?: {
    id?: number | null;
    name?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  address?: string | null;
  PlaceTag?: Array<{
    tagId?: number | null;
    Tag?: {
      id?: number | null;
    } | null;
  } | null>;
}

export type DiscoverFilter = 'all' | 'events' | 'places';
export type DiscoverViewMode = 'list' | 'inspiration';

export type RecommendationPreferencesSnapshot = {
  tagIds: number[];
  cityIds: number[];
  budget: 'low' | 'medium' | 'high';
  radiusKm: 2 | 5 | 10 | 20 | 'unlimited';
};

export type DiscoverItem =
  | {
      id: string;
      type: 'event';
      event: DiscoverEvent;
      title: string;
      subtitle: string;
      meta: string;
      image: string;
      badge: string;
      actionColor: string;
      targetId: string;
    }
  | {
      id: string;
      type: 'place';
      place: DiscoverPlace;
      title: string;
      subtitle: string;
      meta: string;
      image: string;
      badge: string;
      actionColor: string;
      targetId: string;
    };

export const EVENT_PLACEHOLDER =
  'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=1200';
export const PLACE_PLACEHOLDER =
  'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=1200';
