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
    } | null;
  } | null;
  address?: string | null;
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
  } | null;
  address?: string | null;
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
