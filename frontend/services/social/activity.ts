import api from '@/services/api';

export interface FriendAttendee {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

export interface FriendActivityItem {
  id: string;
  actionType: 'outing_created' | 'place_saved' | 'event_saved';
  actors: FriendAttendee[];
  entity: {
    id: string;
    type: 'event' | 'place';
    title: string;
    imageUrl: string | null;
    scheduledAt?: string | null;
  };
  createdAt: string;
}

export async function getFriendActivity(): Promise<FriendActivityItem[]> {
  try {
    const res = await api.get<{ items: FriendActivityItem[] }>('/social/activity');
    return res.data.items ?? [];
  } catch {
    return [];
  }
}

export async function getEventFriendsAttending(eventId: string): Promise<FriendAttendee[]> {
  try {
    const res = await api.get<{ friends: FriendAttendee[] }>(`/events/${eventId}/friends-attending`);
    return res.data.friends ?? [];
  } catch {
    return [];
  }
}

export interface EventAttendeesPreview {
  count: number;
  attendees: FriendAttendee[];
}

export async function getEventAttendeesPreview(
  eventId: string,
): Promise<EventAttendeesPreview> {
  try {
    const res = await api.get<EventAttendeesPreview>(
      `/events/${eventId}/attendees-preview`,
    );
    return { count: res.data.count ?? 0, attendees: res.data.attendees ?? [] };
  } catch {
    return { count: 0, attendees: [] };
  }
}

export async function getPlaceFriendsAttending(placeId: string): Promise<FriendAttendee[]> {
  try {
    const res = await api.get<{ friends: FriendAttendee[] }>(`/places/${placeId}/friends-attending`);
    return res.data.friends ?? [];
  } catch {
    return [];
  }
}

export async function attendEvent(eventId: string): Promise<void> {
  await api.post(`/events/${eventId}/attend`);
}

export async function unattendEvent(eventId: string): Promise<void> {
  await api.delete(`/events/${eventId}/attend`);
}

export async function getEventAttendance(eventId: string): Promise<boolean> {
  try {
    const res = await api.get<{ isAttending: boolean }>(`/events/${eventId}/attend`);
    return res.data.isAttending ?? false;
  } catch {
    return false;
  }
}

export interface MapFriendsActivityItem {
  entityId: string;
  entityType: 'event' | 'place';
  friendsCount: number;
}

export async function getMapFriendsActivity(): Promise<MapFriendsActivityItem[]> {
  try {
    const res = await api.get<{ items: MapFriendsActivityItem[] }>('/map/friends-activity');
    return res.data.items ?? [];
  } catch {
    return [];
  }
}
