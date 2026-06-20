import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class TransferOwnershipDto {
  @ApiProperty({
    description: 'ID участника группы, которому передаётся роль owner',
  })
  @IsUUID()
  newOwnerId: string;
}
