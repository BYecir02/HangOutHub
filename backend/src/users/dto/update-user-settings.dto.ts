import { IsBoolean, IsIn, IsInt, IsOptional, Max, Min } from 'class-validator';

export class UpdateUserSettingsDto {
  @IsOptional()
  @IsBoolean()
  notificationMessages?: boolean;

  @IsOptional()
  @IsBoolean()
  notificationOutingInvites?: boolean;

  @IsOptional()
  @IsBoolean()
  notificationFriendRequests?: boolean;

  @IsOptional()
  @IsBoolean()
  notificationSavedPlacesActivity?: boolean;

  @IsOptional()
  @IsBoolean()
  organizerNotifyBookings?: boolean;

  @IsOptional()
  @IsBoolean()
  organizerNotifyTeamUpdates?: boolean;

  @IsOptional()
  @IsBoolean()
  organizerNotifyReminderD1?: boolean;

  @IsOptional()
  @IsBoolean()
  organizerNotifyReminderH3?: boolean;

  @IsOptional()
  @IsBoolean()
  organizerNotifyReminderH1?: boolean;

  @IsOptional()
  @IsIn(['IMPORTANT', 'URGENT'])
  organizerNotificationPriorityMin?: 'IMPORTANT' | 'URGENT';

  @IsOptional()
  @IsBoolean()
  organizerScannerOfflineAuto?: boolean;

  @IsOptional()
  @IsBoolean()
  organizerScannerAutoSync?: boolean;

  @IsOptional()
  @IsBoolean()
  organizerScannerHaptics?: boolean;

  @IsOptional()
  @IsBoolean()
  organizerScannerSound?: boolean;

  @IsOptional()
  @IsBoolean()
  organizerScannerStrictWindow?: boolean;

  @IsOptional()
  @IsInt()
  organizerDefaultCheckInOpenOffsetMin?: number;

  @IsOptional()
  @IsInt()
  organizerDefaultCheckInCloseOffsetMin?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(20)
  organizerDefaultMaxTicketsPerUser?: number;

  @IsOptional()
  organizerDefaultCancellationPolicy?: string;

  @IsOptional()
  organizerDefaultRefundPolicy?: string;

  @IsOptional()
  @IsIn(['OWNER_ONLY', 'OWNER_AND_EDITORS'])
  organizerTeamInviteScope?: 'OWNER_ONLY' | 'OWNER_AND_EDITORS';

  @IsOptional()
  @IsIn(['EDIT', 'SCAN'])
  organizerTeamDefaultPermission?: 'EDIT' | 'SCAN';

  @IsOptional()
  @IsBoolean()
  organizerTeamRequireRemovalConfirm?: boolean;

  @IsOptional()
  @IsBoolean()
  profilePublic?: boolean;

  @IsOptional()
  @IsIn(['public', 'friends', 'private'])
  defaultPostVisibility?: 'public' | 'friends' | 'private';

  @IsOptional()
  @IsIn(['everyone', 'connections', 'nobody'])
  allowOutingInvitesFrom?: 'everyone' | 'connections' | 'nobody';

  @IsOptional()
  @IsIn(['light', 'dark', 'system'])
  theme?: 'light' | 'dark' | 'system';

  @IsOptional()
  @IsIn(['fr', 'en'])
  language?: 'fr' | 'en';

  @IsOptional()
  @IsBoolean()
  dataSaver?: boolean;
}
