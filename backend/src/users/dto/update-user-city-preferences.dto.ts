import { ArrayUnique, IsArray, IsInt, Min } from 'class-validator';

export class UpdateUserCityPreferencesDto {
  @IsArray()
  @ArrayUnique()
  @IsInt({ each: true })
  @Min(1, { each: true })
  cityIds: number[];
}