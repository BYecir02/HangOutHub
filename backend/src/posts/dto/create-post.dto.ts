import { IsOptional, IsString, IsIn, IsUUID } from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsIn(['public', 'friends', 'private', 'custom'])
  visibility?: string;

  @IsOptional()
  @IsIn(['post', 'plan'])
  postType?: string;

  @IsOptional()
  @IsIn(['personal', 'structure'])
  publicationScope?: string;

  @IsOptional()
  @IsUUID()
  placeId?: string;

  @IsOptional()
  @IsUUID()
  eventId?: string;

  @IsOptional()
  @IsString()
  placeName?: string;

  @IsOptional()
  @IsString()
  cityName?: string;

  @IsOptional()
  @IsString()
  ambiance?: string;

  @IsOptional()
  @IsString()
  visibilityUserIds?: string;
}
