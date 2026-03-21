import { IsBoolean, IsIn, IsOptional } from 'class-validator';

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
