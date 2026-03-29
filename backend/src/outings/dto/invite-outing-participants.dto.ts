import { ArrayMinSize, ArrayUnique, IsArray, IsUUID } from 'class-validator';

export class InviteOutingParticipantsDto {
  @IsArray()
  @ArrayUnique()
  @ArrayMinSize(1)
  @IsUUID('4', { each: true })
  participantIds: string[];
}
