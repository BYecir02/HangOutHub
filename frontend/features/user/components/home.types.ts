type HomeTag = {
  id: number;
  name: string;
  categoryId?: number | null;
};

type HomeTagRelation = {
  tagId?: number | null;
  Tag?: HomeTag | null;
};

export interface HomeEvent {
  id: string;
  title: string;
  startTime: string;
  coverUrl: string | null;
  entryFee: number | string | null;
  TicketType?: {
    id: string;
    price: number | string;
    quantity: number;
  }[];
  Place?: {
    name?: string | null;
    City?: {
      id?: number;
      name?: string | null;
      country?: string | null;
      latitude?: number | null;
      longitude?: number | null;
    } | null;
  } | null;
  City?: {
    id?: number;
    name?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  address?: string | null;
  EventTag?: HomeTagRelation[];
}

export interface HomePlace {
  id: string;
  name: string;
  coverUrl: string | null;
  avgRating?: number | null;
  City?: {
    id?: number;
    name?: string | null;
    country?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  } | null;
  address?: string | null;
  PlaceTag?: HomeTagRelation[];
}

export interface NotificationCountResponse {
  unreadCount: number;
}

export type HomeFeaturedItem = {
  event: HomeEvent;
  cityLabel: string;
  placeLabel: string;
  dateLabel: string;
  priceLabel: string;
};

export type HomeRecommendationItem =
  | {
      id: string;
      type: 'event';
      event: HomeEvent;
      cityLabel: string;
      placeLabel: string;
      dateLabel: string;
      priceLabel: string;
      accentColor: string;
    }
  | {
      id: string;
      type: 'place';
      place: HomePlace;
      fallbackNewLabel: string;
      accentColor: string;
    };

export type HomeVisibleLayout = {
  y: number;
  height: number;
};
