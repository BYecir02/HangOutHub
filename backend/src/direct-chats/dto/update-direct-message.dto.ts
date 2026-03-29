import { IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class UpdateDirectMessageDto {
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  content?: string;

  @IsOptional()
  @IsUUID()
  replyToMessageId?: string;

  @IsOptional()
  @IsUUID()
  sharedPostId?: string;
}
