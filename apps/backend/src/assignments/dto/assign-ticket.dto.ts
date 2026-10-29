import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class AssignTicketDto {
  @ApiProperty({ description: 'Agent UUID to assign the ticket to' })
  @IsUUID()
  agentId: string;
}
