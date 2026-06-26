import { api } from '@/lib/api/client';
import type { AdminUser } from './types';

interface LoginResponse {
  access_token: string;
  refresh_token: string;
  user: AdminUser;
}

export async function loginRequest(email: string, password: string) {
  const { data } = await api.post<LoginResponse>('/auth/login', {
    email,
    password,
    device: 'Admin Web',
  });
  return data;
}
