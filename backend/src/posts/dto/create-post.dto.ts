import { IsOptional, IsString, IsIn } from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsIn(['public', 'friends', 'private'])
  visibility?: string;

  @IsOptional()
  @IsIn(['post', 'plan'])
  postType?: string;

  @IsOptional()
  @IsString()
  placeName?: string;

  @IsOptional()
  @IsString()
  cityName?: string;

  @IsOptional()
  @IsString()
  ambiance?: string;
}
