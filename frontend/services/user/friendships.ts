import api from '../api';
import { DiscoverUser, FriendshipOverview } from '@/features/social/types';

export async function getFriendshipOverview() {
  const response = await api.get<FriendshipOverview>('/friendships/mine');
  return response.data;
}

export async function discoverUsers(query: string) {
  const response = await api.get<DiscoverUser[]>('/friendships/discover', {
    params: { query },
  });
  return response.data;
}

export async function sendFriendRequest(targetUserId: string) {
  const response = await api.post(`/friendships/request/${targetUserId}`);
  return response.data;
}

export async function acceptFriendRequest(friendshipId: string) {
  const response = await api.patch(`/friendships/${friendshipId}/accept`);
  return response.data;
}

export async function rejectFriendRequest(friendshipId: string) {
  const response = await api.patch(`/friendships/${friendshipId}/reject`);
  return response.data;
}

export async function removeFriendship(friendshipId: string) {
  const response = await api.delete(`/friendships/${friendshipId}`);
  return response.data;
}
