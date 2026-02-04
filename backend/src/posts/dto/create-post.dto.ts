import { IsOptional, IsString, IsIn } from 'class-validator';

export class CreatePostDto {
  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsIn(['public', 'friends', 'private'])
  visibility?: string;
}
