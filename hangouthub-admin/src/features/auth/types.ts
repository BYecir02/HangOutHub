export interface AdminUser {
  id: string;
  username: string;
  email: string | null;
  avatarUrl: string | null;
  role: string;
}
