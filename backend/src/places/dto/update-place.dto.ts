import { PartialType } from '@nestjs/mapped-types';
import { IsOptional, IsString } from 'class-validator';
import { CreatePlaceDto } from './create-place.dto';

export class UpdatePlaceDto extends PartialType(CreatePlaceDto) {
  @IsOptional()
  @IsString()
  tagIds?: string;

  @IsOptional()
  @IsString()
  existingImages?: string;
}
