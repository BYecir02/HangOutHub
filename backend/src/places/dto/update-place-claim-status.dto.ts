import { IsIn } from 'class-validator';

export class UpdatePlaceClaimStatusDto {
  @IsIn(['APPROVED', 'REJECTED'])
  status: 'APPROVED' | 'REJECTED';
}
