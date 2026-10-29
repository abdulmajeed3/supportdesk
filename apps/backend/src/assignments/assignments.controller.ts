import { Controller, Post, Get, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AssignmentsService } from './assignments.service';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

@ApiTags('assignments')
@ApiBearerAuth('access-token')
@Controller({ path: 'tickets/:ticketId/assignments', version: '1' })
export class AssignmentsController {
  constructor(private readonly assignmentsService: AssignmentsService) {}

  @Post()
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Assign a ticket to an agent' })
  assign(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: AssignTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assignmentsService.assign(ticketId, dto, user);
  }

  @Get()
  @Roles(UserRole.AGENT, UserRole.ADMIN)
  @ApiOperation({ summary: 'Get assignment history for a ticket' })
  getHistory(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.assignmentsService.getHistory(ticketId, user);
  }
}
