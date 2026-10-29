import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole, TicketStatus, TicketPriority } from '@prisma/client';

interface ActingUser {
  id: string;
  role: UserRole;
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getCustomerDashboard(userId: string) {
    const [total, open, waitingForCustomer, resolved, recent] = await Promise.all([
      this.prisma.ticket.count({ where: { customerId: userId } }),
      this.prisma.ticket.count({ where: { customerId: userId, status: TicketStatus.OPEN } }),
      this.prisma.ticket.count({ where: { customerId: userId, status: TicketStatus.WAITING_FOR_CUSTOMER } }),
      this.prisma.ticket.count({ where: { customerId: userId, status: TicketStatus.RESOLVED } }),
      this.prisma.ticket.findMany({
        where: { customerId: userId },
        orderBy: { updatedAt: 'desc' },
        take: 5,
        select: {
          id: true,
          ticketNumber: true,
          subject: true,
          status: true,
          priority: true,
          updatedAt: true,
          category: { select: { name: true } },
        },
      }),
    ]);

    return { total, open, waitingForCustomer, resolved, recent };
  }

  async getAgentDashboard(userId: string) {
    const assignedToMe = await this.prisma.ticket.findMany({
      where: {
        assignments: { some: { agentId: userId } },
      },
      select: { id: true, status: true },
    });

    const assignedIds = assignedToMe.map((t) => t.id);
    const assignedTotal = assignedIds.length;
    const assignedOpen = assignedToMe.filter(
      (t) => t.status === TicketStatus.OPEN || t.status === TicketStatus.IN_PROGRESS,
    ).length;
    const waitingForCustomer = assignedToMe.filter(
      (t) => t.status === TicketStatus.WAITING_FOR_CUSTOMER,
    ).length;

    const recent = await this.prisma.ticket.findMany({
      where: { id: { in: assignedIds } },
      orderBy: { updatedAt: 'desc' },
      take: 10,
      include: {
        customer: { select: { firstName: true, lastName: true, email: true } },
        category: { select: { name: true } },
      },
    });

    return { assignedTotal, assignedOpen, waitingForCustomer, recent };
  }

  async getAdminDashboard() {
    const [
      totalTickets,
      byStatus,
      byPriority,
      totalCustomers,
      totalAgents,
      recentActivity,
      categoryWorkload,
    ] = await Promise.all([
      this.prisma.ticket.count(),
      this.prisma.ticket.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.ticket.groupBy({ by: ['priority'], _count: { _all: true } }),
      this.prisma.user.count({ where: { role: UserRole.CUSTOMER } }),
      this.prisma.user.count({ where: { role: UserRole.AGENT } }),
      this.prisma.ticket.findMany({
        orderBy: { updatedAt: 'desc' },
        take: 10,
        include: {
          customer: { select: { firstName: true, lastName: true } },
          category: { select: { name: true } },
          assignments: {
            take: 1,
            orderBy: { createdAt: 'desc' },
            include: { agent: { select: { firstName: true, lastName: true } } },
          },
        },
      }),
      this.prisma.ticketCategory.findMany({
        where: { isActive: true },
        include: {
          _count: { select: { tickets: true } },
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    const statusMap = Object.fromEntries(
      byStatus.map((s) => [s.status, s._count._all]),
    );
    const priorityMap = Object.fromEntries(
      byPriority.map((p) => [p.priority, p._count._all]),
    );

    return {
      totalTickets,
      byStatus: statusMap,
      byPriority: priorityMap,
      totalCustomers,
      totalAgents,
      recentActivity,
      categoryWorkload: categoryWorkload.map((c) => ({
        id: c.id,
        name: c.name,
        ticketCount: c._count.tickets,
      })),
    };
  }
}
