import { IsString, MaxLength } from 'class-validator';

export class CreateDirectReactionDto {
  @IsString()
  @MaxLength(16)
  emoji!: string;
}
