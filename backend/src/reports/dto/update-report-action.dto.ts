import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateReportActionDto {
  @IsString()
  @IsIn([
    'DELETE_CONTENT',
    'REQUEST_CHANGES',
    'WARN_USER',
    'SUSPEND_USER',
    'NO_ACTION',
  ])
  action: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  note?: string;
}
