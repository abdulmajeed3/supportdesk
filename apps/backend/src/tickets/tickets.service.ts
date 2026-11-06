import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { QueryTicketsDto } from './dto/query-tickets.dto';
import { assertValidTransition } from './ticket-lifecycle';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole, TicketStatus, Prisma } from '@prisma/client';
import { paginate } from '../common/dto/pagination.dto';

interface ActingUser {
  id: string;
  role: UserRole;
}

const TICKET_INCLUDE = {
  customer: { select: { id: true, firstName: true, lastName: true, email: true } },
  category: { select: { id: true, name: true } },
  assignments: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    include: {
      agent: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  },
} as const;

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(dto: CreateTicketDto, user: ActingUser) {
    // Validate category if provided
    if (dto.categoryId) {
      const cat = await this.prisma.ticketCategory.findUnique({ where: { id: dto.categoryId } });
      if (!cat || !cat.isActive) {
        throw new BadRequestException('Category not found or inactive');
      }
    }

    const ticketNumber = await this.getNextTicketNumber();

    const ticket = await this.prisma.ticket.create({
      data: {
        ticketNumber,
        subject: dto.subject,
        description: dto.description,
        priority: dto.priority,
        categoryId: dto.categoryId,
        customerId: user.id,
      },
      include: TICKET_INCLUDE,
    });

    return ticket;
  }

  async findAll(query: QueryTicketsDto, user: ActingUser) {
    const { page = 1, limit = 20, status, priority, categoryId, agentId, search, sortBy = 'createdAt', sortOrder = 'desc' } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.TicketWhereInput = {};

    // Customers only see their own tickets
    if (user.role === UserRole.CUSTOMER) {
      where.customerId = user.id;
    }

    if (status) where.status = status;
    if (priority) where.priority = priority;
    if (categoryId) where.categoryId = categoryId;

    if (agentId) {
      where.assignments = { some: { agentId } };
    }

    if (search) {
      where.OR = [
        { ticketNumber: { contains: search, mode: 'insensitive' } },
        { subject: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const validSortFields = ['createdAt', 'updatedAt', 'priority', 'status'];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
    const orderBy: Prisma.TicketOrderByWithRelationInput = { [orderByField]: sortOrder };

    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        include: TICKET_INCLUDE,
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return paginate(tickets, total, page, limit);
  }

  async findOne(id: string, user: ActingUser) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: {
        ...TICKET_INCLUDE,
        messages: {
          where: user.role === UserRole.CUSTOMER ? { isInternal: false } : {},
          include: { author: { select: { id: true, firstName: true, lastName: true, role: true } } },
          orderBy: { createdAt: 'asc' },
        },
        assignments: {
          include: {
            agent: { select: { id: true, firstName: true, lastName: true, email: true } },
            assignedBy: { select: { id: true, firstName: true, lastName: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    this.assertAccess(ticket, user);

    return ticket;
  }

  async update(id: string, dto: UpdateTicketDto, user: ActingUser) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) throw new NotFoundException(`Ticket ${id} not found`);
    this.assertAccess(ticket, user);

    const isAgent = user.role === UserRole.AGENT || user.role === UserRole.ADMIN;

    if (dto.status && dto.status !== ticket.status) {
      assertValidTransition(ticket.status, dto.status, isAgent);
    }

    // Customers cannot change priority
    if (dto.priority && !isAgent) {
      throw new ForbiddenException('Customers cannot change ticket priority');
    }

    if (dto.categoryId) {
      const cat = await this.prisma.ticketCategory.findUnique({ where: { id: dto.categoryId } });
      if (!cat) throw new BadRequestException('Category not found');
    }

    const resolvedAt =
      dto.status === TicketStatus.RESOLVED && ticket.status !== TicketStatus.RESOLVED
        ? new Date()
        : ticket.resolvedAt;

    const closedAt =
      dto.status === TicketStatus.CLOSED && ticket.status !== TicketStatus.CLOSED
        ? new Date()
        : ticket.closedAt;

    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { ...dto, resolvedAt, closedAt },
      include: TICKET_INCLUDE,
    });

    if (dto.status && dto.status !== ticket.status) {
      await this.notifications.notifyStatusChange(updated, user.id);
    }

    return updated;
  }

  private assertAccess(ticket: { customerId: string }, user: ActingUser) {
    if (user.role === UserRole.CUSTOMER && ticket.customerId !== user.id) {
      throw new ForbiddenException('You do not have access to this ticket');
    }
  }

  private async getNextTicketNumber(): Promise<string> {
    // Atomic increment via raw SQL to be safe under concurrent inserts
    await this.prisma.$executeRaw`
      UPDATE ticket_sequence SET last_value = last_value + 1 WHERE id = 1
    `;
    const seq = await this.prisma.ticketSequence.findUnique({ where: { id: 1 } });
    return `TKT-${String(seq!.lastValue).padStart(5, '0')}`;
  }
}
