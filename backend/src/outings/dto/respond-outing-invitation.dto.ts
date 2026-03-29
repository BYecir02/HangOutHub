import { IsIn, IsString } from 'class-validator';

export class RespondOutingInvitationDto {
  @IsString()
  @IsIn(['GOING', 'MAYBE', 'DECLINED'])
  status: 'GOING' | 'MAYBE' | 'DECLINED';
}
