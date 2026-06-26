import { api } from '@/lib/api/client';

export interface AdminUserListItem {
  id: string;
  username?: string | null;
  displayName?: string | null;
  email?: string | null;
  role?: string | null;
  isSuspended?: boolean | null;
  createdAt?: string | null;
  organizerStatus?: string | null;
  organizerCompanyName?: string | null;
  lastActiveAt?: string | null;
}

export async function fetchUsers() {
  const { data } = await api.get<AdminUserListItem[]>('/users/admin');
  return data;
}

export async function deleteUser(userId: string) {
  await api.delete(`/users/${userId}`);
}
