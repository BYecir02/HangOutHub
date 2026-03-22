import { IsIn, IsOptional, IsUUID } from 'class-validator';

export class CreateEventCollaboratorDto {
  @IsUUID()
  userId: string;

  @IsOptional()
  @IsIn(['EDIT', 'SCAN'])
  permission?: 'EDIT' | 'SCAN';
}
