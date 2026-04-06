import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CreateOutingMessageDto {
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  content?: string;
}
