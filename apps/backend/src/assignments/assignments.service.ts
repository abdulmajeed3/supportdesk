import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { UserRole, UserStatus } from '@prisma/client';

interface ActingUser {
  id: string;
  role: UserRole;
}

@Injectable()
export class AssignmentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  async assign(ticketId: string, dto: AssignTicketDto, actor: ActingUser) {
    // Only agents and admins may assign tickets
    if (actor.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot assign tickets');
    }

    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException(`Ticket ${ticketId} not found`);

    const agent = await this.prisma.user.findUnique({ where: { id: dto.agentId } });
    if (!agent || agent.role !== UserRole.AGENT || agent.status !== UserStatus.ACTIVE) {
      throw new BadRequestException('Target user must be an active agent');
    }

    // Agents can only assign to themselves unless they are admins
    if (actor.role === UserRole.AGENT && dto.agentId !== actor.id) {
      throw new ForbiddenException('Agents may only assign tickets to themselves');
    }

    const assignment = await this.prisma.ticketAssignment.create({
      data: {
        ticketId,
        agentId: dto.agentId,
        assignedById: actor.id,
      },
      include: {
        agent: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
      },
    });

    // Notify the assigned agent
    await this.notifications.notifyAssignment(ticket, agent, actor.id);

    return assignment;
  }

  async getHistory(ticketId: string, actor: ActingUser) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw new NotFoundException(`Ticket ${ticketId} not found`);

    if (actor.role === UserRole.CUSTOMER) {
      throw new ForbiddenException('Customers cannot view assignment history');
    }

    return this.prisma.ticketAssignment.findMany({
      where: { ticketId },
      include: {
        agent: { select: { id: true, firstName: true, lastName: true, email: true } },
        assignedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
