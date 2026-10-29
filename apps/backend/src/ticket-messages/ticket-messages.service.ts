import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto/create-message.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole, TicketStatus } from '@prisma/client';

interface ActingUser {
  id: string;
  role: UserRole;
}

@Injectable()
export class TicketMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async create(ticketId: string, dto: CreateMessageDto, user: ActingUser) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException(`Ticket ${ticketId} not found`);

    // Authorization: customers can only reply to their own tickets
    if (user.role === UserRole.CUSTOMER) {
      if (ticket.customerId !== user.id) {
        throw new ForbiddenException('You do not have access to this ticket');
      }

      // Customers cannot reply to closed tickets
      if (ticket.status === TicketStatus.CLOSED) {
        throw new ForbiddenException('This ticket is closed and cannot receive new replies');
      }

      // Customers cannot post internal notes
      if (dto.isInternal) {
        throw new ForbiddenException('Customers cannot post internal notes');
      }
    }

    const isAgent = user.role === UserRole.AGENT || user.role === UserRole.ADMIN;

    const message = await this.prisma.ticketMessage.create({
      data: {
        ticketId,
        authorId: user.id,
        body: dto.body,
        isInternal: isAgent ? (dto.isInternal ?? false) : false,
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
    });

    // If agent replies, transition ticket to IN_PROGRESS if still OPEN
    if (isAgent && ticket.status === TicketStatus.OPEN && !dto.isInternal) {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.IN_PROGRESS },
      });
    }

    // If customer replies to WAITING_FOR_CUSTOMER, transition to IN_PROGRESS
    if (user.role === UserRole.CUSTOMER && ticket.status === TicketStatus.WAITING_FOR_CUSTOMER) {
      await this.prisma.ticket.update({
        where: { id: ticketId },
        data: { status: TicketStatus.IN_PROGRESS },
      });
    }

    // Send notification
    if (!dto.isInternal) {
      await this.notifications.notifyReply(ticket, message, user.id);
    }

    return message;
  }

  async findAll(ticketId: string, user: ActingUser) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException(`Ticket ${ticketId} not found`);

    if (user.role === UserRole.CUSTOMER && ticket.customerId !== user.id) {
      throw new ForbiddenException('You do not have access to this ticket');
    }

    return this.prisma.ticketMessage.findMany({
      where: {
        ticketId,
        // Customers only see public messages
        ...(user.role === UserRole.CUSTOMER ? { isInternal: false } : {}),
      },
      include: {
        author: { select: { id: true, firstName: true, lastName: true, role: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }
}
