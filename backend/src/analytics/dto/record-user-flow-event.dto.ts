import { Allow, IsOptional, IsString, MaxLength } from 'class-validator';

export class RecordUserFlowEventDto {
  @IsString()
  @MaxLength(64)
  eventName!: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  screenKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  screenName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  path?: string;

  @IsOptional()
  @IsString()
  @MaxLength(180)
  previousScreenKey?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  previousPath?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  actionName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  entityType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  entityId?: string;

  @IsString()
  @MaxLength(80)
  distinctId!: string;

  @IsString()
  @MaxLength(80)
  sessionId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  appVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  buildChannel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  locale?: string;

  @IsOptional()
  @Allow()
  metadata?: Record<string, unknown> | null;
}
