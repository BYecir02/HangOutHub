import { IsIn, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreateReportDto {
  @IsUUID()
  targetId: string;

  @IsString()
  @IsIn(['POST', 'COMMENT', 'EVENT', 'PLACE', 'REVIEW', 'USER'])
  targetType: string;

  @IsString()
  @MaxLength(255)
  reason: string;
}
