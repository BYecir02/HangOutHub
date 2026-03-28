import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateDirectMessageDto {
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  clientId?: string;

  @IsOptional()
  @IsUUID()
  replyToMessageId?: string;

  @IsOptional()
  @IsUUID()
  sharedPostId?: string;
}
