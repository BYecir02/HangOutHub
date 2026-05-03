import api from '../api';

export type PostVisibility = 'public' | 'friends' | 'private' | 'custom';
export type OutingInviteScope = 'everyone' | 'connections' | 'nobody';
export type AppTheme = 'light' | 'dark' | 'system';
export type AppLanguage = 'fr' | 'en';

export interface UserSettings {
  notificationMessages: boolean;
  notificationOutingInvites: boolean;
  notificationFriendRequests: boolean;
  notificationSavedPlacesActivity: boolean;
  organizerNotifyBookings: boolean;
  organizerNotifyTeamUpdates: boolean;
  organizerNotifyReminderD1: boolean;
  organizerNotifyReminderH3: boolean;
  organizerNotifyReminderH1: boolean;
  organizerReminderMode: 'preset' | 'custom';
  organizerReminderOffsetsMin: number[];
  organizerNotificationPriorityMin: 'IMPORTANT' | 'URGENT';
  organizerScannerOfflineAuto: boolean;
  organizerScannerAutoSync: boolean;
  organizerScannerHaptics: boolean;
  organizerScannerSound: boolean;
  organizerScannerStrictWindow: boolean;
  organizerDefaultCheckInOpenOffsetMin: number;
  organizerDefaultCheckInCloseOffsetMin: number;
  organizerDefaultMaxTicketsPerUser: number;
  organizerDefaultCancellationPolicy: string | null;
  organizerDefaultRefundPolicy: string | null;
  organizerTeamInviteScope: 'OWNER_ONLY' | 'OWNER_AND_EDITORS';
  organizerTeamDefaultPermission: 'EDIT' | 'SCAN';
  organizerTeamRequireRemovalConfirm: boolean;
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
