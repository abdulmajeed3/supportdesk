import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiOkResponse,
  ApiCreatedResponse,
} from '@nestjs/swagger';
import { TicketsService } from './tickets.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UserRole } from '@prisma/client';

interface AuthenticatedUser {
  id: string;
  role: UserRole;
}

@ApiTags('tickets')
@ApiBearerAuth('access-token')
@Controller({ path: 'tickets', version: '1' })
export class TicketsController {
  constructor(private readonly ticketsService: TicketsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new support ticket' })
  @ApiCreatedResponse({ description: 'Ticket created' })
  create(@Body() dto: CreateTicketDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ticketsService.create(dto, user);
  }

  @Get()
  @ApiOperation({ summary: 'List tickets (filtered by role and query params)' })
  @ApiOkResponse({ description: 'Paginated ticket list' })
  findAll(@Query() query: QueryTicketsDto, @CurrentUser() user: AuthenticatedUser) {
    return this.ticketsService.findAll(query, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get ticket details with conversation history' })
  findOne(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.ticketsService.findOne(id, user);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update ticket status, priority, or category' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTicketDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.ticketsService.update(id, dto, user);
  }
}
