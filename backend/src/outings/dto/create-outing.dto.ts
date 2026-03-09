import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateOutingDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  scheduledDate: string;

  @IsOptional()
  @IsUUID()
  placeId?: string;
}
