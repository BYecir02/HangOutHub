import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class CreatePlaceTeamMemberDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsIn(['STAFF', 'MANAGER', 'SCANNER'])
  role?: 'STAFF' | 'MANAGER' | 'SCANNER';
}
