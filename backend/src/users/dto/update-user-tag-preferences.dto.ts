import { ArrayUnique, IsArray, IsInt, Min } from 'class-validator';

export class UpdateUserTagPreferencesDto {
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  tagIds: number[];
}
