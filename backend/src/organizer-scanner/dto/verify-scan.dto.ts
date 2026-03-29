import { IsIn, IsOptional, IsString, IsUUID } from 'class-validator';

export class VerifyScanDto {
  @IsString()
  code: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsIn(['ios', 'android', 'web'])
  source?: 'ios' | 'android' | 'web';
}
