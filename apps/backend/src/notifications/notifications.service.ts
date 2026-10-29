import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationType } from '@prisma/client';

interface TicketRef {
  id: string;
  ticketNumber: string;
  subject: string;
  customerId: string;
}

interface MessageRef {
  id: string;
  authorId: string;
}

interface AgentRef {
  id: string;
  firstName: string;
  lastName: string;
}

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async notifyAssignment(ticket: TicketRef, agent: AgentRef, actorId: string) {
    await this.prisma.notification.create({
      data: {
        recipientId: agent.id,
        actorId,
        ticketId: ticket.id,
        type: NotificationType.TICKET_ASSIGNED,
        title: `Ticket assigned to you`,
        body: `Ticket ${ticket.ticketNumber}: "${ticket.subject}" has been assigned to you.`,
      },
    });
  }

  async notifyStatusChange(ticket: TicketRef, actorId: string) {
    // Notify the customer about status changes
    if (ticket.customerId !== actorId) {
      await this.prisma.notification.create({
        data: {
          recipientId: ticket.customerId,
          actorId,
          ticketId: ticket.id,
          type: NotificationType.TICKET_STATUS_CHANGED,
          title: `Ticket ${ticket.ticketNumber} status updated`,
          body: `Your ticket "${ticket.subject}" has been updated.`,
        },
      });
    }
  }

  async notifyReply(ticket: TicketRef, message: MessageRef, actorId: string) {
    const isAgentReply = actorId !== ticket.customerId;

    if (isAgentReply) {
      // Notify customer of agent reply
      await this.prisma.notification.create({
        data: {
          recipientId: ticket.customerId,
          actorId,
          ticketId: ticket.id,
          type: NotificationType.TICKET_REPLY,
          title: `New reply on ticket ${ticket.ticketNumber}`,
          body: `A support agent has replied to your ticket "${ticket.subject}".`,
        },
      });
    } else {
      // Notify assigned agent of customer reply
      const latestAssignment = await this.prisma.ticketAssignment.findFirst({
        where: { ticketId: ticket.id },
        orderBy: { createdAt: 'desc' },
      });
      if (latestAssignment) {
        await this.prisma.notification.create({
          data: {
            recipientId: latestAssignment.agentId,
            actorId,
            ticketId: ticket.id,
            type: NotificationType.TICKET_REPLY,
            title: `Customer replied on ticket ${ticket.ticketNumber}`,
            body: `A customer has replied to ticket "${ticket.subject}".`,
          },
        });
      }
    }
  }

  async findAll(userId: string) {
    return this.prisma.notification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        ticket: { select: { id: true, ticketNumber: true, subject: true } },
        actor: { select: { id: true, firstName: true, lastName: true } },
      },
    });
  }

  async markRead(notificationId: string, userId: string) {
    const notif = await this.prisma.notification.findFirst({
      where: { id: notificationId, recipientId: userId },
    });
    if (!notif) return null;

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: { recipientId: userId, isRead: false },
      data: { isRead: true },
    });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return this.prisma.notification.count({
      where: { recipientId: userId, isRead: false },
    });
  }
}
