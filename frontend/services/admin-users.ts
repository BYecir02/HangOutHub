import api from '@/services/api';

export type AdminUserSummary = {
  id: string;
  username?: string | null;
  displayName?: string | null;
  email?: string | null;
  role?: string | null;
  isSuspended?: boolean | null;
  createdAt?: string | null;
  organizerStatus?: string | null;
  organizerAccountType?: string | null;
  organizerCompanyName?: string | null;
  lastActiveAt?: string | null;
};

export const listAdminUsers = async () => {
  const response = await api.get<AdminUserSummary[]>('/users/admin');
  return response.data;
};

export const deleteAdminUser = async (userId: string) => {
  await api.delete(`/users/${userId}`);
};
