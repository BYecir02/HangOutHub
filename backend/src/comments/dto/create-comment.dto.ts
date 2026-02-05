// c:\Users\Lenovo\Desktop\Git\HangOutHub\HangOutHub\backend\src\posts\dto\create-comment.dto.ts
import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CreateCommentDto {
  @IsString()
  @IsNotEmpty()
  content: string;

  @IsOptional()
  @IsString()
  parentId?: string;
}
