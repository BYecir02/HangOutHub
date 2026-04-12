export interface SocialUser {
  id: string;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  role?: string;
}

export interface FriendshipItem {
  friendshipId: string;
  status: string;
  user: SocialUser;
}

export interface FriendshipOverview {
  counts: {
    connections: number;
    incomingRequests: number;
    outgoingRequests: number;
  };
  connections: FriendshipItem[];
  incomingRequests: FriendshipItem[];
  outgoingRequests: FriendshipItem[];
}

export interface DiscoverUser extends SocialUser {
  relationStatus: 'NONE' | 'OUTGOING_REQUEST' | 'INCOMING_REQUEST' | 'CONNECTED';
  friendshipId: string | null;
}

export interface OutingInvitation {
  id: string;
  title: string;
  scheduledDate: string;
  Place?: {
    id: string;
    name?: string | null;
    address?: string | null;
    coverUrl?: string | null;
    City?: {
      id: number;
      name: string;
    } | null;
  } | null;
  User?: {
    id: string;
    username?: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  } | null;
}

export interface NotificationActivityItem {
  id: string;
  type: 'EVENT_SAVED_PLACE' | 'PLACE_CLAIM_REVIEWED';
  title: string | null;
  date: string;
  place?: {
    id: string;
    name?: string | null;
    city?: string | null;
    coverUrl?: string | null;
  } | null;
  eventId?: string | null;
  claimDecision?: 'APPROVED' | 'REJECTED' | null;
  targetPath?: string | null;
}
