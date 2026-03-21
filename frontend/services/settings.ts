import api from './api';

export type PostVisibility = 'public' | 'friends' | 'private';
export type OutingInviteScope = 'everyone' | 'connections' | 'nobody';
export type AppTheme = 'light' | 'dark' | 'system';
export type AppLanguage = 'fr' | 'en';

export interface UserSettings {
  notificationMessages: boolean;
  notificationOutingInvites: boolean;
  notificationFriendRequests: boolean;
  notificationSavedPlacesActivity: boolean;
  profilePublic: boolean;
  defaultPostVisibility: PostVisibility;
  allowOutingInvitesFrom: OutingInviteScope;
  theme: AppTheme;
  language: AppLanguage;
  dataSaver: boolean;
}

export type UserSettingsPatch = Partial<UserSettings>;

export async function getMySettings() {
  const response = await api.get<UserSettings>('/users/me/settings');
  return response.data;
}

export async function updateMySettings(patch: UserSettingsPatch) {
  const response = await api.patch<UserSettings>('/users/me/settings', patch);
  return response.data;
}
