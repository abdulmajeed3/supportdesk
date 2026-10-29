import { Controller, Get, Post, Body, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiCreatedResponse } from '@nestjs/swagger';
import { TicketMessagesService } from './ticket-messages.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

@ApiTags('ticket-messages')
@ApiBearerAuth('access-token')
@Controller({ path: 'tickets/:ticketId/messages', version: '1' })
export class TicketMessagesController {
  constructor(private readonly messagesService: TicketMessagesService) {}

  @Post()
  @ApiOperation({ summary: 'Add a reply to a ticket' })
  @ApiCreatedResponse({ description: 'Message created' })
  create(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @Body() dto: CreateMessageDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messagesService.create(ticketId, dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'Get all messages for a ticket' })
  findAll(
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.messagesService.findAll(ticketId, user);
  }
}
