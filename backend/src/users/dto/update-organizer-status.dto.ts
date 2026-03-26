import { IsIn, IsString } from 'class-validator';

export class UpdateOrganizerStatusDto {
  @IsString()
  @IsIn(['PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED'])
  status: string;
}
